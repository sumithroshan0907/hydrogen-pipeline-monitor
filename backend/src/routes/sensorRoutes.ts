import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

// GET all sensors
router.get("/", async (_req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        s.*,
        ps.name AS segment_name,
        p.name AS pipeline_name
      FROM sensors s
      JOIN pipeline_segments ps
        ON s.segment_id = ps.id
      JOIN pipelines p
        ON ps.pipeline_id = p.id
      ORDER BY s.id DESC
    `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching sensors:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch sensors"
        });
    }
});

// GET one sensor
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
      SELECT
        s.*,
        ps.name AS segment_name,
        p.name AS pipeline_name
      FROM sensors s
      JOIN pipeline_segments ps
        ON s.segment_id = ps.id
      JOIN pipelines p
        ON ps.pipeline_id = p.id
      WHERE s.id = $1
      `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "ERROR",
                message: "Sensor not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching sensor:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch sensor"
        });
    }
});

// POST a sensor
router.post("/", async (req, res) => {
    try {
        const {
            segment_id,
            sensor_code,
            sensor_type,
            unit,
            location_description,
            min_safe_value,
            max_safe_value,
            status
        } = req.body;

        if (!segment_id || !sensor_code || !sensor_type) {
            return res.status(400).json({
                status: "ERROR",
                message: "segment_id, sensor_code and sensor_type are required"
            });
        }

        const result = await pool.query(
            `
      INSERT INTO sensors (
        segment_id,
        sensor_code,
        sensor_type,
        unit,
        location_description,
        min_safe_value,
        max_safe_value,
        status,
        installed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
      `,
            [
                segment_id,
                sensor_code,
                sensor_type,
                unit ?? null,
                location_description ?? null,
                min_safe_value ?? null,
                max_safe_value ?? null,
                status ?? "active"
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error creating sensor:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to create sensor"
        });
    }
});

export default router;