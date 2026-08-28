import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "h2pipeline_jwt_secret_change_in_prod";
const JWT_EXPIRES_IN = "12h";

export interface JwtPayload {
    id: number;
    name: string;
    email: string;
    role: "admin" | "manager" | "user";
}

export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
