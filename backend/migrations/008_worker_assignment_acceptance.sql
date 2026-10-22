-- 008_worker_assignment_acceptance.sql
-- Worker Task Assignment Acceptance & Rejection Workflow

-- 1. Add acceptance lifecycle columns to complaints
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS worker_response VARCHAR(30) DEFAULT 'ACCEPTED';
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS worker_response_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS rejected_worker_ids UUID[] DEFAULT '{}';
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- 2. Index for fast lookup of pending assignment offers per worker
CREATE INDEX IF NOT EXISTS idx_complaints_worker_pending_offers 
  ON complaints(assigned_worker_id, worker_response) 
  WHERE worker_response = 'PENDING_ACCEPTANCE';
