import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

// GET all alerts
router.get("/", async (_req, res) => {
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
            WHERE la.status IN ('open', 'acknowledged')
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

// Acknowledge an alert
router.patch("/:id/acknowledge", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            UPDATE leak_alerts
            SET status = 'acknowledged',
                acknowledged_at = NOW()
            WHERE id = $1
              AND status = 'open'
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "ERROR",
                message: "Open alert not found"
            });
        }

        res.json({
            status: "OK",
            message: "Alert acknowledged successfully",
            alert: result.rows[0]
        });
    } catch (error) {
        console.error("Error acknowledging alert:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to acknowledge alert"
        });
    }
});

// Resolve an alert
router.patch("/:id/resolve", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            UPDATE leak_alerts
            SET status = 'resolved',
                resolved_at = NOW()
            WHERE id = $1
              AND status IN ('open', 'acknowledged')
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "ERROR",
                message: "Alert not found or already resolved"
            });
        }

        res.json({
            status: "OK",
            message: "Alert resolved successfully",
            alert: result.rows[0]
        });
    } catch (error) {
        console.error("Error resolving alert:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to resolve alert"
        });
    }
});

export default router;