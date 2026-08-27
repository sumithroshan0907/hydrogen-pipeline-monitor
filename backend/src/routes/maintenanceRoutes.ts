import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

// GET all maintenance tasks
router.get("/", async (_req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        mt.*,
        p.name AS pipeline_name,
        p.code AS pipeline_code,
        ps.name AS segment_name,
        ps.segment_code
      FROM maintenance_tasks mt
      JOIN pipelines p ON mt.pipeline_id = p.id
      LEFT JOIN pipeline_segments ps ON mt.segment_id = ps.id
      ORDER BY mt.scheduled_date ASC
    `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching maintenance tasks:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch maintenance tasks",
        });
    }
});

// GET maintenance task by ID
router.get("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            `
      SELECT
        mt.*,
        p.name AS pipeline_name,
        p.code AS pipeline_code,
        ps.name AS segment_name,
        ps.segment_code
      FROM maintenance_tasks mt
      JOIN pipelines p ON mt.pipeline_id = p.id
      LEFT JOIN pipeline_segments ps ON mt.segment_id = ps.id
      WHERE mt.id = $1
      `,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "ERROR",
                message: "Maintenance task not found",
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching maintenance task:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch maintenance task",
        });
    }
});

// CREATE maintenance task
router.post("/", async (req, res) => {
    try {
        const {
            pipeline_id,
            segment_id,
            title,
            description,
            priority = "medium",
            scheduled_date,
            assigned_to,
        } = req.body;

        if (!pipeline_id || !title || !scheduled_date) {
            return res.status(400).json({
                status: "ERROR",
                message: "pipeline_id, title and scheduled_date are required",
            });
        }

        const result = await pool.query(
            `
      INSERT INTO maintenance_tasks (
        pipeline_id,
        segment_id,
        title,
        description,
        priority,
        scheduled_date,
        assigned_to,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
      RETURNING *
      `,
            [
                pipeline_id,
                segment_id || null,
                title,
                description || null,
                priority,
                scheduled_date,
                assigned_to || null,
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error creating maintenance task:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to create maintenance task",
        });
    }
});

// UPDATE maintenance task
router.patch("/:id", async (req, res) => {
    try {
        const {
            title,
            description,
            priority,
            scheduled_date,
            completed_date,
            assigned_to,
            status,
        } = req.body;

        const result = await pool.query(
            `
      UPDATE maintenance_tasks
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        priority = COALESCE($3, priority),
        scheduled_date = COALESCE($4, scheduled_date),
        completed_date = COALESCE($5, completed_date),
        assigned_to = COALESCE($6, assigned_to),
        status = COALESCE($7, status)
      WHERE id = $8
      RETURNING *
      `,
            [
                title,
                description,
                priority,
                scheduled_date,
                completed_date,
                assigned_to,
                status,
                req.params.id,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "ERROR",
                message: "Maintenance task not found",
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error updating maintenance task:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to update maintenance task",
        });
    }
});

// DELETE maintenance task
router.delete("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            `
      DELETE FROM maintenance_tasks
      WHERE id = $1
      RETURNING id
      `,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "ERROR",
                message: "Maintenance task not found",
            });
        }

        res.json({
            status: "OK",
            message: "Maintenance task deleted",
        });
    } catch (error) {
        console.error("Error deleting maintenance task:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to delete maintenance task",
        });
    }
});

export default router;