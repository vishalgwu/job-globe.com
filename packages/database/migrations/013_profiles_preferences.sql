-- Migration 013: extend profiles table with full onboarding preferences
-- Adds a preferences jsonb column (stores job_types, company_size_preference,
-- time_to_start, desired_role_family that don't map to existing columns),
-- resume_consent_accepted boolean, and a display_name to users.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS resume_consent_accepted BOOLEAN NOT NULL DEFAULT FALSE;

-- GIN index on preferences for future filter queries
CREATE INDEX IF NOT EXISTS idx_profiles_preferences_gin ON profiles USING GIN (preferences);

-- Track when the raw resume was last confirmed retained by the user
ALTER TABLE resume_extractions
  ADD COLUMN IF NOT EXISTS user_retained BOOLEAN NOT NULL DEFAULT FALSE;

-- Add display_name to users if somehow absent (migration is idempotent)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name TEXT;
