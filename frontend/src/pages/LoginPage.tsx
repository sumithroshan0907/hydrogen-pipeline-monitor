import { useState, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      // AuthContext sets user → App re-renders to dashboard automatically
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.05)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20,
        padding: "2.5rem 3rem", width: "100%", maxWidth: 420,
        boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
      }}>
        {/* Logo / Title */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.8rem", margin: "0 auto 1rem",
          }}>⚡</div>
          <h1 style={{ color: "#f8fafc", fontSize: "1.4rem", margin: 0, fontWeight: 700 }}>
            Hydrogen Pipeline Monitor
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0.4rem 0 0" }}>
            Sign in to access the dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Error */}
          {error && (
            <div style={{
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: 10, padding: "0.7rem 1rem", marginBottom: "1.2rem",
              color: "#fca5a5", fontSize: "0.87rem",
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: "0.82rem", marginBottom: "0.4rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@h2monitor.com"
              style={{
                width: "100%", padding: "0.75rem 1rem", borderRadius: 10,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                color: "#f8fafc", fontSize: "0.95rem", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "1.6rem" }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: "0.82rem", marginBottom: "0.4rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%", padding: "0.75rem 1rem", borderRadius: 10,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                color: "#f8fafc", fontSize: "0.95rem", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "0.85rem", borderRadius: 12,
              background: loading ? "rgba(59,130,246,0.5)" : "linear-gradient(135deg, #3b82f6, #06b6d4)",
              color: "#fff", fontWeight: 700, fontSize: "1rem",
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Demo Credentials */}
        <div style={{
          marginTop: "1.8rem", padding: "1rem", borderRadius: 10,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <p style={{ color: "#64748b", fontSize: "0.75rem", margin: "0 0 0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Demo Credentials
          </p>
          {[
            { role: "Admin",    email: "admin@h2pipeline.in",    pw: "Admin@H2#2024",   color: "#ef4444" },
            { role: "Manager",  email: "manager@h2pipeline.in",  pw: "Mgr@H2#2024",    color: "#f59e0b" },
            { role: "Operator", email: "operator@h2pipeline.in", pw: "Ops@H2#2024",    color: "#10b981" },
          ].map(cred => (
            <button
              key={cred.role}
              type="button"
              onClick={() => { setEmail(cred.email); setPassword(cred.pw); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: "none", border: "none", cursor: "pointer",
                color: "#94a3b8", fontSize: "0.82rem", padding: "0.2rem 0",
              }}
            >
              <span style={{ color: cred.color, fontWeight: 700 }}>{cred.role}:</span>{" "}
              {cred.email} / <span style={{ color: "#64748b" }}>{cred.pw}</span>
            </button>
          ))}

        </div>
      </div>
    </div>
  );
}
