import { useEffect, useState, useRef, useCallback } from "react";
import "./App.css";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { UserManagementPage } from "./pages/UserManagementPage";
import API_BASE from "./config/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

/* ── Types ─────────────────────────────────────────────── */
interface DashboardSummary {
  total_pipelines: number;
  total_sensors: number;
  readings_last_24_hours: number;
  open_alerts: number;
}
interface SensorReading {
  id: string;
  sensor_id: string;
  sensor_code: string;
  sensor_type: string;
  value: string;
  recorded_at: string;
  quality: string;
}
interface Alert {
  id: string;
  sensor_id: string;
  pipeline_id: string;
  severity: string;
  alert_type: string;
  message: string;
  detected_value: string;
  detected_at: string;
  status: string;
  sensor_code: string;
  pipeline_name: string;
}
interface Pipeline {
  id: string;
  name: string;
  code: string;
  description: string;
  location: string;
  length_km: string;
  design_pressure_bar: string;
  operating_pressure_bar: string;
  status: string;
}
interface PipelineSegment {
  id: string;
  pipeline_id: string;
  name: string;
  segment_code: string;
  start_location: string;
  end_location: string;
  length_km: string;
  max_pressure_bar: string;
  status: string;
  created_at: string;
  pipeline_name: string;
  pipeline_code: string;
}
interface Sensor {
  id: string;
  segment_id: string;
  sensor_code: string;
  sensor_type: string;
  unit: string;
  location_description: string;
  min_safe_value: string;
  max_safe_value: string;
  status: string;
  installed_at: string;
  created_at: string;
  segment_name: string;
  pipeline_name: string;
}
interface ComplianceReport {
  id: string;
  pipeline_id: string;
  report_type: string;
  reporting_period_start: string;
  reporting_period_end: string;
  status: string;
  generated_at: string | null;
  created_at: string;
  pipeline_name: string;
  pipeline_code: string;
}

/* ── Helpers ────────────────────────────────────────────── */
function getSensorStatus(reading: SensorReading, sensors: Sensor[]): "normal" | "warning" | "critical" {
  const sensor = sensors.find(s => s.id === reading.sensor_id);
  if (!sensor) return "normal";
  const val = Number(reading.value);
  const min = Number(sensor.min_safe_value);
  const max = Number(sensor.max_safe_value);
  if (val > max) return "critical";
  if (val < min) return "warning";
  return "normal";
}

function SensorStatusBadge({ status }: { status: "normal" | "warning" | "critical" }) {
  const labels = { normal: "NORMAL", warning: "LOW", critical: "HIGH" };
  return <span className={`sensor-status ${status}`}>{labels[status]}</span>;
}

function PipelineStatusBadge({ status }: { status: string }) {
  return <span className={`pipeline-status ${status.toLowerCase()}`}>{status}</span>;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1a202c",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      padding: "0.6rem 0.875rem",
      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
    }}>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginBottom: 3, fontFamily: "'JetBrains Mono', monospace" }}>{label}</p>
      <p style={{ color: "#60a5fa", fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
        {Number(payload[0].value).toFixed(2)}
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginLeft: 4 }}>bar</span>
      </p>
    </div>
  );
}

/* ── App ────────────────────────────────────────────────── */
function App() {
  const { user, logout, authHeader } = useAuth();
  const [activeTab, setActiveTab] = useState<"dashboard" | "users">("dashboard");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [segments, setSegments] = useState<PipelineSegment[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<any[]>([]);
  const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([]);
  const [compliancePipelineId, setCompliancePipelineId] = useState("");
  const [complianceStartDate, setComplianceStartDate] = useState("");
  const [complianceEndDate, setComplianceEndDate] = useState("");
  const [generatingCompliance, setGeneratingCompliance] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const tickRef = useRef(0);
  const fetchingRef = useRef(false);

  /* ── Derived data ───────────────────────────────────────── */
  const latestReadings = Object.values(
    readings.reduce<Record<string, SensorReading>>((acc, r) => {
      if (!acc[r.sensor_id] || new Date(r.recorded_at) > new Date(acc[r.sensor_id].recorded_at)) {
        acc[r.sensor_id] = r;
      }
      return acc;
    }, {})
  );

  const normalSensors   = latestReadings.filter(r => getSensorStatus(r, sensors) === "normal").length;
  const warningSensors  = latestReadings.filter(r => getSensorStatus(r, sensors) === "warning").length;
  const criticalSensors = latestReadings.filter(r => getSensorStatus(r, sensors) === "critical").length;

  const criticalAlerts = alerts.filter(a => a.severity === "critical").length;
  const warningAlerts  = alerts.filter(a => a.severity === "warning").length;

  // Chart: last 20 readings (any sensor — use first sensor for chart)
  const chartData = [...readings]
    .filter(r => r.sensor_code?.includes("P01")) // pressure sensors only
    .slice(0, 20)
    .reverse()
    .map(r => ({
      time:  new Date(r.recorded_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      value: Number(Number(r.value).toFixed(2)),
    }));

  /* ── Fetch ──────────────────────────────────────────────── */
  const loadDashboard = useCallback(async (silent = false) => {
    if (fetchingRef.current && silent) return; // skip if already fetching
    fetchingRef.current = true;

    try {
      if (!silent) setError("");

      const headers = authHeader();

      const [
        summaryRes, pipelinesRes, segmentsRes, sensorsRes,
        readingsRes, alertsRes, maintenanceRes, complianceRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard/summary`,  { headers }),
        fetch(`${API_BASE}/api/pipelines`,          { headers }),
        fetch(`${API_BASE}/api/pipeline-segments`,  { headers }),
        fetch(`${API_BASE}/api/sensors`,            { headers }),
        fetch(`${API_BASE}/api/sensor-readings`,    { headers }),
        fetch(`${API_BASE}/api/alerts`,             { headers }),
        fetch(`${API_BASE}/api/maintenance`,        { headers }),
        fetch(`${API_BASE}/api/compliance`,         { headers }),
      ]);

      if (!summaryRes.ok) throw new Error("Dashboard API error");

      const [
        summaryData, pipelinesData, segmentsData, sensorsData,
        readingsData, alertsData, maintenanceData, complianceData,
      ] = await Promise.all([
        summaryRes.json(), pipelinesRes.json(), segmentsRes.json(), sensorsRes.json(),
        readingsRes.json(), alertsRes.json(), maintenanceRes.json(), complianceRes.json(),
      ]);

      setSummary(summaryData.summary);
      setPipelines(pipelinesData);
      setSegments(segmentsData);
      setSensors(sensorsData);
      setReadings(readingsData);
      setAlerts(alertsData);
      setMaintenanceTasks(maintenanceData);
      setComplianceReports(complianceData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error loading dashboard:", err);
      if (!silent) setError("Failed to connect to the Pipeline API. Make sure the backend is running.");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [authHeader]);

  /* ── Resolve alert ──────────────────────────────────────── */
  const resolveAlert = async (alertId: string) => {
    if (resolvingId === alertId) return;
    setResolvingId(alertId);
    try {
      const response = await fetch(`${API_BASE}/api/alerts/${alertId}/resolve`, {
        method: "PATCH",
        headers: { ...authHeader(), "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to resolve alert");
      }

      // Optimistically remove from UI immediately
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      setSummary(prev => prev ? { ...prev, open_alerts: Math.max(0, prev.open_alerts - 1) } : prev);

      // Then refresh to get accurate state
      setTimeout(() => loadDashboard(true), 500);
    } catch (err) {
      console.error("Error resolving alert:", err);
      window.alert(`Failed to resolve alert: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setResolvingId(null);
    }
  };

  /* ── Generate compliance ────────────────────────────────── */
  const generateComplianceReport = async () => {
    if (!compliancePipelineId || !complianceStartDate || !complianceEndDate) {
      window.alert("Please select a pipeline and reporting period.");
      return;
    }
    if (complianceStartDate > complianceEndDate) {
      window.alert("Start date cannot be after end date.");
      return;
    }
    try {
      setGeneratingCompliance(true);
      const response = await fetch(`${API_BASE}/api/compliance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          pipeline_id: Number(compliancePipelineId),
          report_type: "pressure_compliance",
          reporting_period_start: complianceStartDate,
          reporting_period_end: complianceEndDate,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to generate compliance report");
      setCompliancePipelineId(""); setComplianceStartDate(""); setComplianceEndDate("");
      await loadDashboard(true);
    } catch (err) {
      console.error("Error generating compliance report:", err);
      window.alert("Failed to generate compliance report.");
    } finally {
      setGeneratingCompliance(false);
    }
  };

  /* ── Effects ────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    loadDashboard();

    const dataInterval = setInterval(() => loadDashboard(true), 2000);
    const tickInterval = setInterval(() => {
      tickRef.current += 1;
      setTick(tickRef.current);
    }, 1000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(tickInterval);
    };
  }, [user?.id]);

  /* ── Guards ─────────────────────────────────────────────── */
  if (!user) return <LoginPage />;

  if (loading) {
    return (
      <div className="loading-screen">
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: "linear-gradient(135deg, #2563eb, #60a5fa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.5rem", boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
        }}>⚡</div>
        <div className="loading-spinner" />
        <p className="loading-text">Connecting to Pipeline Network…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <div className="error">
          <p style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚠️</p>
          <p style={{ fontWeight: 700, marginBottom: "0.5rem", fontSize: "1rem" }}>Connection Error</p>
          <p style={{ color: "#64748b", fontSize: "0.82rem" }}>{error}</p>
          <button
            onClick={() => { setError(""); setLoading(true); loadDashboard(); }}
            style={{
              marginTop: "1.25rem", padding: "0.55rem 1.5rem",
              borderRadius: 10, background: "#2563eb", border: "none",
              color: "#fff", cursor: "pointer", fontFamily: "inherit",
              fontWeight: 700, fontSize: "0.8rem",
            }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="app">
      {/* ── Header (dark) ── */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">⚡</div>
          <div>
            <div className="header-title">H₂ Pipeline Monitor</div>
            <div className="header-subtitle">Real-Time Monitoring System</div>
          </div>
        </div>

        <div className="header-right">
          <div className="status-indicator">
            <span className="status-dot" />
            LIVE
          </div>

          {lastUpdated && (
            <span className="last-updated">
              Updated {lastUpdated.toLocaleTimeString("en-IN")}
            </span>
          )}

          <span className="user-pill">
            <span className={`role-badge ${user.role}`}>{user.role}</span>
            {user.name}
          </span>

          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>
      </header>

      {/* ── Tab Nav (dark) ── */}
      <nav className="tab-nav">
        <button
          className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        {user.role === "admin" && (
          <button
            className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            User Management
          </button>
        )}
      </nav>

      {/* ── User Management Tab ── */}
      {activeTab === "users" && user.role === "admin" && (
        <main>
          <UserManagementPage />
        </main>
      )}

      {/* ── Dashboard Tab ── */}
      {activeTab === "dashboard" && (
        <main>

          {/* ── KPI Cards ── */}
          <section className="cards">
            <div className="card">
              <span className="card-icon">🔧</span>
              <span className="card-label">Total Pipelines</span>
              <strong key={`p-${tick}`}>{summary?.total_pipelines ?? 0}</strong>
              <div className="card-trend">Active network</div>
            </div>

            <div className="card">
              <span className="card-icon">📡</span>
              <span className="card-label">Total Sensors</span>
              <strong key={`s-${tick}`}>{summary?.total_sensors ?? 0}</strong>
              <div className="card-trend" style={{ color: "#7c3aed" }}>Deployed & monitoring</div>
            </div>

            <div className="card">
              <span className="card-icon">📊</span>
              <span className="card-label">Readings (24h)</span>
              <strong key={`r-${tick}`}>{(summary?.readings_last_24_hours ?? 0).toLocaleString()}</strong>
              <div className="card-trend" style={{ color: "#059669" }}>● Live streaming</div>
            </div>

            <div className="card alert-card">
              <span className="card-icon">🚨</span>
              <span className="card-label">Open Alerts</span>
              <strong key={`a-${tick}`}>{summary?.open_alerts ?? 0}</strong>
              <div className="card-trend" style={{ color: (summary?.open_alerts ?? 0) > 0 ? "#dc2626" : "#059669" }}>
                {(summary?.open_alerts ?? 0) > 0 ? "Requires attention" : "✓ All clear"}
              </div>
            </div>
          </section>

          {/* ── Sensor Health ── */}
          <section className="panel">
            <h2>🩺 Sensor Health Status</h2>
            <div className="sensor-health">
              <div className="health-card normal">
                <span>Normal</span>
                <strong key={`hn-${tick}`}>{normalSensors}</strong>
              </div>
              <div className="health-card warning">
                <span>Low Pressure</span>
                <strong key={`hw-${tick}`}>{warningSensors}</strong>
              </div>
              <div className="health-card critical">
                <span>High Pressure</span>
                <strong key={`hc-${tick}`}>{criticalSensors}</strong>
              </div>
            </div>
          </section>

          {/* ── Monitor Grid: Chart + Alerts ── */}
          <div className="monitor-grid">
            {/* Left: Chart + Readings */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              {/* Pressure Chart */}
              <div className="panel pressure-chart">
                <h2>📈 Pressure Trend — Live</h2>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 15, bottom: 5, left: -15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "'JetBrains Mono'" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "'JetBrains Mono'" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine
                        y={90}
                        stroke="rgba(220,38,38,0.5)"
                        strokeDasharray="4 4"
                        label={{ value: "MAX", fill: "#dc2626", fontSize: 10 }}
                      />
                      <ReferenceLine
                        y={60}
                        stroke="rgba(217,119,6,0.5)"
                        strokeDasharray="4 4"
                        label={{ value: "MIN", fill: "#d97706", fontSize: 10 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
                        animationDuration={300}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Live Sensor Readings */}
              <div className="panel">
                <h2>🔬 Live Sensor Readings</h2>
                {readings.length === 0 ? (
                  <div className="no-alerts">No sensor readings available.</div>
                ) : (
                  <div className="reading-list">
                    {latestReadings.slice(0, 6).map(reading => {
                      const status = getSensorStatus(reading, sensors);
                      const numericValue = Number(reading.value);
                      const sensor = sensors.find(s => s.id === reading.sensor_id);
                      return (
                        <div className={`reading-card ${status}`} key={reading.sensor_id}>
                          <div>
                            <h3>{reading.sensor_code}</h3>
                            <span>
                              {reading.sensor_type} · {sensor?.unit || ""}
                              <SensorStatusBadge status={status} />
                            </span>
                          </div>
                          <div className="reading-value">
                            <strong
                              key={`rv-${reading.sensor_id}-${tick}`}
                              style={{
                                color: status === "critical" ? "#dc2626" : status === "warning" ? "#d97706" : "#059669"
                              }}
                            >
                              {numericValue.toFixed(1)}
                            </strong>
                            <span>{sensor?.unit || "bar"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Alerts Panel */}
            <div className="panel">
              <h2>🚨 Active Alerts</h2>

              <div className="alert-summary">
                <div className="alert-summary-card critical">
                  <span>Critical</span>
                  <strong key={`ca-${tick}`}>{criticalAlerts}</strong>
                </div>
                <div className="alert-summary-card warning">
                  <span>Warning</span>
                  <strong key={`wa-${tick}`}>{warningAlerts}</strong>
                </div>
              </div>

              {alerts.length === 0 ? (
                <div className="no-alerts">✓ No active alerts</div>
              ) : (
                <div className="alert-list">
                  {alerts.slice(0, 8).map(alert => (
                    <div className="alert-item" key={alert.id} style={{
                      borderLeftColor: alert.severity === "critical" ? "#dc2626" : "#d97706",
                    }}>
                      <div className="alert-top">
                        <span className={`alert-severity-badge ${alert.severity}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span>{alert.sensor_code}</span>
                      </div>
                      <p>{alert.message}</p>
                      <div className="alert-details">
                        Value: <strong>{Number(alert.detected_value).toFixed(2)}</strong>
                      </div>
                      <div className="alert-details">
                        Pipeline: <strong>{alert.pipeline_name}</strong>
                      </div>
                      <div className="alert-details">
                        At: <strong>{new Date(alert.detected_at).toLocaleTimeString("en-IN")}</strong>
                      </div>
                      <button
                        className="btn-resolve"
                        disabled={resolvingId === alert.id}
                        onClick={() => resolveAlert(alert.id)}
                      >
                        {resolvingId === alert.id ? "⏳ Resolving…" : "✓ Resolve Alert"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Pipeline Network ── */}
          <section className="panel">
            <h2>🔩 Pipeline Network</h2>
            {pipelines.length === 0 ? (
              <div className="no-alerts">No pipelines found.</div>
            ) : (
              <div className="pipeline-list">
                {pipelines.map(pipeline => (
                  <div className="pipeline-card" key={pipeline.id}>
                    <div className="pipeline-header">
                      <div>
                        <h3>{pipeline.name}</h3>
                        <span className="pipeline-code">{pipeline.code}</span>
                      </div>
                      <PipelineStatusBadge status={pipeline.status} />
                    </div>
                    <p>{pipeline.description}</p>
                    <div className="pipeline-details">
                      <div>
                        <span>Location</span>
                        <strong>{pipeline.location}</strong>
                      </div>
                      <div>
                        <span>Length</span>
                        <strong>{pipeline.length_km} km</strong>
                      </div>
                      <div>
                        <span>Design Pressure</span>
                        <strong>{pipeline.design_pressure_bar} bar</strong>
                      </div>
                      <div>
                        <span>Operating Pressure</span>
                        <strong>{pipeline.operating_pressure_bar} bar</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Pipeline Segments ── */}
          <section className="panel">
            <h2>🗺️ Pipeline Segments</h2>
            {segments.length === 0 ? (
              <div className="no-alerts">No pipeline segments found.</div>
            ) : (
              <div className="pipeline-list">
                {segments.map(segment => (
                  <div className="pipeline-card" key={segment.id}>
                    <div className="pipeline-header">
                      <div>
                        <h3>{segment.name}</h3>
                        <span className="pipeline-code">{segment.segment_code}</span>
                      </div>
                      <PipelineStatusBadge status={segment.status} />
                    </div>
                    <p>
                      <strong>{segment.pipeline_name}</strong>
                      {" · "}
                      <span style={{ color: "#2563eb" }}>{segment.pipeline_code}</span>
                    </p>
                    <div className="pipeline-details">
                      <div><span>Start</span><strong>{segment.start_location}</strong></div>
                      <div><span>End</span><strong>{segment.end_location}</strong></div>
                      <div><span>Length</span><strong>{segment.length_km} km</strong></div>
                      <div><span>Max Pressure</span><strong>{segment.max_pressure_bar} bar</strong></div>
                    </div>

                    {sensors.filter(s => s.segment_id === segment.id).length > 0 && (
                      <div className="segment-sensors">
                        <h4>Attached Sensors</h4>
                        {sensors.filter(s => s.segment_id === segment.id).map(sensor => {
                          const latest = latestReadings.find(r => r.sensor_id === sensor.id);
                          const st = latest ? getSensorStatus(latest, sensors) : "normal";
                          return (
                            <div className="sensor-item" key={sensor.id}>
                              <div>
                                <strong>{sensor.sensor_code}</strong>
                                <span>{sensor.sensor_type} · {sensor.unit}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {latest && (
                                  <span style={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 700, fontSize: "0.82rem",
                                    color: st === "critical" ? "#dc2626" : st === "warning" ? "#d97706" : "#059669",
                                  }}>
                                    {Number(latest.value).toFixed(1)} {sensor.unit}
                                  </span>
                                )}
                                <span className={`pipeline-status ${sensor.status.toLowerCase()}`}>{sensor.status}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Maintenance Tasks ── */}
          <section className="panel">
            <h2>🛠️ Upcoming Maintenance</h2>
            {maintenanceTasks.length === 0 ? (
              <div className="no-alerts">✓ No maintenance tasks scheduled</div>
            ) : (
              <div className="maintenance-list">
                {maintenanceTasks.slice(0, 5).map(task => (
                  <div className="maintenance-card" key={task.id}>
                    <div className="maintenance-header">
                      <div>
                        <h3>{task.title}</h3>
                        <span className="pipeline-code">
                          {task.pipeline_name}{task.segment_name ? ` · ${task.segment_name}` : ""}
                        </span>
                      </div>
                      <span className={`maintenance-priority ${task.priority}`}>{task.priority}</span>
                    </div>
                    {task.description && <p>{task.description}</p>}
                    <div className="maintenance-details">
                      <div>
                        <span>Scheduled Date</span>
                        <strong>{new Date(task.scheduled_date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</strong>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong>{task.status}</strong>
                      </div>
                      {task.assigned_to && (
                        <div>
                          <span>Assigned To</span>
                          <strong>{task.assigned_to}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Compliance Reports ── */}
          <section className="panel">
            <h2>📋 Compliance Reports</h2>

            <div className="compliance-form">
              <div>
                <label htmlFor="compliance-pipeline">Pipeline</label>
                <select
                  id="compliance-pipeline"
                  value={compliancePipelineId}
                  onChange={e => setCompliancePipelineId(e.target.value)}
                >
                  <option value="">Select pipeline…</option>
                  {pipelines.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="compliance-start">Start Date</label>
                <input
                  id="compliance-start"
                  type="date"
                  value={complianceStartDate}
                  onChange={e => setComplianceStartDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="compliance-end">End Date</label>
                <input
                  id="compliance-end"
                  type="date"
                  value={complianceEndDate}
                  onChange={e => setComplianceEndDate(e.target.value)}
                />
              </div>
              <button type="button" onClick={generateComplianceReport} disabled={generatingCompliance}>
                {generatingCompliance ? "⏳ Generating…" : "Generate Report"}
              </button>
            </div>

            {complianceReports.length === 0 ? (
              <div className="no-alerts">No compliance reports generated yet.</div>
            ) : (
              <div className="compliance-list">
                {complianceReports.map(report => (
                  <div className="compliance-card" key={report.id}>
                    <div className="compliance-header">
                      <div>
                        <h3>{report.report_type.replace(/_/g, " ")}</h3>
                        <span>{report.pipeline_name} ({report.pipeline_code})</span>
                      </div>
                      <span className={`compliance-status ${report.status}`}>{report.status}</span>
                    </div>
                    <div className="compliance-details">
                      <div>
                        <span>Reporting Period</span>
                        <strong>
                          {new Date(report.reporting_period_start).toLocaleDateString("en-IN")}
                          {" – "}
                          {new Date(report.reporting_period_end).toLocaleDateString("en-IN")}
                        </strong>
                      </div>
                      <div>
                        <span>Generated At</span>
                        <strong>
                          {report.generated_at
                            ? new Date(report.generated_at).toLocaleString("en-IN")
                            : "Pending"}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </main>
      )}
    </div>
  );
}

export default App;