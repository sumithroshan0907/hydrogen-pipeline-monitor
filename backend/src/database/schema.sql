-- ============================================
-- HYDROGEN PIPELINE MONITORING SYSTEM
-- PostgreSQL Database Schema
-- ============================================

-- -----------------------------
-- USERS
-- -----------------------------

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'operator',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- -----------------------------
-- PIPELINES
-- -----------------------------

CREATE TABLE pipelines (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    location VARCHAR(255),
    length_km NUMERIC(10, 2),
    design_pressure_bar NUMERIC(10, 2),
    operating_pressure_bar NUMERIC(10, 2),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- -----------------------------
-- PIPELINE SEGMENTS
-- -----------------------------

CREATE TABLE pipeline_segments (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id BIGINT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    segment_code VARCHAR(50) UNIQUE NOT NULL,
    start_location VARCHAR(255),
    end_location VARCHAR(255),
    length_km NUMERIC(10, 2),
    max_pressure_bar NUMERIC(10, 2),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- -----------------------------
-- SENSORS
-- -----------------------------

CREATE TABLE sensors (
    id BIGSERIAL PRIMARY KEY,
    segment_id BIGINT NOT NULL REFERENCES pipeline_segments(id) ON DELETE CASCADE,
    sensor_code VARCHAR(100) UNIQUE NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    unit VARCHAR(30),
    location_description VARCHAR(255),
    min_safe_value NUMERIC(12, 4),
    max_safe_value NUMERIC(12, 4),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    installed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- -----------------------------
-- SENSOR READINGS
-- -----------------------------

CREATE TABLE sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    sensor_id BIGINT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    value NUMERIC(14, 4) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    quality VARCHAR(30) NOT NULL DEFAULT 'good'
);


-- -----------------------------
-- LEAK ALERTS
-- -----------------------------

CREATE TABLE leak_alerts (
    id BIGSERIAL PRIMARY KEY,
    sensor_id BIGINT REFERENCES sensors(id) ON DELETE SET NULL,
    pipeline_id BIGINT REFERENCES pipelines(id) ON DELETE SET NULL,
    severity VARCHAR(30) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    detected_value NUMERIC(14, 4),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'open'
);


-- -----------------------------
-- MAINTENANCE TASKS
-- -----------------------------

CREATE TABLE maintenance_tasks (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id BIGINT REFERENCES pipelines(id) ON DELETE CASCADE,
    segment_id BIGINT REFERENCES pipeline_segments(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(30) NOT NULL DEFAULT 'medium',
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- -----------------------------
-- COMPLIANCE REPORTS
-- -----------------------------

CREATE TABLE compliance_reports (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id BIGINT REFERENCES pipelines(id) ON DELETE CASCADE,
    report_type VARCHAR(100) NOT NULL,
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    generated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ,
    file_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_pipeline_segments_pipeline
ON pipeline_segments(pipeline_id);

CREATE INDEX idx_sensors_segment
ON sensors(segment_id);

CREATE INDEX idx_sensor_readings_sensor
ON sensor_readings(sensor_id);

CREATE INDEX idx_sensor_readings_recorded_at
ON sensor_readings(recorded_at);

CREATE INDEX idx_leak_alerts_pipeline
ON leak_alerts(pipeline_id);

CREATE INDEX idx_leak_alerts_status
ON leak_alerts(status);

CREATE INDEX idx_leak_alerts_detected_at
ON leak_alerts(detected_at);

CREATE INDEX idx_maintenance_pipeline
ON maintenance_tasks(pipeline_id);

CREATE INDEX idx_maintenance_status
ON maintenance_tasks(status);

CREATE INDEX idx_compliance_pipeline
ON compliance_reports(pipeline_id);