import { Pool } from "pg";

export const pool = new Pool({
    host: "localhost",
    port: 5432,
    database: "hydrogen_pipeline",
    user: "hydrogen_user",
    password: "hydrogen_password",
});

pool.on("connect", () => {
    console.log("Connected to PostgreSQL");
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL error:", error);
});