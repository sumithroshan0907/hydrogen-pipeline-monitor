import { Router } from "express";
import { pool } from "../config/database";
import { redisClient } from "../config/redis";

const router = Router();

// GET all sensor readings
router.get("/", async (_req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        sr.id,
        sr.sensor_id,
        s.sensor_code,
        s.sensor_type,
        sr.value,
        sr.recorded_at,
        sr.quality
      FROM sensor_readings sr
      JOIN sensors s
        ON sr.sensor_id = s.id
      ORDER BY sr.recorded_at DESC
    `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching sensor readings:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch sensor readings"
        });
    }
});

// GET one sensor's readings
router.get("/sensor/:sensorId", async (req, res) => {
    try {
        const { sensorId } = req.params;

        const result = await pool.query(
            `
      SELECT
        sr.id,
        sr.sensor_id,
        s.sensor_code,
        s.sensor_type,
        sr.value,
        sr.recorded_at,
        sr.quality
      FROM sensor_readings sr
      JOIN sensors s
        ON sr.sensor_id = s.id
      WHERE sr.sensor_id = $1
      ORDER BY sr.recorded_at DESC
      `,
            [sensorId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching sensor readings:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch sensor readings"
        });
    }
});
// GET all open alerts
router.get("/alerts", async (_req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        la.*,
        s.sensor_code,
        p.name AS pipeline_name
      FROM leak_alerts la
      LEFT JOIN sensors s
        ON la.sensor_id = s.id
      LEFT JOIN pipelines p
        ON la.pipeline_id = p.id
      WHERE la.status = 'open'
      ORDER BY la.detected_at DESC
    `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching alerts:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch alerts"
        });
    }
});

// POST a sensor reading
router.post("/", async (req, res) => {
    try {
        const {
            sensor_id,
            value,
            recorded_at,
            quality
        } = req.body;

        if (sensor_id === undefined || value === undefined) {
            return res.status(400).json({
                status: "ERROR",
                message: "sensor_id and value are required"
            });
        }

        // Get sensor limits and pipeline information
        const sensorResult = await pool.query(
            `
      SELECT
        s.id,
        s.sensor_code,
        s.sensor_type,
        s.min_safe_value,
        s.max_safe_value,
        ps.pipeline_id,
        p.name AS pipeline_name
      FROM sensors s
      JOIN pipeline_segments ps
        ON s.segment_id = ps.id
      JOIN pipelines p
        ON ps.pipeline_id = p.id
      WHERE s.id = $1
      `,
            [sensor_id]
        );

        if (sensorResult.rows.length === 0) {
            return res.status(404).json({
                status: "ERROR",
                message: "Sensor not found"
            });
        }

        const sensor = sensorResult.rows[0];

        // Store reading in PostgreSQL
        const result = await pool.query(
            `
      INSERT INTO sensor_readings (
        sensor_id,
        value,
        recorded_at,
        quality
      )
      VALUES ($1, $2, COALESCE($3, NOW()), COALESCE($4, 'good'))
      RETURNING *
      `,
            [
                sensor_id,
                value,
                recorded_at ?? null,
                quality ?? null
            ]
        );

        const reading = result.rows[0];

        // Store latest reading in Redis
        await redisClient.set(
            `sensor:${sensor_id}:latest`,
            JSON.stringify({
                sensor_id,
                sensor_code: sensor.sensor_code,
                value: reading.value,
                recorded_at: reading.recorded_at,
                quality: reading.quality
            })
        );

        // Convert values to numbers for comparison
        const numericValue = Number(value);
        const minSafe = Number(sensor.min_safe_value);
        const maxSafe = Number(sensor.max_safe_value);





        let alert = null;

        // Check pressure limits



        let alertSeverity: string | null = null;
        let alertType: string | null = null;
        let alertMessage: string | null = null;

        if (numericValue > maxSafe) {
            alertSeverity = "critical";
            alertType = "pressure_high";
            alertMessage =
                `Pressure on ${sensor.sensor_code} is above the configured safe maximum of ${maxSafe} bar.`;
        } else if (numericValue < minSafe) {
            alertSeverity = "warning";
            alertType = "pressure_low";
            alertMessage =
                `Pressure on ${sensor.sensor_code} is below the configured safe minimum of ${minSafe} bar.`;
        }

        // Only create an alert when the reading is outside the safe range
        if (alertSeverity && alertType && alertMessage) {

            // Check whether an open alert already exists
            const existingAlert = await pool.query(
                `
        SELECT *
        FROM leak_alerts
        WHERE sensor_id = $1
          AND alert_type = $2
          AND status IN ('open', 'acknowledged')
        ORDER BY detected_at DESC
        LIMIT 1
        `,
                [sensor_id, alertType]
            );

            if (existingAlert.rows.length > 0) {

                // Existing alert found — don't create duplicate
                alert = existingAlert.rows[0];

            } else {

                // No open alert exists — create a new one
                const alertResult = await pool.query(
                    `
            INSERT INTO leak_alerts (
                sensor_id,
                pipeline_id,
                severity,
                alert_type,
                message,
                detected_value,
                detected_at,
                status
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                NOW(),
                'open'
            )
            RETURNING *
            `,
                    [
                        sensor_id,
                        sensor.pipeline_id,
                        alertSeverity,
                        alertType,
                        alertMessage,
                        numericValue
                    ]
                );

                alert = alertResult.rows[0];
            }
        }

        // Store alert in Redis if one was created
        if (alert) {
            await redisClient.set(
                `alert:${alert.id}`,
                JSON.stringify(alert)
            );
        }

        res.status(201).json({
            status: "OK",
            reading,
            alert
        });
    } catch (error) {
        console.error("Error creating sensor reading:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to create sensor reading"
        });
    }
});

export default router;