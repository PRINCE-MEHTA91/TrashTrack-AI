-- 004_worker_approvals.sql
-- Tracks worker registration verification requests and approval lifecycle.

CREATE TABLE IF NOT EXISTS worker_approvals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The worker who registered
  worker_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Municipality the worker is requesting to serve in (set during signup)
  requested_municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL,

  -- The admin who acted on this request (NULL while pending)
  reviewed_by       UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Status lifecycle: PENDING_VERIFICATION -> APPROVED | REJECTED
  status            VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION',

  -- For rejection: reason stored here
  rejection_reason  TEXT,

  -- Timestamps
  requested_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at       TIMESTAMP,

  -- One pending/approved record per worker (unique)
  UNIQUE(worker_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_worker_approvals_status        ON worker_approvals(status);
CREATE INDEX IF NOT EXISTS idx_worker_approvals_worker_id     ON worker_approvals(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_approvals_municipality  ON worker_approvals(requested_municipality_id);
CREATE INDEX IF NOT EXISTS idx_worker_approvals_reviewed_by   ON worker_approvals(reviewed_by);

-- Add requested_municipality_id to users so workers can store it at registration time
ALTER TABLE users ADD COLUMN IF NOT EXISTS requested_municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL;
