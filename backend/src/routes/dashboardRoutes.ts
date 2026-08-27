import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

router.get("/summary", async (_req, res) => {
    try {
        const [
            pipelinesResult,
            sensorsResult,
            readingsResult,
            alertsResult
        ] = await Promise.all([
            pool.query(`
                SELECT COUNT(*) AS total
                FROM pipelines
            `),

            pool.query(`
                SELECT COUNT(*) AS total
                FROM sensors
            `),

            pool.query(`
                SELECT COUNT(*) AS total
                FROM sensor_readings
                WHERE recorded_at >= NOW() - INTERVAL '24 hours'
            `),

            pool.query(`
                SELECT COUNT(*) AS total
                FROM leak_alerts
                WHERE status = 'open'
            `)
        ]);

        res.json({
            status: "OK",
            summary: {
                total_pipelines: Number(pipelinesResult.rows[0].total),
                total_sensors: Number(sensorsResult.rows[0].total),
                readings_last_24_hours: Number(readingsResult.rows[0].total),
                open_alerts: Number(alertsResult.rows[0].total)
            }
        });
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch dashboard summary"
        });
    }
});

export default router;