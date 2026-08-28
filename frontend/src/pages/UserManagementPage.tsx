import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import API_BASE from "../config/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "user";
  created_at: string;
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:   { bg: "#fef2f2", text: "#dc2626" },
  manager: { bg: "#fffbeb", text: "#d97706" },
  user:    { bg: "#f0fdf4", text: "#16a34a" },
};

const ROLE_DOT: Record<string, string> = {
  admin: "#ef4444", manager: "#f59e0b", user: "#10b981",
};

interface EditForm { name: string; email: string; role: string; password: string }
interface AddForm  { name: string; email: string; role: string; password: string }

export function UserManagementPage() {
  const { authHeader, user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", email: "", role: "", password: "" });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Add state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>({ name: "", email: "", role: "user", password: "" });
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setError("");
      const res = await fetch(`${API_BASE}/api/users`, { headers: authHeader() });
      if (!res.ok) throw new Error("Failed to fetch users");
      setUsers(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Save edit ────────────────────────────────────────────────────────────
  const saveEdit = async () => {
    setEditError("");
    setEditLoading(true);
    try {
      const body: Record<string, string> = {};
      if (editForm.name)     body.name     = editForm.name;
      if (editForm.email)    body.email    = editForm.email;
      if (editForm.role)     body.role     = editForm.role;
      if (editForm.password) body.password = editForm.password;

      const res = await fetch(`${API_BASE}/api/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      setEditingId(null);
      await fetchUsers();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Error");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Delete user ──────────────────────────────────────────────────────────
  const deleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await fetchUsers();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  };

  // ── Add user ─────────────────────────────────────────────────────────────
  const addUser = async () => {
    setAddError("");
    if (!addForm.name || !addForm.email || !addForm.password) {
      setAddError("Name, email and password are required.");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add user");
      setAddForm({ name: "", email: "", role: "user", password: "" });
      setShowAddForm(false);
      await fetchUsers();
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Error");
    } finally {
      setAddLoading(false);
    }
  };

  if (loading) return <p style={{ padding: "1rem", color: "#64748b" }}>Loading users…</p>;
  if (error)   return <p style={{ padding: "1rem", color: "#ef4444" }}>⚠ {error}</p>;

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>User Management</h2>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", opacity: 0.5 }}>{users.length} registered users</p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setAddError(""); }}
          style={{
            padding: "0.55rem 1.2rem", borderRadius: 10,
            background: showAddForm ? "rgba(239,68,68,0.15)" : "linear-gradient(135deg,#3b82f6,#06b6d4)",
            border: showAddForm ? "1px solid rgba(239,68,68,0.3)" : "none",
            color: showAddForm ? "#fca5a5" : "#fff",
            fontWeight: 700, fontSize: "0.88rem", cursor: "pointer",
          }}
        >
          {showAddForm ? "✕ Cancel" : "+ Add User"}
        </button>
      </div>

      {/* ── Add User Form ── */}
      {showAddForm && (
        <div style={{
          background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 14, padding: "1.2rem", marginBottom: "1.4rem",
        }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem" }}>New User</h3>
          {addError && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "0.6rem 0.9rem", marginBottom: "0.8rem", color: "#fca5a5", fontSize: "0.84rem" }}>
              ⚠ {addError}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
            {(["name", "email", "password"] as const).map(field => (
              <div key={field} style={field === "password" ? { gridColumn: "1 / -1" } : {}}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem", opacity: 0.6 }}>
                  {field}
                </label>
                <input
                  type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                  value={addForm[field]}
                  onChange={e => setAddForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={field === "name" ? "Full name" : field === "email" ? "email@example.com" : "••••••••"}
                  style={{
                    width: "100%", padding: "0.6rem 0.85rem", borderRadius: 8,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    color: "inherit", fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem", opacity: 0.6 }}>
                Role
              </label>
              <select
                value={addForm.role}
                onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                style={{
                  width: "100%", padding: "0.6rem 0.85rem", borderRadius: 8,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "inherit", fontSize: "0.9rem", outline: "none",
                }}
              >
                <option value="user">User (Operator)</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button
            onClick={addUser}
            disabled={addLoading}
            style={{
              marginTop: "1rem", padding: "0.6rem 1.5rem", borderRadius: 10,
              background: "linear-gradient(135deg,#3b82f6,#06b6d4)",
              border: "none", color: "#fff", fontWeight: 700, cursor: addLoading ? "not-allowed" : "pointer",
            }}
          >
            {addLoading ? "Adding…" : "Create User"}
          </button>
        </div>
      )}

      {/* ── Users Table ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {users.map(u => {
          const isEditing = editingId === u.id;
          const isMe = me?.id === Number(u.id);

          return (
            <div key={u.id} style={{
              background: isEditing ? "rgba(59,130,246,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${isEditing ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 14, padding: "1rem 1.2rem", transition: "all 0.2s",
            }}>
              {isEditing ? (
                /* ── Edit Form ── */
                <div>
                  <p style={{ margin: "0 0 0.8rem", fontSize: "0.82rem", opacity: 0.5 }}>Editing: <strong>{u.name}</strong></p>
                  {editError && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "0.5rem 0.8rem", marginBottom: "0.8rem", color: "#fca5a5", fontSize: "0.82rem" }}>
                      ⚠ {editError}
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginBottom: "0.8rem" }}>
                    {(["name","email","role","password"] as const).map(field => (
                      <div key={field}>
                        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem", opacity: 0.55 }}>
                          {field}{field === "password" ? " (leave blank to keep)" : ""}
                        </label>
                        {field === "role" ? (
                          <select
                            value={editForm.role}
                            onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "inherit", fontSize: "0.88rem", outline: "none" }}
                          >
                            <option value="user">User (Operator)</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <input
                            type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                            value={editForm[field]}
                            placeholder={field === "password" ? "New password…" : `Current: ${u[field as keyof User] || ""}`}
                            onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "inherit", fontSize: "0.88rem", outline: "none", boxSizing: "border-box" }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <button onClick={saveEdit} disabled={editLoading} style={{ padding: "0.5rem 1.2rem", borderRadius: 8, background: "linear-gradient(135deg,#3b82f6,#06b6d4)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                      {editLoading ? "Saving…" : "Save Changes"}
                    </button>
                    <button onClick={() => { setEditingId(null); setEditError(""); }} style={{ padding: "0.5rem 1rem", borderRadius: 8, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "inherit", cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* ── User Row ── */
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                      background: ROLE_DOT[u.role] || "#64748b",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 800, fontSize: "1rem",
                    }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {u.name}
                        {isMe && <span style={{ fontSize: "0.68rem", padding: "0.1rem 0.45rem", borderRadius: 999, background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>You</span>}
                      </div>
                      <div style={{ fontSize: "0.8rem", opacity: 0.55, marginTop: "0.1rem" }}>{u.email}</div>
                      <div style={{ fontSize: "0.72rem", opacity: 0.4, marginTop: "0.1rem" }}>
                        Joined {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                    <span style={{
                      fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.07em", padding: "0.2rem 0.65rem", borderRadius: 999,
                      background: ROLE_COLORS[u.role]?.bg || "#f1f5f9",
                      color: ROLE_COLORS[u.role]?.text || "#475569",
                    }}>
                      {u.role}
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(u.id);
                        setEditError("");
                        setEditForm({ name: u.name, email: u.email, role: u.role, password: "" });
                      }}
                      style={{ padding: "0.35rem 0.85rem", borderRadius: 8, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    {!isMe && (
                      <button
                        onClick={() => deleteUser(u.id, u.name)}
                        style={{ padding: "0.35rem 0.85rem", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
