-- 009_community_complaints.sql: Comments and verification schema

-- 1. Create complaint_comments table for citizen, worker, and admin discussions
CREATE TABLE IF NOT EXISTS complaint_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_type VARCHAR(30) NOT NULL DEFAULT 'COMMENT', -- 'COMMENT' | 'INCOMPLETE_REPORT' | 'STATUS_UPDATE' | 'VERIFICATION'
  comment      TEXT NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_complaint_comments_complaint_id ON complaint_comments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_comments_created_at ON complaint_comments(created_at ASC);

-- 2. Add verification tracking fields to complaints
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL;
