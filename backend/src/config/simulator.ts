import { pool } from "./database";
import { redisClient } from "./redis";

let simulatorInterval: ReturnType<typeof setInterval> | null = null;

// Per-sensor state for realistic random walk
const sensorStates: Record<number, number> = {};
// Cooldown: track last alert time per sensor+type to prevent spam
const alertCooldowns: Record<string, number> = {};
const ALERT_COOLDOWN_MS = 30000; // 30 seconds between same-sensor alerts

/**
 * Realistic continuous random walk within safe range, with occasional anomaly spikes.
 */
function generateReading(min: number, max: number, sensorId: number): { value: number; quality: string } {
    const range = max - min;
    const midpoint = min + range / 2;

    if (sensorStates[sensorId] === undefined) {
        sensorStates[sensorId] = midpoint + (Math.random() - 0.5) * range * 0.3;
    }

    const roll = Math.random();
    let value: number;
    let quality: string;

    if (roll > 0.99) {
        // 1% chance: spike above max
        value = max + range * (0.05 + Math.random() * 0.1);
        quality = "warning";
        sensorStates[sensorId] = max + range * 0.03; // partial rebound
    } else if (roll > 0.98) {
        // 1% chance: dip below min
        value = min - range * (0.03 + Math.random() * 0.07);
        quality = "warning";
        sensorStates[sensorId] = min - range * 0.02;
    } else {
        // Normal: gentle random walk pulling toward center
        const current = sensorStates[sensorId];
        const pullToCenter = (midpoint - current) * 0.12;
        const jitter = (Math.random() - 0.5) * range * 0.04;
        value = current + pullToCenter + jitter;

        // Clamp inside safe band
        value = Math.max(min + range * 0.05, Math.min(max - range * 0.05, value));
        sensorStates[sensorId] = value;
        quality = "good";
    }

    return { value: Math.round(value * 100) / 100, quality };
}

export async function startSensorSimulator() {
    if (simulatorInterval) return;

    console.log("⚡ Sensor simulator active — realistic 1-second streaming…");

    simulatorInterval = setInterval(async () => {
        try {
            const sensorsResult = await pool.query(`
                SELECT id, sensor_code, min_safe_value, max_safe_value, segment_id
                FROM sensors
                WHERE status = 'active'
            `);

            if (sensorsResult.rows.length === 0) return;

            const now = Date.now();

            for (const sensor of sensorsResult.rows) {
                const min = Number(sensor.min_safe_value);
                const max = Number(sensor.max_safe_value);
                const { value, quality } = generateReading(min, max, sensor.id);

                // Insert reading
                const insertResult = await pool.query(
                    `INSERT INTO sensor_readings (sensor_id, value, recorded_at, quality)
                     VALUES ($1, $2, NOW(), $3) RETURNING *`,
                    [sensor.id, value, quality]
                );

                const reading = insertResult.rows[0];

                // Cache latest reading in Redis
                await redisClient.set(
                    `sensor:${sensor.id}:latest`,
                    JSON.stringify({
                        sensor_id: sensor.id,
                        sensor_code: sensor.sensor_code,
                        value: reading?.value ?? value,
                        recorded_at: reading?.recorded_at ?? new Date().toISOString(),
                        quality: reading?.quality ?? quality,
                    })
                );

                // Check if reading is outside limits AND cooldown has expired
                if (value > max || value < min) {
                    const alertType = value > max ? "pressure_high" : "pressure_low";
                    const cooldownKey = `${sensor.id}:${alertType}`;

                    // Enforce 30-second cooldown per sensor+alertType to prevent alert spam
                    if (!alertCooldowns[cooldownKey] || now - alertCooldowns[cooldownKey] > ALERT_COOLDOWN_MS) {

                        // Lookup the correct pipeline_id via segment
                        const pipelineRes = await pool.query(
                            `SELECT ps.pipeline_id FROM pipeline_segments ps
                             WHERE ps.id = $1`,
                            [sensor.segment_id]
                        );

                        const pipelineId = pipelineRes.rows.length > 0 ? pipelineRes.rows[0].pipeline_id : null;

                        if (pipelineId) {
                            const severity = Math.abs(value - (value > max ? max : min)) / (max - min) > 0.08
                                ? "critical"
                                : "warning";

                            await pool.query(
                                `INSERT INTO leak_alerts (sensor_id, pipeline_id, severity, alert_type, message, detected_value, detected_at, status)
                                 VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'open')`,
                                [
                                    sensor.id,
                                    pipelineId,
                                    severity,
                                    alertType,
                                    `Anomaly: ${sensor.sensor_code} at ${value} (safe range: ${min}–${max})`,
                                    value,
                                ]
                            );

                            alertCooldowns[cooldownKey] = now;
                        }
                    }
                } else {
                    // Clear cooldown when sensor returns to normal
                    const highKey = `${sensor.id}:pressure_high`;
                    const lowKey  = `${sensor.id}:pressure_low`;
                    if (alertCooldowns[highKey]) delete alertCooldowns[highKey];
                    if (alertCooldowns[lowKey])  delete alertCooldowns[lowKey];
                }
            }
        } catch (err) {
            console.error("Simulator error:", err);
        }
    }, 1000);
}

export function stopSensorSimulator() {
    if (simulatorInterval) {
        clearInterval(simulatorInterval);
        simulatorInterval = null;
        console.log("⏹ Sensor simulator stopped.");
    }
}
