-- 006_worker_tasks.sql
-- Add resolution evidence, timestamps, and indexes for worker task management.

ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolution_image_url TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Indexes for fast worker task lookups and status filtering
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_worker ON complaints(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_complaints_worker_status ON complaints(assigned_worker_id, status);
