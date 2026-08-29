import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

const CREDS = [
  { role: "Admin",    email: "admin@h2pipeline.in",    pw: "Admin@H2#2024",  color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  { role: "Manager",  email: "manager@h2pipeline.in",  pw: "Mgr@H2#2024",   color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { role: "Operator", email: "operator@h2pipeline.in", pw: "Ops@H2#2024",   color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
];

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f0f4f8",
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: "1rem",
    }}>
      {/* Subtle background grid */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        pointerEvents: "none",
      }} />

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 1,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 20,
        padding: "2.25rem",
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
      }}>
        {/* Top accent line */}
        <div style={{
          position: "absolute", top: 0, left: "15%", right: "15%", height: 3,
          background: "linear-gradient(90deg, #2563eb, #60a5fa)",
          borderRadius: "0 0 4px 4px",
        }} />

        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "linear-gradient(135deg, #2563eb, #60a5fa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem", margin: "0 auto 0.875rem",
            boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
          }}>⚡</div>
          <h1 style={{
            color: "#0f172a", fontSize: "1.2rem", margin: 0,
            fontWeight: 800, letterSpacing: "-0.03em",
          }}>
            H₂ Pipeline Monitor
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.78rem", margin: "0.4rem 0 0", letterSpacing: "0.01em" }}>
            Secure access · Real-time monitoring
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Error */}
          {error && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10, padding: "0.65rem 0.875rem",
              marginBottom: "1rem", color: "#dc2626",
              fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem",
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{
              display: "block", color: "#64748b", fontSize: "0.65rem",
              fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
              marginBottom: "0.4rem",
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@h2pipeline.in"
              style={{
                width: "100%", padding: "0.65rem 0.875rem", borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#0f172a", fontSize: "0.875rem",
                outline: "none", boxSizing: "border-box",
                fontFamily: "inherit",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={e => {
                e.target.style.borderColor = "#2563eb";
                e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
                e.target.style.background = "#fff";
              }}
              onBlur={e => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.boxShadow = "none";
                e.target.style.background = "#f8fafc";
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{
              display: "block", color: "#64748b", fontSize: "0.65rem",
              fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
              marginBottom: "0.4rem",
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%", padding: "0.65rem 0.875rem", borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#0f172a", fontSize: "0.875rem",
                outline: "none", boxSizing: "border-box",
                fontFamily: "inherit",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={e => {
                e.target.style.borderColor = "#2563eb";
                e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
                e.target.style.background = "#fff";
              }}
              onBlur={e => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.boxShadow = "none";
                e.target.style.background = "#f8fafc";
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "0.7rem", borderRadius: 10,
              background: loading ? "#93c5fd" : "#2563eb",
              color: "#fff", fontWeight: 700, fontSize: "0.9rem",
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              boxShadow: loading ? "none" : "0 2px 12px rgba(37,99,235,0.3)",
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 14, height: 14, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "#fff",
                  animation: "spin 0.7s linear infinite",
                  display: "inline-block",
                }} />
                Authenticating…
              </>
            ) : "Sign In →"}
          </button>
        </form>

        {/* Demo Credentials */}
        <div style={{
          marginTop: "1.25rem",
          padding: "1rem",
          borderRadius: 12,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
        }}>
          <p style={{
            color: "#94a3b8", fontSize: "0.62rem", margin: "0 0 0.625rem",
            fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
            textAlign: "center",
          }}>
            Quick Fill — Demo Credentials
          </p>
          {CREDS.map(cred => (
            <button
              key={cred.role}
              type="button"
              onClick={() => { setEmail(cred.email); setPassword(cred.pw); setError(""); }}
              style={{
                display: "flex", width: "100%", textAlign: "left",
                alignItems: "center", gap: "0.6rem",
                background: "#fff", border: "1px solid #e2e8f0",
                borderRadius: 8, cursor: "pointer",
                color: "#475569", fontSize: "0.75rem", padding: "0.5rem 0.75rem",
                marginBottom: "0.4rem", fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                const btn = e.currentTarget;
                btn.style.background = cred.bg;
                btn.style.borderColor = cred.border;
              }}
              onMouseLeave={e => {
                const btn = e.currentTarget;
                btn.style.background = "#fff";
                btn.style.borderColor = "#e2e8f0";
              }}
            >
              <span style={{
                background: cred.bg, color: cred.color,
                fontSize: "0.58rem", fontWeight: 800, padding: "0.15rem 0.5rem",
                borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.06em",
                border: `1px solid ${cred.border}`, flexShrink: 0,
              }}>
                {cred.role}
              </span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#64748b" }}>
                {cred.email}
              </span>
              <span style={{ color: "#cbd5e1", fontSize: "0.65rem" }}>Click to fill</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
