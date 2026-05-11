-- Migration 016: audit event retention policy and expiry

-- Add an expires_at column to audit_events so the cleanup worker can
-- efficiently identify rows that have passed their retention window.
-- NULL means "retain indefinitely" (used for high-risk compliance events).

ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_audit_events_expires ON audit_events(expires_at)
  WHERE expires_at IS NOT NULL;

-- ── Retention policy config ───────────────────────────────────────────────
-- Maps event_type patterns to a retention_days value.
-- The cleanup worker reads this table on startup and applies it.

CREATE TABLE IF NOT EXISTS audit_retention_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_glob TEXT NOT NULL UNIQUE,  -- supports '%' wildcard (LIKE match)
  retention_days  INTEGER NOT NULL CHECK (retention_days > 0),
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default retention rules:
--   • Login/session events   →  90 days
--   • Profile/resume events  → 365 days (GDPR accountability window)
--   • Application events     → 365 days
--   • Worker failures        →  30 days
--   • Everything else        →  90 days

INSERT INTO audit_retention_policies (event_type_glob, retention_days, description)
VALUES
  ('auth.%',              90,  'Login, logout, session events'),
  ('profile.%',          365,  'Profile create/update events'),
  ('resume.%',           365,  'Resume upload, delete, parse events'),
  ('application.%',      365,  'Job application redirect events'),
  ('saved_job.%',         90,  'Save/unsave job events'),
  ('alert.%',             90,  'Alert create/delete events'),
  ('worker.failure',      30,  'Worker error events'),
  ('%',                   90,  'Default catch-all retention')
ON CONFLICT (event_type_glob) DO NOTHING;
