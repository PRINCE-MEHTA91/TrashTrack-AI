-- 007_auto_assignment.sql
-- Automatic Nearest Eligible Worker Assignment Schema Extensions

-- 1. Ensure PostGIS extension is enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add assignment metadata columns to complaints
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assignment_distance_meters DOUBLE PRECISION;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assignment_mode VARCHAR(30) DEFAULT 'NONE';

-- 3. Create complaint_assignment_logs for full audit trail & history
CREATE TABLE IF NOT EXISTS complaint_assignment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by VARCHAR(50) NOT NULL, -- 'SYSTEM_AUTO' | 'ADMIN'
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  distance_meters DOUBLE PRECISION,
  status VARCHAR(30) NOT NULL,       -- 'ASSIGNED' | 'UNASSIGNED' | 'REASSIGNED'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast assignment log queries
CREATE INDEX IF NOT EXISTS idx_assignment_logs_complaint_id ON complaint_assignment_logs(complaint_id);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_worker_id ON complaint_assignment_logs(worker_id);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_created_at ON complaint_assignment_logs(created_at DESC);

-- 4. Spatial indexes for high-performance distance queries
-- Functional GiST index on user_locations for ST_Distance / ST_DWithin geography calculations
CREATE INDEX IF NOT EXISTS idx_user_locations_geog ON user_locations USING GIST (
  (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography)
);

-- Functional GiST index on complaints for spatial lookups
CREATE INDEX IF NOT EXISTS idx_complaints_geog ON complaints USING GIST (
  (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography)
);
