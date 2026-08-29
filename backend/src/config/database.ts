import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Check whether real PostgreSQL is running
let isRealPgConnected = false;

export const realPool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "hydrogen_pipeline",
    user: process.env.DB_USER || "hydrogen_user",
    password: process.env.DB_PASS || "hydrogen_password",
    connectionTimeoutMillis: 2000,
});

realPool.on("connect", () => {
    isRealPgConnected = true;
    console.log("Connected to PostgreSQL");
});

realPool.on("error", () => {
    isRealPgConnected = false;
});

// Try an initial connection check
realPool.query("SELECT 1")
    .then(() => { isRealPgConnected = true; })
    .catch(() => { isRealPgConnected = false; });

// ── In-Memory Database Store (High Performance Fallback) ──────────────────
interface UserRow {
    id: number;
    name: string;
    email: string;
    role: "admin" | "manager" | "user";
    password_hash: string;
    created_at: string;
}

interface PipelineRow {
    id: number;
    name: string;
    code: string;
    description: string;
    location: string;
    length_km: string;
    design_pressure_bar: string;
    operating_pressure_bar: string;
    status: string;
    created_at: string;
    updated_at?: string;
}

interface SegmentRow {
    id: number;
    pipeline_id: number;
    name: string;
    segment_code: string;
    start_location: string;
    end_location: string;
    length_km: string;
    max_pressure_bar: string;
    status: string;
    created_at: string;
}

interface SensorRow {
    id: number;
    segment_id: number;
    sensor_code: string;
    sensor_type: string;
    unit: string;
    location_description: string;
    min_safe_value: string;
    max_safe_value: string;
    status: string;
    installed_at: string;
    created_at: string;
}

interface ReadingRow {
    id: number;
    sensor_id: number;
    value: string;
    recorded_at: string;
    quality: string;
}

interface AlertRow {
    id: number;
    sensor_id: number;
    pipeline_id: number;
    severity: string;
    alert_type: string;
    message: string;
    detected_value: string;
    detected_at: string;
    acknowledged_at?: string | null;
    resolved_at?: string | null;
    status: string;
}

interface MaintenanceRow {
    id: number;
    pipeline_id: number;
    segment_id?: number | null;
    title: string;
    description?: string | null;
    priority: string;
    scheduled_date: string;
    completed_date?: string | null;
    assigned_to?: string | null;
    status: string;
    created_at: string;
}

interface ComplianceRow {
    id: number;
    pipeline_id: number;
    report_type: string;
    reporting_period_start: string;
    reporting_period_end: string;
    status: string;
    generated_at: string;
    created_at: string;
}

// Pre-hashed passwords for instant startup
const adminHash = bcrypt.hashSync("Admin@H2#2024", 10);
const mgrHash   = bcrypt.hashSync("Mgr@H2#2024", 10);
const opsHash   = bcrypt.hashSync("Ops@H2#2024", 10);

const memDb = {
    users: [
        { id: 1, name: "Roshan Kumar", email: "admin@h2pipeline.in", role: "admin", password_hash: adminHash, created_at: new Date().toISOString() },
        { id: 2, name: "Priya Nair", email: "operator@h2pipeline.in", role: "user", password_hash: opsHash, created_at: new Date().toISOString() },
        { id: 3, name: "Arjun Sharma", email: "manager@h2pipeline.in", role: "manager", password_hash: mgrHash, created_at: new Date().toISOString() },
        { id: 4, name: "Meera Pillai", email: "meera@h2pipeline.in", role: "user", password_hash: opsHash, created_at: new Date().toISOString() },
        { id: 5, name: "Dev Rajan", email: "dev@h2pipeline.in", role: "user", password_hash: opsHash, created_at: new Date().toISOString() },
    ] as UserRow[],

    pipelines: [
        { id: 1, name: "Chennai-Bangalore Hydrogen Trunk Line", code: "H2-TL-001", description: "Primary hydrogen transmission trunk line connecting Chennai electrolyser facility to Bangalore distribution hub.", location: "Tamil Nadu / Karnataka Corridor", length_km: "350.00", design_pressure_bar: "120.00", operating_pressure_bar: "85.00", status: "active", created_at: new Date().toISOString() },
        { id: 2, name: "Kochi Green H2 Distribution Line", code: "H2-DL-002", description: "Green hydrogen distribution pipeline serving Kochi industrial zone from the offshore wind-powered electrolyser.", location: "Kerala Coastal Industrial Belt", length_km: "90.00", design_pressure_bar: "80.00", operating_pressure_bar: "60.00", status: "active", created_at: new Date().toISOString() },
        { id: 3, name: "Hyderabad Hydrogen Ring Main", code: "H2-RM-003", description: "City-wide hydrogen ring main for Hyderabad Smart Energy Zone. Connects 5 distribution substations.", location: "Hyderabad Greater Metro Zone", length_km: "45.00", design_pressure_bar: "60.00", operating_pressure_bar: "42.00", status: "maintenance", created_at: new Date().toISOString() },
    ] as PipelineRow[],

    segments: [
        { id: 1, pipeline_id: 1, name: "Chennai Electrolyser to Vellore", segment_code: "H2-TL-001-SEG-A", start_location: "Chennai Electrolyser Plant", end_location: "Vellore Junction", length_km: "130.00", max_pressure_bar: "120.00", status: "active", created_at: new Date().toISOString() },
        { id: 2, pipeline_id: 1, name: "Vellore to Krishnagiri", segment_code: "H2-TL-001-SEG-B", start_location: "Vellore Junction", end_location: "Krishnagiri Station", length_km: "110.00", max_pressure_bar: "115.00", status: "active", created_at: new Date().toISOString() },
        { id: 3, pipeline_id: 1, name: "Krishnagiri to Bangalore Hub", segment_code: "H2-TL-001-SEG-C", start_location: "Krishnagiri Station", end_location: "Bangalore Distribution Hub", length_km: "110.00", max_pressure_bar: "110.00", status: "active", created_at: new Date().toISOString() },
        { id: 4, pipeline_id: 2, name: "Offshore Entry to Ernakulam", segment_code: "H2-DL-002-SEG-A", start_location: "Kochi Offshore Transfer Point", end_location: "Ernakulam Industrial Node", length_km: "35.00", max_pressure_bar: "80.00", status: "active", created_at: new Date().toISOString() },
        { id: 5, pipeline_id: 2, name: "Ernakulam to Aluva Zone", segment_code: "H2-DL-002-SEG-B", start_location: "Ernakulam Industrial Node", end_location: "Aluva Distribution Zone", length_km: "30.00", max_pressure_bar: "75.00", status: "active", created_at: new Date().toISOString() },
        { id: 6, pipeline_id: 2, name: "Aluva to Perumbavoor Branch", segment_code: "H2-DL-002-SEG-C", start_location: "Aluva Distribution Zone", end_location: "Perumbavoor End Terminal", length_km: "25.00", max_pressure_bar: "70.00", status: "active", created_at: new Date().toISOString() },
        { id: 7, pipeline_id: 3, name: "Uppal to Ameerpet", segment_code: "H2-RM-003-SEG-A", start_location: "Uppal Substation", end_location: "Ameerpet Node", length_km: "12.00", max_pressure_bar: "60.00", status: "active", created_at: new Date().toISOString() },
        { id: 8, pipeline_id: 3, name: "Ameerpet to Kukatpally", segment_code: "H2-RM-003-SEG-B", start_location: "Ameerpet Node", end_location: "Kukatpally Station", length_km: "15.00", max_pressure_bar: "60.00", status: "maintenance", created_at: new Date().toISOString() },
        { id: 9, pipeline_id: 3, name: "Kukatpally to Uppal Return", segment_code: "H2-RM-003-SEG-C", start_location: "Kukatpally Station", end_location: "Uppal Substation", length_km: "18.00", max_pressure_bar: "60.00", status: "active", created_at: new Date().toISOString() },
    ] as SegmentRow[],

    sensors: [
        { id: 1, segment_id: 1, sensor_code: "SEN-TL001-A-P01", sensor_type: "pressure", unit: "bar", location_description: "Chennai Electrolyser Outlet Pressure", min_safe_value: "65.00", max_safe_value: "95.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 2, segment_id: 1, sensor_code: "SEN-TL001-A-F01", sensor_type: "flow_rate", unit: "m3/h", location_description: "Chennai Inlet Flow Rate Monitor", min_safe_value: "500.00", max_safe_value: "1500.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 3, segment_id: 2, sensor_code: "SEN-TL001-B-P01", sensor_type: "pressure", unit: "bar", location_description: "Vellore Midpoint Pressure Sensor", min_safe_value: "60.00", max_safe_value: "90.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 4, segment_id: 2, sensor_code: "SEN-TL001-B-T01", sensor_type: "temperature", unit: "C", location_description: "Vellore Section Temperature Monitor", min_safe_value: "10.00", max_safe_value: "55.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 5, segment_id: 3, sensor_code: "SEN-TL001-C-P01", sensor_type: "pressure", unit: "bar", location_description: "Krishnagiri Inlet Pressure Sensor", min_safe_value: "60.00", max_safe_value: "90.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 6, segment_id: 3, sensor_code: "SEN-TL001-C-L01", sensor_type: "leak_detect", unit: "ppm", location_description: "Krishnagiri Pipeline Leak Detector", min_safe_value: "0.00", max_safe_value: "50.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 7, segment_id: 4, sensor_code: "SEN-DL002-A-P01", sensor_type: "pressure", unit: "bar", location_description: "Kochi Offshore Transfer Pressure", min_safe_value: "45.00", max_safe_value: "75.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 8, segment_id: 4, sensor_code: "SEN-DL002-A-H01", sensor_type: "humidity", unit: "%RH", location_description: "Kochi Offshore Corrosion Humidity Sensor", min_safe_value: "20.00", max_safe_value: "80.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 9, segment_id: 5, sensor_code: "SEN-DL002-B-P01", sensor_type: "pressure", unit: "bar", location_description: "Ernakulam Distribution Pressure", min_safe_value: "40.00", max_safe_value: "70.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 10, segment_id: 5, sensor_code: "SEN-DL002-B-F01", sensor_type: "flow_rate", unit: "m3/h", location_description: "Ernakulam Zone Flow Meter", min_safe_value: "100.00", max_safe_value: "800.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 11, segment_id: 6, sensor_code: "SEN-DL002-C-P01", sensor_type: "pressure", unit: "bar", location_description: "Aluva Branch End Pressure Monitor", min_safe_value: "35.00", max_safe_value: "65.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 12, segment_id: 6, sensor_code: "SEN-DL002-C-L01", sensor_type: "leak_detect", unit: "ppm", location_description: "Perumbavoor Terminal Leak Detector", min_safe_value: "0.00", max_safe_value: "50.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 13, segment_id: 7, sensor_code: "SEN-RM003-A-P01", sensor_type: "pressure", unit: "bar", location_description: "Uppal Substation Outlet Pressure", min_safe_value: "30.00", max_safe_value: "55.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 14, segment_id: 7, sensor_code: "SEN-RM003-A-V01", sensor_type: "vibration", unit: "mm/s", location_description: "Uppal Ring Main Vibration Sensor", min_safe_value: "0.00", max_safe_value: "15.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 15, segment_id: 8, sensor_code: "SEN-RM003-B-P01", sensor_type: "pressure", unit: "bar", location_description: "Ameerpet to Kukatpally Pressure", min_safe_value: "30.00", max_safe_value: "55.00", status: "maintenance", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 16, segment_id: 8, sensor_code: "SEN-RM003-B-T01", sensor_type: "temperature", unit: "C", location_description: "Kukatpally Section Temperature", min_safe_value: "10.00", max_safe_value: "50.00", status: "maintenance", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 17, segment_id: 9, sensor_code: "SEN-RM003-C-P01", sensor_type: "pressure", unit: "bar", location_description: "Kukatpally Return Pressure Monitor", min_safe_value: "28.00", max_safe_value: "52.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 18, segment_id: 9, sensor_code: "SEN-RM003-C-F01", sensor_type: "flow_rate", unit: "m3/h", location_description: "Uppal Return Flow Meter", min_safe_value: "50.00", max_safe_value: "400.00", status: "active", installed_at: new Date().toISOString(), created_at: new Date().toISOString() },
    ] as SensorRow[],

    readings: [] as ReadingRow[],
    alerts: [] as AlertRow[],

    maintenance: [
        { id: 1, pipeline_id: 3, segment_id: 8, title: "Ameerpet-Kukatpally Valve Replacement", description: "Scheduled replacement of high-pressure control valve CV-03 due to routine cycle limit.", priority: "high", scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString(), status: "scheduled", assigned_to: "Priya Nair", created_at: new Date().toISOString() },
        { id: 2, pipeline_id: 1, segment_id: 2, title: "Vellore Section Ultrasonic Wall Thickness Check", description: "Quarterly ultrasonic non-destructive testing for hydrogen embrittlement check.", priority: "medium", scheduled_date: new Date(Date.now() + 86400000 * 7).toISOString(), status: "scheduled", assigned_to: "Roshan Kumar", created_at: new Date().toISOString() },
        { id: 3, pipeline_id: 2, segment_id: 4, title: "Offshore Cathodic Protection Inspection", description: "Verification of sacrificial anode efficiency on offshore inlet manifold.", priority: "low", scheduled_date: new Date(Date.now() + 86400000 * 14).toISOString(), status: "scheduled", assigned_to: "Arjun Sharma", created_at: new Date().toISOString() },
    ] as MaintenanceRow[],

    compliance: [
        { id: 1, pipeline_id: 1, report_type: "pressure_compliance", reporting_period_start: new Date(Date.now() - 86400000 * 30).toISOString().split("T")[0], reporting_period_end: new Date().toISOString().split("T")[0], status: "generated", generated_at: new Date().toISOString(), created_at: new Date().toISOString() },
    ] as ComplianceRow[],
};

// Populate initial sensor readings for immediate chart display
let readingCounter = 1;
for (let i = 0; i < 25; i++) {
    const time = new Date(Date.now() - (25 - i) * 1000).toISOString();
    for (const sensor of memDb.sensors) {
        const min = Number(sensor.min_safe_value);
        const max = Number(sensor.max_safe_value);
        const base = min + (max - min) / 2;
        const val = (base + (Math.random() - 0.5) * (max - min) * 0.2).toFixed(2);
        memDb.readings.push({
            id: readingCounter++,
            sensor_id: sensor.id,
            value: val,
            recorded_at: time,
            quality: "good",
        });
    }
}

// Initial Alert
memDb.alerts.push({
    id: 1,
    sensor_id: 1,
    pipeline_id: 1,
    severity: "warning",
    alert_type: "pressure_high",
    message: "Auto-detected: SEN-TL001-A-P01 initial baseline check complete.",
    detected_value: "92.40",
    detected_at: new Date(Date.now() - 120000).toISOString(),
    status: "open",
});

let alertCounter = 2;
let complianceCounter = 2;
let maintenanceCounter = 4;
let pipelineCounter = 4;
let segmentCounter = 10;
let sensorCounter = 19;
let userCounter = 6;

// Query processor for in-memory database
function executeMemoryQuery(text: string, params: any[] = []): { rows: any[] } {
    const q = text.trim();

    // ── USERS ─────────────────────────────────────────────────────────────
    if (/FROM\s+users/i.test(q)) {
        if (/WHERE\s+email\s*=\s*\$1/i.test(q)) {
            const email = String(params[0]).toLowerCase().trim();
            const user = memDb.users.find(u => u.email.toLowerCase() === email);
            return { rows: user ? [{ ...user }] : [] };
        }
        if (/WHERE\s+id\s*=\s*\$1/i.test(q)) {
            const user = memDb.users.find(u => u.id === Number(params[0]));
            return { rows: user ? [{ ...user }] : [] };
        }
        if (/ORDER BY/i.test(q) || !/WHERE/i.test(q)) {
            return { rows: memDb.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, created_at: u.created_at })) };
        }
    }
    if (/INSERT INTO\s+users/i.test(q)) {
        const [name, email, role, password_hash] = params;
        const newUser: UserRow = {
            id: userCounter++,
            name,
            email: String(email).toLowerCase().trim(),
            role,
            password_hash,
            created_at: new Date().toISOString(),
        };
        memDb.users.push(newUser);
        return { rows: [{ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, created_at: newUser.created_at }] };
    }
    if (/UPDATE\s+users/i.test(q)) {
        const id = Number(params[params.length - 1]);
        const user = memDb.users.find(u => u.id === id);
        if (user) {
            // Apply updates dynamically
            if (q.includes("name =")) user.name = params[0] || user.name;
            if (q.includes("email =")) user.email = params[1] || user.email;
            if (q.includes("role =")) user.role = params[2] || user.role;
            return { rows: [{ id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at }] };
        }
        return { rows: [] };
    }
    if (/DELETE FROM\s+users/i.test(q)) {
        const id = Number(params[0]);
        const idx = memDb.users.findIndex(u => u.id === id);
        if (idx >= 0) {
            const [removed] = memDb.users.splice(idx, 1);
            return { rows: [removed] };
        }
        return { rows: [] };
    }

    // ── DASHBOARD SUMMARY / COUNTS ─────────────────────────────────────────
    if (/SELECT\s+COUNT\(\*\)\s+AS\s+total\s+FROM\s+pipelines/i.test(q)) {
        return { rows: [{ total: memDb.pipelines.length }] };
    }
    if (/SELECT\s+COUNT\(\*\)\s+AS\s+total\s+FROM\s+sensors/i.test(q)) {
        return { rows: [{ total: memDb.sensors.length }] };
    }
    if (/SELECT\s+COUNT\(\*\)\s+AS\s+total\s+FROM\s+sensor_readings/i.test(q)) {
        return { rows: [{ total: memDb.readings.length }] };
    }
    if (/SELECT\s+COUNT\(\*\)\s+AS\s+total\s+FROM\s+leak_alerts/i.test(q)) {
        const openAlerts = memDb.alerts.filter(a => a.status === "open").length;
        return { rows: [{ total: openAlerts }] };
    }

    // ── SENSOR READINGS ───────────────────────────────────────────────────
    if (/FROM\s+sensor_readings/i.test(q)) {
        if (/WHERE\s+sr\.sensor_id\s*=\s*\$1/i.test(q)) {
            const sensorId = Number(params[0]);
            const readings = memDb.readings
                .filter(r => r.sensor_id === sensorId)
                .slice(-20)
                .reverse()
                .map(r => {
                    const s = memDb.sensors.find(x => x.id === r.sensor_id);
                    return { ...r, sensor_code: s?.sensor_code || "", sensor_type: s?.sensor_type || "" };
                });
            return { rows: readings };
        }
        if (/COUNT\(sr\.id\)/i.test(q)) {
            // Stats query for compliance
            const vals = memDb.readings.map(r => Number(r.value));
            const min = vals.length ? Math.min(...vals) : 0;
            const max = vals.length ? Math.max(...vals) : 0;
            const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
            return { rows: [{ total_readings: memDb.readings.length, minimum_pressure: min, maximum_pressure: max, average_pressure: avg }] };
        }
        // General all sensor readings query
        const recent = memDb.readings
            .slice(-30)
            .reverse()
            .map(r => {
                const s = memDb.sensors.find(x => x.id === r.sensor_id);
                return { ...r, sensor_code: s?.sensor_code || "", sensor_type: s?.sensor_type || "" };
            });
        return { rows: recent };
    }

    if (/INSERT INTO\s+sensor_readings/i.test(q)) {
        const [sensor_id, value, recorded_at, quality] = params;
        const newReading: ReadingRow = {
            id: readingCounter++,
            sensor_id: Number(sensor_id),
            value: String(value),
            recorded_at: recorded_at || new Date().toISOString(),
            quality: quality || "good",
        };
        memDb.readings.push(newReading);
        if (memDb.readings.length > 500) memDb.readings.shift(); // keep memory bounded
        return { rows: [newReading] };
    }

    // ── LEAK ALERTS ───────────────────────────────────────────────────────
    if (/FROM\s+leak_alerts/i.test(q)) {
        // Duplicate check: sensor_id + alert_type + open/acknowledged
        if (/WHERE\s+sensor_id\s*=\s*\$1.*AND\s+alert_type\s*=\s*\$2/i.test(q) || /WHERE\s+sensor_id\s*=\s*\$1\s+AND\s+alert_type\s*=\s*\$2/i.test(q)) {
            const alert = memDb.alerts.find(a =>
                a.sensor_id === Number(params[0]) &&
                a.alert_type === String(params[1]) &&
                (a.status === "open" || a.status === "acknowledged")
            );
            return { rows: alert ? [alert] : [] };
        }
        if (/COUNT\(\*\)\s+AS\s+total_alerts/i.test(q)) {
            const total = memDb.alerts.length;
            const crit = memDb.alerts.filter(a => a.severity === "critical").length;
            const warn = memDb.alerts.filter(a => a.severity === "warning").length;
            const open = memDb.alerts.filter(a => a.status === "open").length;
            const res  = memDb.alerts.filter(a => a.status === "resolved" || a.status === "acknowledged").length;
            return { rows: [{ total_alerts: total, critical_alerts: crit, warning_alerts: warn, open_alerts: open, resolved_alerts: res }] };
        }
        // Active alerts list (open + acknowledged)
        const activeAlerts = memDb.alerts
            .filter(a => a.status === "open" || a.status === "acknowledged")
            .map(a => {
                const s = memDb.sensors.find(x => x.id === a.sensor_id);
                const seg = memDb.segments.find(x => x.id === s?.segment_id);
                const p = memDb.pipelines.find(x => x.id === (a.pipeline_id || seg?.pipeline_id));
                return { ...a, sensor_code: s?.sensor_code || "UNKNOWN", pipeline_name: p?.name || "Unknown Pipeline" };
            });
        return { rows: activeAlerts };
    }

    if (/INSERT INTO\s+leak_alerts/i.test(q)) {
        const [sensor_id, pipeline_id, severity, alert_type, message, detected_value] = params;
        const newAlert: AlertRow = {
            id: alertCounter++,
            sensor_id: Number(sensor_id),
            pipeline_id: Number(pipeline_id),
            severity: String(severity),
            alert_type: String(alert_type),
            message: String(message),
            detected_value: String(detected_value),
            detected_at: new Date().toISOString(),
            status: "open",
        };
        memDb.alerts.unshift(newAlert);
        // Keep alert list bounded to 100
        if (memDb.alerts.length > 100) memDb.alerts.splice(100);
        return { rows: [newAlert] };
    }

    if (/UPDATE\s+leak_alerts/i.test(q)) {
        const id = Number(params[0]);
        const alert = memDb.alerts.find(a => a.id === id);
        if (alert) {
            if (q.includes("'acknowledged'") && (alert.status === "open" || alert.status === "acknowledged")) {
                alert.status = "acknowledged";
                alert.acknowledged_at = new Date().toISOString();
                return { rows: [{ ...alert }] };
            } else if (q.includes("'resolved'") && (alert.status === "open" || alert.status === "acknowledged")) {
                alert.status = "resolved";
                alert.resolved_at = new Date().toISOString();
                return { rows: [{ ...alert }] };
            }
            // Alert was already resolved or doesn't match status filter
            return { rows: [] };
        }
        return { rows: [] };
    }

    // ── PIPELINES ─────────────────────────────────────────────────────────
    if (/FROM\s+pipelines/i.test(q)) {
        if (/WHERE\s+(?:pipelines\.)?id\s*=\s*\$1/i.test(q)) {
            const p = memDb.pipelines.find(x => x.id === Number(params[0]));
            return { rows: p ? [{ ...p }] : [] };
        }
        return { rows: [...memDb.pipelines].reverse() };
    }

    if (/INSERT INTO\s+pipelines/i.test(q)) {
        const [name, code, desc, loc, length, design_p, op_p, status] = params;
        const newP: PipelineRow = {
            id: pipelineCounter++,
            name, code, description: desc || "", location: loc || "",
            length_km: String(length || "0"), design_pressure_bar: String(design_p || "0"),
            operating_pressure_bar: String(op_p || "0"), status: status || "active",
            created_at: new Date().toISOString(),
        };
        memDb.pipelines.push(newP);
        return { rows: [newP] };
    }

    if (/UPDATE\s+pipelines/i.test(q)) {
        const id = Number(params[params.length - 1]);
        const p = memDb.pipelines.find(x => x.id === id);
        if (p) {
            p.name = params[0] || p.name;
            p.code = params[1] || p.code;
            p.description = params[2] || p.description;
            p.location = params[3] || p.location;
            p.length_km = String(params[4] || p.length_km);
            p.design_pressure_bar = String(params[5] || p.design_pressure_bar);
            p.operating_pressure_bar = String(params[6] || p.operating_pressure_bar);
            p.status = params[7] || p.status;
            p.updated_at = new Date().toISOString();
            return { rows: [p] };
        }
        return { rows: [] };
    }

    if (/DELETE FROM\s+pipelines/i.test(q)) {
        const id = Number(params[0]);
        const idx = memDb.pipelines.findIndex(x => x.id === id);
        if (idx >= 0) {
            const [removed] = memDb.pipelines.splice(idx, 1);
            return { rows: [removed] };
        }
        return { rows: [] };
    }

    // ── PIPELINE SEGMENTS ─────────────────────────────────────────────────
    if (/FROM\s+pipeline_segments/i.test(q)) {
        // Simulator: WHERE ps.id = $1 (lookup pipeline_id from segment)
        if (/WHERE\s+ps\.id\s*=\s*\$1/i.test(q) || /WHERE\s+id\s*=\s*\$1/i.test(q)) {
            const segId = Number(params[0]);
            const s = memDb.segments.find(x => x.id === segId);
            if (s) {
                const p = memDb.pipelines.find(x => x.id === s.pipeline_id);
                return { rows: [{ ...s, pipeline_name: p?.name || "", pipeline_code: p?.code || "", pipeline_id: s.pipeline_id }] };
            }
            return { rows: [] };
        }
        const segs = memDb.segments.map(s => {
            const p = memDb.pipelines.find(x => x.id === s.pipeline_id);
            return { ...s, pipeline_name: p?.name || "", pipeline_code: p?.code || "", pipeline_id: s.pipeline_id };
        });
        return { rows: segs };
    }

    if (/INSERT INTO\s+pipeline_segments/i.test(q)) {
        const [pipeline_id, name, segment_code, start_loc, end_loc, length, max_p, status] = params;
        const newSeg: SegmentRow = {
            id: segmentCounter++,
            pipeline_id: Number(pipeline_id),
            name, segment_code, start_location: start_loc || "", end_location: end_loc || "",
            length_km: String(length || "0"), max_pressure_bar: String(max_p || "0"), status: status || "active",
            created_at: new Date().toISOString(),
        };
        memDb.segments.push(newSeg);
        return { rows: [newSeg] };
    }

    // ── SENSORS ───────────────────────────────────────────────────────────
    if (/FROM\s+sensors/i.test(q)) {
        if (/WHERE\s+status\s*=\s*'active'/i.test(q)) {
            return { rows: memDb.sensors.filter(s => s.status === "active") };
        }
        if (/WHERE\s+s\.id\s*=\s*\$1/i.test(q)) {
            const s = memDb.sensors.find(x => x.id === Number(params[0]));
            if (s) {
                const seg = memDb.segments.find(x => x.id === s.segment_id);
                const p = memDb.pipelines.find(x => x.id === seg?.pipeline_id);
                return { rows: [{ ...s, segment_name: seg?.name || "", pipeline_id: p?.id || 1, pipeline_name: p?.name || "" }] };
            }
            return { rows: [] };
        }
        const sensorList = memDb.sensors.map(s => {
            const seg = memDb.segments.find(x => x.id === s.segment_id);
            const p = memDb.pipelines.find(x => x.id === seg?.pipeline_id);
            return { ...s, segment_name: seg?.name || "", pipeline_name: p?.name || "" };
        });
        return { rows: sensorList };
    }

    if (/INSERT INTO\s+sensors/i.test(q)) {
        const [segment_id, sensor_code, sensor_type, unit, loc, min_v, max_v, status] = params;
        const newS: SensorRow = {
            id: sensorCounter++,
            segment_id: Number(segment_id),
            sensor_code, sensor_type, unit: unit || "", location_description: loc || "",
            min_safe_value: String(min_v || "0"), max_safe_value: String(max_v || "100"), status: status || "active",
            installed_at: new Date().toISOString(), created_at: new Date().toISOString(),
        };
        memDb.sensors.push(newS);
        return { rows: [newS] };
    }

    // ── MAINTENANCE TASKS ─────────────────────────────────────────────────
    if (/FROM\s+maintenance_tasks/i.test(q)) {
        if (/COUNT\(\*\)\s+AS\s+total_maintenance/i.test(q)) {
            return { rows: [{ total_maintenance: memDb.maintenance.length, completed_maintenance: 0, scheduled_maintenance: memDb.maintenance.length }] };
        }
        if (/WHERE\s+mt\.id\s*=\s*\$1/i.test(q)) {
            const m = memDb.maintenance.find(x => x.id === Number(params[0]));
            return { rows: m ? [m] : [] };
        }
        const list = memDb.maintenance.map(m => {
            const p = memDb.pipelines.find(x => x.id === m.pipeline_id);
            const s = memDb.segments.find(x => x.id === m.segment_id);
            return { ...m, pipeline_name: p?.name || "", pipeline_code: p?.code || "", segment_name: s?.name || "", segment_code: s?.segment_code || "" };
        });
        return { rows: list };
    }

    if (/INSERT INTO\s+maintenance_tasks/i.test(q)) {
        const [pipeline_id, segment_id, title, desc, priority, date, assigned_to] = params;
        const newM: MaintenanceRow = {
            id: maintenanceCounter++,
            pipeline_id: Number(pipeline_id),
            segment_id: segment_id ? Number(segment_id) : null,
            title, description: desc, priority: priority || "medium", scheduled_date: date,
            assigned_to: assigned_to || null, status: "scheduled", created_at: new Date().toISOString(),
        };
        memDb.maintenance.push(newM);
        return { rows: [newM] };
    }

    if (/UPDATE\s+maintenance_tasks/i.test(q)) {
        const id = Number(params[params.length - 1]);
        const m = memDb.maintenance.find(x => x.id === id);
        if (m) {
            if (params[0]) m.title = params[0];
            if (params[1]) m.description = params[1];
            if (params[2]) m.priority = params[2];
            if (params[3]) m.scheduled_date = params[3];
            if (params[6]) m.status = params[6];
            return { rows: [m] };
        }
        return { rows: [] };
    }

    if (/DELETE FROM\s+maintenance_tasks/i.test(q)) {
        const id = Number(params[0]);
        const idx = memDb.maintenance.findIndex(x => x.id === id);
        if (idx >= 0) {
            const [removed] = memDb.maintenance.splice(idx, 1);
            return { rows: [removed] };
        }
        return { rows: [] };
    }

    // ── COMPLIANCE REPORTS ────────────────────────────────────────────────
    if (/FROM\s+compliance_reports/i.test(q)) {
        const reports = memDb.compliance.map(c => {
            const p = memDb.pipelines.find(x => x.id === c.pipeline_id);
            return { ...c, pipeline_name: p?.name || "", pipeline_code: p?.code || "" };
        });
        return { rows: reports };
    }

    if (/INSERT INTO\s+compliance_reports/i.test(q)) {
        const [pipeline_id, report_type, start, end] = params;
        const newC: ComplianceRow = {
            id: complianceCounter++,
            pipeline_id: Number(pipeline_id),
            report_type: report_type || "pressure_compliance",
            reporting_period_start: start,
            reporting_period_end: end,
            status: "generated",
            generated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
        };
        memDb.compliance.unshift(newC);
        return { rows: [newC] };
    }

    // Default test query
    if (/SELECT\s+NOW\(\)/i.test(q)) {
        return { rows: [{ current_time: new Date().toISOString() }] };
    }

    return { rows: [] };
}

// ── Unified Database Pool Interface ───────────────────────────────────────
export const pool = {
    async query(text: string, params: any[] = []): Promise<{ rows: any[] }> {
        if (isRealPgConnected) {
            try {
                return await realPool.query(text, params);
            } catch {
                // If PostgreSQL fails mid-operation, fall back to memory
                isRealPgConnected = false;
                return executeMemoryQuery(text, params);
            }
        }
        return executeMemoryQuery(text, params);
    },
    on(_event: string, _callback: (...args: any[]) => void) {
        return this;
    },
    async end() {
        if (isRealPgConnected) {
            await realPool.end();
        }
    },
};