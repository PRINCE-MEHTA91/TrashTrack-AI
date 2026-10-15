-- 005_worker_availability.sql
-- Worker daily availability sessions, tracking working hours, and real-time status.

-- 1. Create worker_sessions table
CREATE TABLE IF NOT EXISTS worker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  closure_reason VARCHAR(50) DEFAULT 'manual', -- 'manual', 'midnight_split', 'inactivity_timeout', 'admin_closed'
  last_heartbeat_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Indexes for fast session queries and active lookups
CREATE INDEX IF NOT EXISTS idx_worker_sessions_worker_date ON worker_sessions(worker_id, work_date);
CREATE INDEX IF NOT EXISTS idx_worker_sessions_active ON worker_sessions(worker_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_worker_sessions_date ON worker_sessions(work_date);
CREATE INDEX IF NOT EXISTS idx_worker_sessions_started_at ON worker_sessions(started_at);

-- 3. Extend users table with availability state columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) NOT NULL DEFAULT 'INACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_session_id UUID REFERENCES worker_sessions(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 4. Index for fast availability queries on worker users
CREATE INDEX IF NOT EXISTS idx_users_worker_availability ON users(availability_status) WHERE role = 'worker';
