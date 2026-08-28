-- ============================================
-- HYDROGEN PIPELINE MONITORING SYSTEM
-- Seed Data: 3 Pipelines, 9 Segments, 18 Sensors, Readings, Alerts, Maintenance, Compliance
-- ============================================

-- Clear existing data (preserves schema)
TRUNCATE TABLE compliance_reports, maintenance_tasks, leak_alerts, sensor_readings, sensors, pipeline_segments, pipelines, users RESTART IDENTITY CASCADE;

-- ============================================
-- USERS (passwords set via set-passwords.js)
-- Admin@H2#2024 / Mgr@H2#2024 / Ops@H2#2024
-- ============================================
INSERT INTO users (name, email, role, password_hash) VALUES
  ('Roshan Kumar',   'admin@h2pipeline.in',    'admin',   '$2a$12$placeholder'),
  ('Priya Nair',     'operator@h2pipeline.in', 'user',    '$2a$12$placeholder'),
  ('Arjun Sharma',   'manager@h2pipeline.in',  'manager', '$2a$12$placeholder'),
  ('Meera Pillai',   'meera@h2pipeline.in',    'user',    '$2a$12$placeholder'),
  ('Dev Rajan',      'dev@h2pipeline.in',      'user',    '$2a$12$placeholder');

-- ============================================
-- PIPELINES
-- ============================================
INSERT INTO pipelines (name, code, description, location, length_km, design_pressure_bar, operating_pressure_bar, status) VALUES
  (
    'Chennai-Bangalore Hydrogen Trunk Line',
    'H2-TL-001',
    'Primary hydrogen transmission trunk line connecting Chennai electrolyser facility to Bangalore distribution hub.',
    'Tamil Nadu / Karnataka Corridor',
    350.00, 120.00, 85.00, 'active'
  ),
  (
    'Kochi Green H2 Distribution Line',
    'H2-DL-002',
    'Green hydrogen distribution pipeline serving Kochi industrial zone from the offshore wind-powered electrolyser.',
    'Kerala Coastal Industrial Belt',
    90.00, 80.00, 60.00, 'active'
  ),
  (
    'Hyderabad Hydrogen Ring Main',
    'H2-RM-003',
    'City-wide hydrogen ring main for Hyderabad Smart Energy Zone. Connects 5 distribution substations.',
    'Hyderabad Greater Metro Zone',
    45.00, 60.00, 42.00, 'maintenance'
  );

-- ============================================
-- PIPELINE SEGMENTS
-- ============================================
INSERT INTO pipeline_segments (pipeline_id, name, segment_code, start_location, end_location, length_km, max_pressure_bar, status) VALUES
  -- Pipeline 1: Chennai-Bangalore
  (1, 'Chennai Electrolyser to Vellore', 'H2-TL-001-SEG-A', 'Chennai Electrolyser Plant', 'Vellore Junction',              130.00, 120.00, 'active'),
  (1, 'Vellore to Krishnagiri',          'H2-TL-001-SEG-B', 'Vellore Junction',           'Krishnagiri Station',           110.00, 115.00, 'active'),
  (1, 'Krishnagiri to Bangalore Hub',    'H2-TL-001-SEG-C', 'Krishnagiri Station',         'Bangalore Distribution Hub',   110.00, 110.00, 'active'),
  -- Pipeline 2: Kochi
  (2, 'Offshore Entry to Ernakulam',     'H2-DL-002-SEG-A', 'Kochi Offshore Transfer Point', 'Ernakulam Industrial Node',  35.00,  80.00, 'active'),
  (2, 'Ernakulam to Aluva Zone',         'H2-DL-002-SEG-B', 'Ernakulam Industrial Node',     'Aluva Distribution Zone',    30.00,  75.00, 'active'),
  (2, 'Aluva to Perumbavoor Branch',     'H2-DL-002-SEG-C', 'Aluva Distribution Zone',       'Perumbavoor End Terminal',   25.00,  70.00, 'active'),
  -- Pipeline 3: Hyderabad
  (3, 'Uppal to Ameerpet',               'H2-RM-003-SEG-A', 'Uppal Substation',   'Ameerpet Node',      12.00, 60.00, 'active'),
  (3, 'Ameerpet to Kukatpally',          'H2-RM-003-SEG-B', 'Ameerpet Node',       'Kukatpally Station', 15.00, 60.00, 'maintenance'),
  (3, 'Kukatpally to Uppal Return',      'H2-RM-003-SEG-C', 'Kukatpally Station',  'Uppal Substation',   18.00, 60.00, 'active');

-- ============================================
-- SENSORS (2 per segment = 18 sensors)
-- ============================================
INSERT INTO sensors (segment_id, sensor_code, sensor_type, unit, location_description, min_safe_value, max_safe_value, status, installed_at) VALUES
  -- SEG-A (Chennai-Vellore)
  (1, 'SEN-TL001-A-P01', 'pressure',    'bar',   'Chennai Electrolyser Outlet Pressure',       65.00, 95.00,   'active',      NOW() - INTERVAL '18 months'),
  (1, 'SEN-TL001-A-F01', 'flow_rate',   'm3/h',  'Chennai Inlet Flow Rate Monitor',            500.00, 1500.00,'active',      NOW() - INTERVAL '18 months'),
  -- SEG-B (Vellore-Krishnagiri)
  (2, 'SEN-TL001-B-P01', 'pressure',    'bar',   'Vellore Midpoint Pressure Sensor',           60.00, 90.00,   'active',      NOW() - INTERVAL '15 months'),
  (2, 'SEN-TL001-B-T01', 'temperature', 'C',     'Vellore Section Temperature Monitor',        10.00, 55.00,   'active',      NOW() - INTERVAL '15 months'),
  -- SEG-C (Krishnagiri-Bangalore)
  (3, 'SEN-TL001-C-P01', 'pressure',    'bar',   'Krishnagiri Inlet Pressure Sensor',          60.00, 90.00,   'active',      NOW() - INTERVAL '12 months'),
  (3, 'SEN-TL001-C-L01', 'leak_detect', 'ppm',   'Krishnagiri Pipeline Leak Detector',         0.00,  50.00,   'active',      NOW() - INTERVAL '12 months'),
  -- SEG-D (Kochi - Offshore)
  (4, 'SEN-DL002-A-P01', 'pressure',    'bar',   'Kochi Offshore Transfer Pressure',           45.00, 75.00,   'active',      NOW() - INTERVAL '10 months'),
  (4, 'SEN-DL002-A-H01', 'humidity',    '%RH',   'Kochi Offshore Corrosion Humidity Sensor',   20.00, 80.00,   'active',      NOW() - INTERVAL '10 months'),
  -- SEG-E (Ernakulam-Aluva)
  (5, 'SEN-DL002-B-P01', 'pressure',    'bar',   'Ernakulam Distribution Pressure',            40.00, 70.00,   'active',      NOW() - INTERVAL '8 months'),
  (5, 'SEN-DL002-B-F01', 'flow_rate',   'm3/h',  'Ernakulam Zone Flow Meter',                  100.00, 800.00, 'active',      NOW() - INTERVAL '8 months'),
  -- SEG-F (Aluva-Perumbavoor)
  (6, 'SEN-DL002-C-P01', 'pressure',    'bar',   'Aluva Branch End Pressure Monitor',          35.00, 65.00,   'active',      NOW() - INTERVAL '6 months'),
  (6, 'SEN-DL002-C-L01', 'leak_detect', 'ppm',   'Perumbavoor Terminal Leak Detector',         0.00,  50.00,   'active',      NOW() - INTERVAL '6 months'),
  -- SEG-G (Uppal-Ameerpet)
  (7, 'SEN-RM003-A-P01', 'pressure',    'bar',   'Uppal Substation Outlet Pressure',           30.00, 55.00,   'active',      NOW() - INTERVAL '24 months'),
  (7, 'SEN-RM003-A-V01', 'vibration',   'mm/s',  'Uppal Ring Main Vibration Sensor',           0.00,  15.00,   'active',      NOW() - INTERVAL '24 months'),
  -- SEG-H (Ameerpet-Kukatpally) - maintenance
  (8, 'SEN-RM003-B-P01', 'pressure',    'bar',   'Ameerpet to Kukatpally Pressure',            30.00, 55.00,   'maintenance', NOW() - INTERVAL '22 months'),
  (8, 'SEN-RM003-B-T01', 'temperature', 'C',     'Kukatpally Section Temperature',             10.00, 50.00,   'maintenance', NOW() - INTERVAL '22 months'),
  -- SEG-I (Kukatpally-Uppal Return)
  (9, 'SEN-RM003-C-P01', 'pressure',    'bar',   'Kukatpally Return Pressure Monitor',         28.00, 52.00,   'active',      NOW() - INTERVAL '20 months'),
  (9, 'SEN-RM003-C-F01', 'flow_rate',   'm3/h',  'Uppal Return Flow Meter',                    50.00, 400.00,  'active',      NOW() - INTERVAL '20 months');

-- ============================================
-- SENSOR READINGS (~20 per sensor via PL/pgSQL)
-- ============================================
DO $$
DECLARE
  sensor_rec RECORD;
  i INTEGER;
  base_val NUMERIC;
  reading_val NUMERIC;
  read_quality VARCHAR(30);
BEGIN
  FOR sensor_rec IN SELECT id, min_safe_value, max_safe_value FROM sensors LOOP
    FOR i IN 1..20 LOOP
      base_val := (sensor_rec.min_safe_value + sensor_rec.max_safe_value) / 2;
      IF i % 14 = 0 THEN
        -- Every 14th: critical (12% over max)
        reading_val := sensor_rec.max_safe_value + (sensor_rec.max_safe_value * 0.12);
        read_quality := 'warning';
      ELSIF i % 7 = 0 THEN
        -- Every 7th: mild high (6% over max)
        reading_val := sensor_rec.max_safe_value + (sensor_rec.max_safe_value * 0.06);
        read_quality := 'good';
      ELSE
        -- Normal: base +/- 10% random
        reading_val := base_val + ((random() - 0.5) * (sensor_rec.max_safe_value - sensor_rec.min_safe_value) * 0.2);
        read_quality := 'good';
      END IF;
      INSERT INTO sensor_readings (sensor_id, value, recorded_at, quality)
      VALUES (
        sensor_rec.id,
        ROUND(reading_val::NUMERIC, 4),
        NOW() - (i * INTERVAL '6 minutes'),
        read_quality
      );
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- LEAK ALERTS
-- ============================================
INSERT INTO leak_alerts (sensor_id, pipeline_id, severity, alert_type, message, detected_value, detected_at, status) VALUES
  (1,  1, 'critical', 'pressure_high', 'Pressure exceeded critical threshold at Chennai Electrolyser Outlet. Immediate inspection required.', 98.40, NOW() - INTERVAL '2 hours',  'open'),
  (5,  1, 'warning',  'pressure_high', 'Pressure approaching upper safe limit at Krishnagiri Inlet. Monitor closely.',                        91.20, NOW() - INTERVAL '5 hours',  'acknowledged'),
  (7,  2, 'warning',  'pressure_low',  'Pressure drop detected at Kochi Offshore Transfer Point. Check compressor output.',                    43.50, NOW() - INTERVAL '8 hours',  'acknowledged'),
  (11, 2, 'critical', 'pressure_high', 'Aluva Branch End Pressure exceeded critical limit. Possible blockage downstream.',                     68.90, NOW() - INTERVAL '1 day',    'resolved'),
  (13, 3, 'warning',  'pressure_high', 'Uppal Substation outlet pressure elevated. Possible downstream restriction.',                          56.80, NOW() - INTERVAL '30 hours', 'resolved'),
  (6,  1, 'critical', 'leak_detected', 'Hydrogen leak ppm above safe threshold near Krishnagiri. Evacuation zone active.',                     62.00, NOW() - INTERVAL '3 hours',  'open'),
  (12, 2, 'warning',  'leak_detected', 'Minor hydrogen concentration detected at Perumbavoor Terminal. Field team dispatched.',                 54.50, NOW() - INTERVAL '6 hours',  'open');

-- ============================================
-- MAINTENANCE TASKS
-- ============================================
INSERT INTO maintenance_tasks (pipeline_id, segment_id, title, description, priority, scheduled_date, completed_date, assigned_to, status) VALUES
  (1, 2, 'Quarterly Pressure Gauge Calibration - SEG-B',
   'Calibrate all pressure gauges on Vellore-Krishnagiri segment. Replace worn seals if required.',
   'high', CURRENT_DATE + 7, NULL, 3, 'scheduled'),
  (1, 3, 'Pig Launcher Inspection - SEG-C',
   'Inspect pig launcher at Krishnagiri station inlet before next intelligent pigging run scheduled for Q4.',
   'medium', CURRENT_DATE + 14, NULL, 3, 'scheduled'),
  (2, 4, 'Cathodic Protection Test - Offshore Entry',
   'Annual cathodic protection survey at the Kochi offshore-to-onshore transition point.',
   'critical', CURRENT_DATE + 3, NULL, 4, 'scheduled'),
  (3, 8, 'Compressor Overhaul - Ameerpet Node',
   'Full compressor overhaul at Ameerpet booster station. Replace impellers, check lubrication circuit.',
   'critical', CURRENT_DATE - 2, NULL, 3, 'in_progress'),
  (3, 9, 'Valve Actuator Replacement - Kukatpally Return',
   'Replace failed motorised ball valve actuator unit on Kukatpally-Uppal return segment.',
   'high', CURRENT_DATE - 5, CURRENT_DATE - 1, 2, 'completed'),
  (1, 1, 'Annual Leak Survey - SEG-A',
   'Full aerial and ground-based leak detection survey along Chennai-Vellore segment.',
   'medium', CURRENT_DATE + 30, NULL, 4, 'scheduled'),
  (2, 6, 'Perumbavoor Terminal Valve Inspection',
   'Inspect isolation valves at Perumbavoor end terminal. Lubricate and verify operation.',
   'low', CURRENT_DATE + 21, NULL, 2, 'scheduled');

-- ============================================
-- COMPLIANCE REPORTS
-- ============================================
INSERT INTO compliance_reports (pipeline_id, report_type, reporting_period_start, reporting_period_end, status, generated_by, generated_at) VALUES
  (1, 'pressure_compliance',    '2026-01-01', '2026-03-31', 'approved', 1, NOW() - INTERVAL '90 days'),
  (1, 'leak_detection_audit',   '2026-01-01', '2026-06-30', 'approved', 1, NOW() - INTERVAL '60 days'),
  (2, 'pressure_compliance',    '2026-01-01', '2026-03-31', 'approved', 4, NOW() - INTERVAL '85 days'),
  (2, 'annual_safety_report',   '2025-01-01', '2025-12-31', 'approved', 4, NOW() - INTERVAL '200 days'),
  (3, 'pressure_compliance',    '2026-01-01', '2026-03-31', 'pending',  NULL, NULL),
  (3, 'maintenance_compliance', '2026-04-01', '2026-06-30', 'draft',    NULL, NULL),
  (1, 'pressure_compliance',    '2026-04-01', '2026-06-30', 'draft',    NULL, NULL);
