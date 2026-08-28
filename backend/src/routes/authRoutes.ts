import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../config/database";
import { signToken } from "../config/jwt";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// ─── POST /api/auth/login ──────────────────────────────────────────────────
// Public — email + password → JWT
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ status: "ERROR", message: "Email and password are required." });
        }

        const result = await pool.query(
            `SELECT id, name, email, role, password_hash FROM users WHERE email = $1`,
            [email.toLowerCase().trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ status: "ERROR", message: "Invalid email or password." });
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ status: "ERROR", message: "Invalid email or password." });
        }

        const token = signToken({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        });

        res.json({
            status: "OK",
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ status: "ERROR", message: "Login failed. Please try again." });
    }
});

// ─── POST /api/auth/register ───────────────────────────────────────────────
// Admin-only — creates a new user with a hashed password
router.post("/register", authenticate, authorize("admin"), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ status: "ERROR", message: "name, email, password, and role are required." });
        }

        const validRoles = ["admin", "manager", "user"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ status: "ERROR", message: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
        }

        const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ status: "ERROR", message: "A user with this email already exists." });
        }

        const password_hash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (name, email, role, password_hash)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, role, created_at`,
            [name, email.toLowerCase().trim(), role, password_hash]
        );

        res.status(201).json({ status: "OK", user: result.rows[0] });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ status: "ERROR", message: "Failed to create user." });
    }
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
// Any authenticated user — returns their own profile
router.get("/me", authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, role, created_at FROM users WHERE id = $1`,
            [req.user!.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ status: "ERROR", message: "User not found." });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Me error:", error);
        res.status(500).json({ status: "ERROR", message: "Failed to fetch profile." });
    }
});

export default router;
