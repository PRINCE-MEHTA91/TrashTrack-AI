-- Complaints / Waste Reports table
-- Stores citizen-submitted waste reports with image, GPS coords, address, and issue metadata.

CREATE TABLE IF NOT EXISTS complaints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Issue metadata
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  waste_type      VARCHAR(50) NOT NULL DEFAULT 'OTHER',  -- ORGANIC | PLASTIC | HAZARDOUS | BULK | OTHER
  severity        VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW | MEDIUM | HIGH

  -- Location (real GPS from browser)
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  accuracy        DOUBLE PRECISION,
  address         TEXT,          -- human-readable from reverse geocode

  -- Photo (stored as base64 data URL or cloud URL)
  image_url       TEXT,

  -- Lifecycle
  status          VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
  -- SUBMITTED → PENDING → IN_PROGRESS → RESOLVED | CLOSED | REJECTED

  assigned_worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_note TEXT,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast citizen lookups
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_id ON complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
