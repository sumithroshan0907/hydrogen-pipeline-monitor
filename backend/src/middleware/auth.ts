import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../config/jwt";

// Extend Express Request to carry the authenticated user
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * authenticate — validates the Bearer JWT in Authorization header.
 * Attaches req.user = { id, name, email, role } on success.
 * Returns 401 if token is missing or invalid.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ status: "ERROR", message: "Authentication required. Please log in." });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        req.user = verifyToken(token);
        next();
    } catch {
        res.status(401).json({ status: "ERROR", message: "Invalid or expired token. Please log in again." });
    }
}

/**
 * authorize(...roles) — factory that returns middleware blocking
 * any role NOT in the allowed list with 403 Forbidden.
 *
 * Usage:  router.post("/", authenticate, authorize("admin", "manager"), handler)
 */
export function authorize(...roles: Array<"admin" | "manager" | "user">) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ status: "ERROR", message: "Authentication required." });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                status: "ERROR",
                message: `Access denied. Required role: ${roles.join(" or ")}. Your role: ${req.user.role}.`,
            });
            return;
        }

        next();
    };
}
