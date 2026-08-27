import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

// GET all pipelines
router.get("/", async (_req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
       FROM pipelines
       ORDER BY id DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching pipelines:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch pipelines"
        });
    }
});

// POST a new pipeline
router.post("/", async (req, res) => {
    try {
        const {
            name,
            code,
            description,
            location,
            length_km,
            design_pressure_bar,
            operating_pressure_bar,
            status
        } = req.body;

        if (!name || !code) {
            return res.status(400).json({
                status: "ERROR",
                message: "name and code are required"
            });
        }

        const result = await pool.query(
            `INSERT INTO pipelines
       (
         name,
         code,
         description,
         location,
         length_km,
         design_pressure_bar,
         operating_pressure_bar,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [
                name,
                code,
                description ?? null,
                location ?? null,
                length_km ?? null,
                design_pressure_bar ?? null,
                operating_pressure_bar ?? null,
                status ?? "active"
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error creating pipeline:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to create pipeline"
        });
    }
});
// GET one pipeline by ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT *
       FROM pipelines
       WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "ERROR",
                message: "Pipeline not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching pipeline:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch pipeline"
        });
    }
});


// PUT update a pipeline
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            code,
            description,
            location,
            length_km,
            design_pressure_bar,
            operating_pressure_bar,
            status
        } = req.body;

        const result = await pool.query(
            `UPDATE pipelines
       SET
         name = $1,
         code = $2,
         description = $3,
         location = $4,
         length_km = $5,
         design_pressure_bar = $6,
         operating_pressure_bar = $7,
         status = $8,
         updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
            [
                name,
                code,
                description ?? null,
                location ?? null,
                length_km ?? null,
                design_pressure_bar ?? null,
                operating_pressure_bar ?? null,
                status ?? "active",
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "ERROR",
                message: "Pipeline not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error updating pipeline:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to update pipeline"
        });
    }
});


// DELETE a pipeline
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM pipelines
       WHERE id = $1
       RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "ERROR",
                message: "Pipeline not found"
            });
        }

        res.json({
            status: "OK",
            message: "Pipeline deleted successfully",
            pipeline: result.rows[0]
        });
    } catch (error) {
        console.error("Error deleting pipeline:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to delete pipeline"
        });
    }
});

export default router;