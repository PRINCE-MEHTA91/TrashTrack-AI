-- 010_notifications.sql: Notifications schema
CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               VARCHAR(255) NOT NULL,
  message             TEXT NOT NULL,
  type                VARCHAR(50) NOT NULL,
  category            VARCHAR(30) NOT NULL DEFAULT 'COMPLAINT',
  related_entity_type VARCHAR(50),
  related_entity_id   UUID,
  action_url          VARCHAR(255),
  is_read             BOOLEAN NOT NULL DEFAULT FALSE,
  read_at             TIMESTAMP WITH TIME ZONE,
  dedup_key           VARCHAR(255),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_unique ON notifications(dedup_key) WHERE dedup_key IS NOT NULL;
