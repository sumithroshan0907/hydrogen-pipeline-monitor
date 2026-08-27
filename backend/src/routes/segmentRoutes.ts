import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

// GET all pipeline segments
router.get("/", async (_req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        ps.*,
        p.name AS pipeline_name,
        p.code AS pipeline_code
      FROM pipeline_segments ps
      JOIN pipelines p
        ON ps.pipeline_id = p.id
      ORDER BY ps.id DESC
    `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching pipeline segments:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch pipeline segments"
        });
    }
});

// GET one pipeline segment
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
      SELECT
        ps.*,
        p.name AS pipeline_name,
        p.code AS pipeline_code
      FROM pipeline_segments ps
      JOIN pipelines p
        ON ps.pipeline_id = p.id
      WHERE ps.id = $1
      `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "ERROR",
                message: "Pipeline segment not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching pipeline segment:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch pipeline segment"
        });
    }
});

// POST a pipeline segment
router.post("/", async (req, res) => {
    try {
        const {
            pipeline_id,
            name,
            segment_code,
            start_location,
            end_location,
            length_km,
            max_pressure_bar,
            status
        } = req.body;

        if (!pipeline_id || !name || !segment_code) {
            return res.status(400).json({
                status: "ERROR",
                message: "pipeline_id, name and segment_code are required"
            });
        }

        const result = await pool.query(
            `
      INSERT INTO pipeline_segments (
        pipeline_id,
        name,
        segment_code,
        start_location,
        end_location,
        length_km,
        max_pressure_bar,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
            [
                pipeline_id,
                name,
                segment_code,
                start_location ?? null,
                end_location ?? null,
                length_km ?? null,
                max_pressure_bar ?? null,
                status ?? "active"
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error creating pipeline segment:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to create pipeline segment"
        });
    }
});

export default router;