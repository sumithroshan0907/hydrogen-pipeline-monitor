/**
 * Central API base URL — reads from environment variable in production,
 * falls back to localhost for development.
 *
 * Set VITE_API_URL in:
 *   - frontend/.env.local       (local dev override)
 *   - Vercel environment vars   (production)
 */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default API_BASE;
