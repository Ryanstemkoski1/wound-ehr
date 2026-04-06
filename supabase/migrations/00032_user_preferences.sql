-- Migration: 00032_user_preferences
-- Phase 11.4.2: User preferences (PDF photo settings, etc.)

-- =====================================================
-- USER PREFERENCES TABLE
-- =====================================================
-- Stores per-user settings. One row per user.
-- JSONB column for flexible preference storage.

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- PDF Photo Preferences
  pdf_include_photos BOOLEAN NOT NULL DEFAULT TRUE,
  pdf_photo_size TEXT NOT NULL DEFAULT 'medium' CHECK (pdf_photo_size IN ('small', 'medium', 'large')),
  pdf_max_photos_per_assessment INTEGER NOT NULL DEFAULT 2 CHECK (pdf_max_photos_per_assessment BETWEEN 0 AND 6),
  pdf_page_size TEXT NOT NULL DEFAULT 'letter' CHECK (pdf_page_size IN ('letter', 'a4')),
  
  -- General preferences (extensible)
  preferences JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Index for fast lookup by user
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read and write their own preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all (for support/debugging)
CREATE POLICY "Admins can view all preferences"
  ON user_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('tenant_admin', 'facility_admin')
    )
  );
