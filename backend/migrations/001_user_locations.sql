-- Migration: Create user_locations table
-- Stores one row per user (upsert pattern via ON CONFLICT).
-- Only one location record per authenticated user (user_id is UNIQUE).

CREATE TABLE IF NOT EXISTS user_locations (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  latitude   DOUBLE PRECISION NOT NULL,
  longitude  DOUBLE PRECISION NOT NULL,
  accuracy   DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
