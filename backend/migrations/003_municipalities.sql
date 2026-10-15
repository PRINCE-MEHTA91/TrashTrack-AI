-- 003_municipalities.sql

-- Municipalities table
CREATE TABLE IF NOT EXISTS municipalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state VARCHAR(255) NOT NULL,
  district VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  boundary GEOMETRY(Geometry, 4326),
  bbox JSONB,
  data_source VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(state, district, name)
);

-- Wards table
CREATE TABLE IF NOT EXISTS wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  ward_number VARCHAR(100),
  boundary GEOMETRY(Geometry, 4326),
  data_source VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link Admin/Worker to Municipality
ALTER TABLE users ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL;

-- Link Complaint to Municipality and Ward
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS ward_id UUID REFERENCES wards(id) ON DELETE SET NULL;

-- Indexes for spatial queries
CREATE INDEX IF NOT EXISTS idx_municipalities_boundary ON municipalities USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_wards_boundary ON wards USING GIST(boundary);
