
import express from "express";
import cors from "cors";
import { pool } from "./config/database";
import pipelineRoutes from "./routes/pipelineRoutes";
import segmentRoutes from "./routes/segmentRoutes";
import sensorRoutes from "./routes/sensorRoutes";
import sensorReadingRoutes from "./routes/sensorReadingRoutes";
import { redisClient } from "./config/redis";
import alertRoutes from "./routes/alertRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import maintenanceRoutes from "./routes/maintenanceRoutes";
import complianceRoutes from "./routes/complianceRoutes";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import { authenticate } from "./middleware/auth";
import { startSensorSimulator } from "./config/simulator";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ─── Public routes (no auth required) ─────────────────────────────────────
app.use("/api/auth", authRoutes);

app.get("/", (_req, res) => {
    res.json({ message: "Hydrogen Pipeline Monitoring API is running!" });
});

app.get("/api/health", (_req, res) => {
    res.json({ status: "OK", service: "Hydrogen Pipeline API" });
});

app.get("/api/db-test", async (_req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS current_time");
        res.json({ status: "OK", database: "PostgreSQL", time: result.rows[0].current_time });
    } catch (error) {
        console.error("Database test failed:", error);
        res.status(500).json({ status: "ERROR", message: "Could not connect to PostgreSQL" });
    }
});

// ─── Protected routes (JWT required) ──────────────────────────────────────
app.use("/api/pipelines", authenticate, pipelineRoutes);
app.use("/api/pipeline-segments", authenticate, segmentRoutes);
app.use("/api/sensors", authenticate, sensorRoutes);
app.use("/api/sensor-readings", authenticate, sensorReadingRoutes);
app.use("/api/alerts", authenticate, alertRoutes);
app.use("/api/dashboard", authenticate, dashboardRoutes);
app.use("/api/maintenance", authenticate, maintenanceRoutes);
app.use("/api/compliance", authenticate, complianceRoutes);
app.use("/api/users", authenticate, userRoutes);

async function startServer() {
    try {
        await redisClient.connect();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

        // Start real-time sensor data simulator
        startSensorSimulator();
    } catch (error) {
        console.error("Failed to start server:", error);
    }
}

startServer();