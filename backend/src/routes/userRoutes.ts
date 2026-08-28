import { Router } from "express";
import { pool } from "../config/database";
import { authenticate, authorize } from "../middleware/auth";
import bcrypt from "bcryptjs";

const router = Router();

// GET all users — Admin only
router.get("/", authenticate, authorize("admin"), async (_req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, email, role, created_at
            FROM users
            ORDER BY id ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ status: "ERROR", message: "Failed to fetch users" });
    }
});

// GET user by ID — Admin only
router.get("/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, role, created_at FROM users WHERE id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ status: "ERROR", message: "User not found" });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ status: "ERROR", message: "Failed to fetch user" });
    }
});

// PATCH /api/users/:id — Admin only — update name, email, role
router.patch("/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
        const { name, email, role, password } = req.body;
        const validRoles = ["admin", "manager", "user"];

        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ status: "ERROR", message: `Role must be one of: ${validRoles.join(", ")}` });
        }

        // Check email uniqueness if changing
        if (email) {
            const existing = await pool.query(
                `SELECT id FROM users WHERE email = $1 AND id != $2`,
                [email.toLowerCase().trim(), req.params.id]
            );
            if (existing.rows.length > 0) {
                return res.status(409).json({ status: "ERROR", message: "Email already in use by another user." });
            }
        }

        // Build dynamic SET clause
        const fields: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        if (name)  { fields.push(`name = $${idx++}`);  values.push(name); }
        if (email) { fields.push(`email = $${idx++}`); values.push(email.toLowerCase().trim()); }
        if (role)  { fields.push(`role = $${idx++}`);  values.push(role); }
        if (password) {
            const hash = await bcrypt.hash(password, 12);
            fields.push(`password_hash = $${idx++}`);
            values.push(hash);
        }

        if (fields.length === 0) {
            return res.status(400).json({ status: "ERROR", message: "No fields to update." });
        }

        values.push(req.params.id);
        const result = await pool.query(
            `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, name, email, role, created_at`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ status: "ERROR", message: "User not found" });
        }

        res.json({ status: "OK", user: result.rows[0] });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ status: "ERROR", message: "Failed to update user" });
    }
});

// DELETE /api/users/:id — Admin only
router.delete("/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
        // Prevent admin from deleting themselves
        if (String(req.user!.id) === String(req.params.id)) {
            return res.status(400).json({ status: "ERROR", message: "You cannot delete your own account." });
        }

        const result = await pool.query(
            `DELETE FROM users WHERE id = $1 RETURNING id, name, email`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ status: "ERROR", message: "User not found" });
        }

        res.json({ status: "OK", message: `User ${result.rows[0].name} deleted.` });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ status: "ERROR", message: "Failed to delete user" });
    }
});

export default router;
