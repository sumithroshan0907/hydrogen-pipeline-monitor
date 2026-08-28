import { pool } from "./database";
import { redisClient } from "./redis";

let simulatorInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Generates a realistic sensor reading value within the sensor's safe range,
 * with occasional spikes outside the range to simulate real-world anomalies.
 */
function generateReading(min: number, max: number, i: number): { value: number; quality: string } {
    const range = max - min;
    const base = min + range / 2;
    const roll = Math.random();

    let value: number;
    let quality: string;

    if (roll > 0.97) {
        // 3% chance: critical spike above max
        value = max + range * (0.1 + Math.random() * 0.15);
        quality = "warning";
    } else if (roll > 0.93) {
        // 4% chance: low dip below min
        value = min - range * (0.05 + Math.random() * 0.1);
        quality = "warning";
    } else {
        // Normal: within safe range with natural fluctuation
        const fluctuation = (Math.random() - 0.5) * range * 0.25;
        value = base + fluctuation;
        quality = "good";
    }

    return { value: Math.round(value * 100) / 100, quality };
}

export async function startSensorSimulator() {
    if (simulatorInterval) return; // Already running

    console.log("🔴 Sensor simulator starting — generating readings every 8s...");

    simulatorInterval = setInterval(async () => {
        try {
            // Fetch all active sensors with their safe limits
            const sensorsResult = await pool.query(`
                SELECT id, sensor_code, min_safe_value, max_safe_value, segment_id
                FROM sensors
                WHERE status = 'active'
            `);

            if (sensorsResult.rows.length === 0) return;

            const sensors = sensorsResult.rows;

            for (const sensor of sensors) {
                const min = Number(sensor.min_safe_value);
                const max = Number(sensor.max_safe_value);
                const { value, quality } = generateReading(min, max, sensor.id);

                // Insert into PostgreSQL
                const insertResult = await pool.query(
                    `INSERT INTO sensor_readings (sensor_id, value, recorded_at, quality)
                     VALUES ($1, $2, NOW(), $3) RETURNING *`,
                    [sensor.id, value, quality]
                );

                const reading = insertResult.rows[0];

                // Update Redis latest cache
                await redisClient.set(
                    `sensor:${sensor.id}:latest`,
                    JSON.stringify({
                        sensor_id: sensor.id,
                        sensor_code: sensor.sensor_code,
                        value: reading.value,
                        recorded_at: reading.recorded_at,
                        quality: reading.quality,
                    })
                );

                // Auto-generate alert if outside safe limits
                if (value > max || value < min) {
                    const severity = Math.abs(value - (value > max ? max : min)) / (max - min) > 0.1
                        ? "critical"
                        : "warning";
                    const alertType = value > max ? "pressure_high" : "pressure_low";

                    // Get pipeline_id for this sensor
                    const pipelineRes = await pool.query(
                        `SELECT ps.pipeline_id FROM pipeline_segments ps
                         JOIN sensors s ON s.segment_id = ps.id
                         WHERE s.id = $1`,
                        [sensor.id]
                    );

                    if (pipelineRes.rows.length > 0) {
                        await pool.query(
                            `INSERT INTO leak_alerts (sensor_id, pipeline_id, severity, alert_type, message, detected_value, detected_at, status)
                             VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'open')`,
                            [
                                sensor.id,
                                pipelineRes.rows[0].pipeline_id,
                                severity,
                                alertType,
                                `Auto-detected: ${sensor.sensor_code} reading ${value} is ${value > max ? "above max" : "below min"} safe limit (${min}–${max}).`,
                                value,
                            ]
                        );
                    }
                }
            }

            console.log(`✅ Simulator: inserted ${sensors.length} readings at ${new Date().toLocaleTimeString()}`);
        } catch (err) {
            console.error("Simulator error:", err);
        }
    }, 8000); // Every 8 seconds
}

export function stopSensorSimulator() {
    if (simulatorInterval) {
        clearInterval(simulatorInterval);
        simulatorInterval = null;
        console.log("⏹ Sensor simulator stopped.");
    }
}
