import { useEffect, useState } from "react";
import "./App.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
function App() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [segments, setSegments] = useState<PipelineSegment[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<any[]>([]);
  const [complianceReports, setComplianceReports] =
    useState<ComplianceReport[]>([]);
  const [compliancePipelineId, setCompliancePipelineId] = useState("");
  const [complianceStartDate, setComplianceStartDate] = useState("");
  const [complianceEndDate, setComplianceEndDate] = useState("");
  const [generatingCompliance, setGeneratingCompliance] = useState(false);
  const latestReadings = Object.values(
    readings.reduce<Record<string, SensorReading>>((latest, reading) => {
      const existing = latest[reading.sensor_id];

      if (
        !existing ||
        new Date(reading.recorded_at) > new Date(existing.recorded_at)
      ) {
        latest[reading.sensor_id] = reading;
      }

      return latest;
    }, {})
  );

  const normalSensors = latestReadings.filter((reading) => {
    const value = Number(reading.value);
    return value >= 50 && value <= 90;
  }).length;

  const warningSensors = latestReadings.filter((reading) => {
    const value = Number(reading.value);
    return value < 50;
  }).length;

  const criticalSensors = latestReadings.filter((reading) => {
    const value = Number(reading.value);
    return value > 90;
  }).length;
  const chartData = [...readings]
    .slice(0, 10)
    .reverse()
    .map((reading) => ({
      time: new Date(reading.recorded_at).toLocaleTimeString(),
      value: Number(reading.value),
    }));
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const criticalAlerts = alerts.filter(
    (alert) => alert.severity === "critical"
  ).length;

  const warningAlerts = alerts.filter(
    (alert) => alert.severity === "warning"
  ).length;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadDashboard = async () => {
    try {
      setError("");

      const [
        summaryResponse,
        pipelinesResponse,
        segmentsResponse,
        sensorsResponse,
        readingsResponse,
        alertsResponse,
        maintenanceResponse,
        complianceResponse,
      ] = await Promise.all([
        fetch("http://localhost:5000/api/dashboard/summary"),
        fetch("http://localhost:5000/api/pipelines"),
        fetch("http://localhost:5000/api/pipeline-segments"),
        fetch("http://localhost:5000/api/sensors"),
        fetch("http://localhost:5000/api/sensor-readings"),
        fetch("http://localhost:5000/api/alerts"),
        fetch("http://localhost:5000/api/maintenance"),
        fetch("http://localhost:5000/api/compliance"),
      ]);

      if (
        !summaryResponse.ok ||
        !pipelinesResponse.ok ||
        !segmentsResponse.ok ||
        !sensorsResponse.ok ||
        !maintenanceResponse.ok ||
        !readingsResponse.ok ||
        !alertsResponse.ok ||
        !complianceResponse.ok
      ) {
        throw new Error("Failed to load dashboard data");
      }

      const summaryData = await summaryResponse.json();
      const pipelinesData = await pipelinesResponse.json();
      const segmentsData = await segmentsResponse.json();
      const sensorsData = await sensorsResponse.json();
      const readingsData = await readingsResponse.json();
      const alertsData = await alertsResponse.json();
      const maintenanceData = await maintenanceResponse.json();
      const complianceData = await complianceResponse.json();

      setSummary(summaryData);
      setPipelines(pipelinesData);
      setSegments(segmentsData);
      setSensors(sensorsData);
      setReadings(readingsData);
      setAlerts(alertsData);
      setMaintenanceTasks(maintenanceData);
      setComplianceReports(complianceData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading dashboard:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };
  const generateComplianceReport = async () => {
    if (
      !compliancePipelineId ||
      !complianceStartDate ||
      !complianceEndDate
    ) {
      window.alert("Please select a pipeline and reporting period.");
      return;
    }

    if (complianceStartDate > complianceEndDate) {
      window.alert("Start date cannot be after end date.");
      return;
    }

    try {
      setGeneratingCompliance(true);

      const response = await fetch(
        "http://localhost:5000/api/compliance",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pipeline_id: Number(compliancePipelineId),
            report_type: "pressure_compliance",
            reporting_period_start: complianceStartDate,
            reporting_period_end: complianceEndDate,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to generate compliance report"
        );
      }

      window.alert("Compliance report generated successfully.");

      setCompliancePipelineId("");
      setComplianceStartDate("");
      setComplianceEndDate("");

      await loadDashboard();
    } catch (error) {
      console.error("Error generating compliance report:", error);
      window.alert("Failed to generate compliance report.");
    } finally {
      setGeneratingCompliance(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const interval = setInterval(() => {
      loadDashboard();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="app">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="app error">{error}</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Hydrogen Pipeline Monitor</h1>
          <p>Real-time pipeline monitoring dashboard</p>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          <span>API Online</span>

          {lastUpdated && (
            <span className="last-updated">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      <main>
        <section className="cards">
          <div className="card">
            <span className="card-label">Total Pipelines</span>
            <strong>{summary?.total_pipelines ?? 0}</strong>
          </div>

          <div className="card">
            <span className="card-label">Total Sensors</span>
            <strong>{summary?.total_sensors ?? 0}</strong>
          </div>

          <div className="card">
            <span className="card-label">Readings (24h)</span>
            <strong>{summary?.readings_last_24_hours ?? 0}</strong>
          </div>

          <div className="card alert-card">
            <span className="card-label">Open Alerts</span>
            <strong>{summary?.open_alerts ?? 0}</strong>
          </div>
        </section>

        <section className="panel">
          <h2>System Overview</h2>

          {/* existing overview content */}
        </section>

        <section className="panel">
          <h2>Sensor Health</h2>

          <div className="sensor-health">
            <div className="health-card normal">
              <span>Normal</span>
              <strong>{normalSensors}</strong>
            </div>

            <div className="health-card warning">
              <span>Warning</span>
              <strong>{warningSensors}</strong>
            </div>

            <div className="health-card critical">
              <span>Critical</span>
              <strong>{criticalSensors}</strong>
            </div>
          </div>
        </section>
        <section className="panel">
          <h2>Pipelines</h2>

          {pipelines.length === 0 ? (
            <p>No pipelines found.</p>
          ) : (
            <div className="pipeline-list">
              {pipelines.map((pipeline) => (
                <div className="pipeline-card" key={pipeline.id}>
                  <div className="pipeline-header">
                    <div>
                      <h3>{pipeline.name}</h3>
                      <span className="pipeline-code">
                        {pipeline.code}
                      </span>
                    </div>

                    <span
                      className={`pipeline-status ${pipeline.status}`}
                    >
                      {pipeline.status}
                    </span>
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
                      <strong>
                        {pipeline.design_pressure_bar} bar
                      </strong>
                    </div>

                    <div>
                      <span>Operating Pressure</span>
                      <strong>
                        {pipeline.operating_pressure_bar} bar
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <h2>Pipeline Segments</h2>

          {segments.length === 0 ? (
            <p>No pipeline segments found.</p>
          ) : (
            <div className="pipeline-list">
              {segments.map((segment) => (
                <div className="pipeline-card" key={segment.id}>
                  <div className="pipeline-header">
                    <div>
                      <h3>{segment.name}</h3>

                      <span className="pipeline-code">
                        {segment.segment_code}
                      </span>
                    </div>

                    <span
                      className={`pipeline-status ${segment.status}`}
                    >
                      {segment.status}
                    </span>
                  </div>

                  <p>
                    {segment.pipeline_name} · {segment.pipeline_code}
                  </p>

                  <div className="pipeline-details">
                    <div>
                      <span>Start</span>
                      <strong>{segment.start_location}</strong>
                    </div>

                    <div>
                      <span>End</span>
                      <strong>{segment.end_location}</strong>
                    </div>

                    <div>
                      <span>Length</span>
                      <strong>{segment.length_km} km</strong>
                    </div>

                    <div>
                      <span>Max Pressure</span>
                      <strong>{segment.max_pressure_bar} bar</strong>
                    </div>
                  </div>
                  <div className="segment-sensors">
                    <h4>Sensors</h4>

                    {sensors.filter(
                      (sensor) => sensor.segment_id === segment.id
                    ).map((sensor) => (
                      <div className="sensor-item" key={sensor.id}>
                        <div>
                          <strong>{sensor.sensor_code}</strong>
                          <span>
                            {sensor.sensor_type} · {sensor.unit}
                          </span>
                        </div>

                        <span className="pipeline-status active">
                          {sensor.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <h2>Upcoming Maintenance</h2>

          {maintenanceTasks.length === 0 ? (
            <div className="no-alerts">
              ✓ No maintenance tasks scheduled
            </div>
          ) : (
            <div className="maintenance-list">
              {maintenanceTasks.slice(0, 5).map((task) => (
                <div className="maintenance-card" key={task.id}>
                  <div className="maintenance-header">
                    <div>
                      <h3>{task.title}</h3>

                      <span className="pipeline-code">
                        {task.pipeline_name}
                        {task.segment_name && ` · ${task.segment_name}`}
                      </span>
                    </div>

                    <span className={`maintenance-priority ${task.priority}`}>
                      {task.priority}
                    </span>
                  </div>

                  {task.description && (
                    <p>{task.description}</p>
                  )}

                  <div className="maintenance-details">
                    <div>
                      <span>Scheduled Date</span>
                      <strong>
                        {new Date(task.scheduled_date).toLocaleDateString()}
                      </strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong>{task.status}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <h2>Compliance Reports</h2>

          <div className="compliance-form">
            <div>
              <label htmlFor="compliance-pipeline">Pipeline</label>
              <select
                id="compliance-pipeline"
                value={compliancePipelineId}
                onChange={(e) =>
                  setCompliancePipelineId(e.target.value)
                }
              >
                <option value="">Select pipeline</option>
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name} ({pipeline.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="compliance-start">Start Date</label>
              <input
                id="compliance-start"
                type="date"
                value={complianceStartDate}
                onChange={(e) =>
                  setComplianceStartDate(e.target.value)
                }
              />
            </div>

            <div>
              <label htmlFor="compliance-end">End Date</label>
              <input
                id="compliance-end"
                type="date"
                value={complianceEndDate}
                onChange={(e) =>
                  setComplianceEndDate(e.target.value)
                }
              />
            </div>

            <button
              type="button"
              onClick={generateComplianceReport}
              disabled={generatingCompliance}
            >
              {generatingCompliance
                ? "Generating..."
                : "Generate Compliance Report"}
            </button>
          </div>

          {complianceReports.length === 0 ? (
            <div className="no-alerts">
              No compliance reports generated yet.
            </div>
          ) : (
            <div className="compliance-list">
              {complianceReports.map((report) => (
                <div className="compliance-card" key={report.id}>
                  <div className="compliance-header">
                    <div>
                      <h3>{report.report_type}</h3>
                      <span>
                        {report.pipeline_name} ({report.pipeline_code})
                      </span>
                    </div>

                    <strong
                      className={`compliance-status ${report.status}`}
                    >
                      {report.status}
                    </strong>
                  </div>

                  <div className="compliance-details">
                    <div>
                      <span>Reporting Period</span>
                      <strong>
                        {new Date(
                          report.reporting_period_start
                        ).toLocaleDateString()}{" "}
                        –{" "}
                        {new Date(
                          report.reporting_period_end
                        ).toLocaleDateString()}
                      </strong>
                    </div>

                    <div>
                      <span>Generated</span>
                      <strong>
                        {report.generated_at
                          ? new Date(
                            report.generated_at
                          ).toLocaleString()
                          : "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="monitor-grid">
          <div className="panel">
            <section className="panel pressure-chart">
              <h2>Pressure Trend</h2>

              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Pressure"
                      stroke="#1f77b4"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
            <h2>Live Sensor Readings</h2>

            {readings.length === 0 ? (
              <p>No sensor readings found.</p>
            ) : (
              <div className="reading-list">
                {readings.slice(0, 5).map((reading) => {
                  const numericValue = Number(reading.value);

                  const sensorStatus =
                    numericValue > 90
                      ? "CRITICAL"
                      : numericValue < 50
                        ? "WARNING"
                        : "NORMAL";

                  return (
                    <div
                      className={`reading-card ${sensorStatus.toLowerCase()}`}
                      key={reading.id}
                    >
                      <div>
                        <h3>{reading.sensor_code}</h3>
                        <span>
                          {reading.sensor_type} · {reading.quality}
                        </span>

                        <span className={`sensor-status ${sensorStatus.toLowerCase()}`}>
                          {sensorStatus}
                        </span>
                      </div>

                      <div className="reading-value">
                        <strong>{reading.value}</strong>
                        <span>bar</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="alert-summary">
              <div className="alert-summary-card critical">
                <span>Critical</span>
                <strong>{criticalAlerts}</strong>
              </div>

              <div className="alert-summary-card warning">
                <span>Warning</span>
                <strong>{warningAlerts}</strong>
              </div>
            </div>
            <h2>Active Alerts</h2>

            {alerts.length === 0 ? (
              <div className="no-alerts">
                ✓ No active alerts
              </div>
            ) : (
              <div className="alert-list">
                {alerts.slice(0, 5).map((alert) => (
                  <div className="alert-item" key={alert.id}>
                    <div className="alert-top">
                      <strong>{alert.severity.toUpperCase()}</strong>
                      <span>{alert.sensor_code}</span>
                    </div>

                    <p>{alert.message}</p>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(
                            `http://localhost:5000/api/alerts/${alert.id}/resolve`,
                            {
                              method: "PATCH",
                            }
                          );

                          if (!response.ok) {
                            throw new Error("Failed to resolve alert");
                          }

                          // Refresh the dashboard immediately
                          window.location.reload();
                        } catch (error) {
                          console.error("Error resolving alert:", error);
                          window.alert("Failed to resolve alert");
                        }
                      }}
                    >
                      Resolve Alert
                    </button>

                    <div className="alert-details">
                      Detected value:{" "}
                      <strong>{alert.detected_value} bar</strong>
                    </div>

                    <div className="alert-details">
                      Pipeline: <strong>{alert.pipeline_name}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;