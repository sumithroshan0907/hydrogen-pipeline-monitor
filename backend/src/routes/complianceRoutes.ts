import { Router } from "express";
import { pool } from "../config/database";

const router = Router();
router.get("/test", (_req, res) => {
    res.json({ message: "Compliance route works" });
});

// GET all compliance reports
router.get("/", async (_req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        cr.*,
        p.name AS pipeline_name,
        p.code AS pipeline_code
      FROM compliance_reports cr
      JOIN pipelines p ON cr.pipeline_id = p.id
      ORDER BY cr.created_at DESC
    `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching compliance reports:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch compliance reports",
        });
    }
});

// GET compliance report by ID
router.get("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            `
      SELECT
        cr.*,
        p.name AS pipeline_name,
        p.code AS pipeline_code
      FROM compliance_reports cr
      JOIN pipelines p ON cr.pipeline_id = p.id
      WHERE cr.id = $1
      `,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "ERROR",
                message: "Compliance report not found",
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching compliance report:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch compliance report",
        });
    }
});

// GENERATE compliance report
router.post("/", async (req, res) => {
    try {
        const {
            pipeline_id,
            report_type = "pressure_compliance",
            reporting_period_start,
            reporting_period_end,
        } = req.body;

        if (
            !pipeline_id ||
            !reporting_period_start ||
            !reporting_period_end
        ) {
            return res.status(400).json({
                status: "ERROR",
                message:
                    "pipeline_id, reporting_period_start and reporting_period_end are required",
            });
        }

        // Check pipeline exists
        const pipelineResult = await pool.query(
            `
      SELECT id, name, code
      FROM pipelines
      WHERE id = $1
      `,
            [pipeline_id]
        );

        if (pipelineResult.rows.length === 0) {
            return res.status(404).json({
                status: "ERROR",
                message: "Pipeline not found",
            });
        }

        // Pressure reading statistics
        const readingsResult = await pool.query(
            `
      SELECT
        COUNT(sr.id) AS total_readings,
        COALESCE(MIN(sr.value), 0) AS minimum_pressure,
        COALESCE(MAX(sr.value), 0) AS maximum_pressure,
        COALESCE(AVG(sr.value), 0) AS average_pressure
      FROM sensor_readings sr
      JOIN sensors s
        ON sr.sensor_id = s.id
      JOIN pipeline_segments ps
        ON s.segment_id = ps.id
      WHERE ps.pipeline_id = $1
        AND sr.recorded_at::date BETWEEN $2 AND $3
      `,
            [pipeline_id, reporting_period_start, reporting_period_end]
        );

        // Alert statistics
        const alertsResult = await pool.query(
            `
      SELECT
        COUNT(*) AS total_alerts,
        COUNT(*) FILTER (WHERE severity = 'critical') AS critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'warning') AS warning_alerts,
        COUNT(*) FILTER (WHERE status = 'open') AS open_alerts,
        COUNT(*) FILTER (
          WHERE status IN ('resolved', 'acknowledged')
        ) AS resolved_alerts
      FROM leak_alerts
      WHERE pipeline_id = $1
        AND detected_at::date BETWEEN $2 AND $3
      `,
            [pipeline_id, reporting_period_start, reporting_period_end]
        );

        // Maintenance statistics
        const maintenanceResult = await pool.query(
            `
      SELECT
        COUNT(*) AS total_maintenance,
        COUNT(*) FILTER (
          WHERE status = 'completed'
        ) AS completed_maintenance,
        COUNT(*) FILTER (
          WHERE status = 'scheduled'
        ) AS scheduled_maintenance
      FROM maintenance_tasks
      WHERE pipeline_id = $1
        AND scheduled_date BETWEEN $2 AND $3
      `,
            [pipeline_id, reporting_period_start, reporting_period_end]
        );

        // Save report metadata
        const reportResult = await pool.query(
            `
      INSERT INTO compliance_reports (
        pipeline_id,
        report_type,
        reporting_period_start,
        reporting_period_end,
        status,
        generated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'generated',
        NOW()
      )
      RETURNING *
      `,
            [
                pipeline_id,
                report_type,
                reporting_period_start,
                reporting_period_end,
            ]
        );

        res.status(201).json({
            report: reportResult.rows[0],

            pipeline: pipelineResult.rows[0],

            pressure: readingsResult.rows[0],

            alerts: alertsResult.rows[0],

            maintenance: maintenanceResult.rows[0],
        });
    } catch (error) {
        console.error("Error generating compliance report:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Failed to generate compliance report",
        });
    }
});

export default router;
