-- ============================================================
-- Catch-up migration patch: applies migrations 013-017
-- Run this in the Supabase SQL editor (or via psql).
-- All statements use IF NOT EXISTS / CREATE OR REPLACE —
-- safe to run even if some migrations are partially applied.
-- ============================================================


-- ── Migration 013_profiles_preferences ────────────────────────────────────────────────
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


-- ── Migration 014_resume_extractions_user_unique ────────────────────────────────────────────────
-- Migration 014: enforce the one-resume-row-per-user invariant used by /api/resume.

CREATE UNIQUE INDEX IF NOT EXISTS idx_resume_extractions_user_unique
ON resume_extractions(user_id);


-- ── Migration 015_alert_deliveries_and_quick_prep ────────────────────────────────────────────────
-- Migration 015: alert delivery history and quick-prep content cache

-- ── Alert deliveries ──────────────────────────────────────────────────────
-- Tracks every notification sent for an alert match (email, in_app, etc.)
-- Used for deduplication, digest bundling, and daily-cap enforcement.

CREATE TABLE IF NOT EXISTS alert_deliveries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id       UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id         UUID REFERENCES jobs_canonical(id) ON DELETE SET NULL,
  channel        TEXT NOT NULL,                  -- 'email' | 'in_app'
  status         TEXT NOT NULL DEFAULT 'sent',   -- 'sent' | 'failed' | 'suppressed'
  match_score    INTEGER,
  digest_id      UUID,                           -- groups messages in a digest batch
  delivered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_alert_deliveries_alert    ON alert_deliveries(alert_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_user     ON alert_deliveries(user_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_digest   ON alert_deliveries(digest_id) WHERE digest_id IS NOT NULL;

-- ── In-app notification feed ──────────────────────────────────────────────
-- Stores unread/read notification items shown in the UI notification feed.

CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,          -- 'alert_match' | 'system'
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  job_id       UUID REFERENCES jobs_canonical(id) ON DELETE SET NULL,
  alert_id     UUID REFERENCES alerts(id) ON DELETE SET NULL,
  read         BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);

-- ── Quick-prep content cache ──────────────────────────────────────────────
-- Stores OpenAI-generated interview-prep content per job × user combination.
-- TTL enforced by expires_at; the API regenerates after expiry.

CREATE TABLE IF NOT EXISTS quick_prep_cache (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES jobs_canonical(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = generic (no profile)
  content      JSONB NOT NULL DEFAULT '{}'::jsonb,
  model        TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  prompt_hash  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quick_prep_cache_job_user
  ON quick_prep_cache(job_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_quick_prep_cache_expires ON quick_prep_cache(expires_at);


-- ── Migration 016_audit_retention ────────────────────────────────────────────────
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


-- ── Migration 017_privacy_data_safety ────────────────────────────────────────────────
-- Migration 017: Phase 2 privacy and data safety hardening

-- Keep a processing marker that does not require retaining full resume text.
ALTER TABLE resume_extractions
  ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMPTZ;

UPDATE resume_extractions
SET parsed_at = COALESCE(parsed_at, created_at)
WHERE parsed_at IS NULL
  AND parsed_profile <> '{}'::jsonb;

-- Remove retained raw resume text and file fingerprints. Structured profile
-- data remains the minimum useful profile artifact for matching.
UPDATE resume_extractions
SET
  parsed_text = NULL,
  raw_file_sha256 = NULL;

CREATE INDEX IF NOT EXISTS idx_resume_extractions_pending_parse
  ON resume_extractions(created_at)
  WHERE parsed_at IS NULL AND raw_object_key IS NOT NULL;

-- Atomic database-side account deletion. Storage objects and Supabase Auth are
-- deleted by the API route; this function keeps all relational cleanup in one
-- transaction and removes user identifiers from audit rows before cascading.
CREATE OR REPLACE FUNCTION delete_internal_account(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE audit_events
  SET actor_user_id = NULL
  WHERE actor_user_id = p_user_id;

  UPDATE audit_events
  SET subject_id = NULL
  WHERE subject_type = 'user'
    AND subject_id = p_user_id;

  DELETE FROM users
  WHERE id = p_user_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION delete_internal_account(UUID) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION delete_internal_account(UUID) TO service_role;
  END IF;
END $$;

-- Row-level security for user-owned public tables. API routes use service-role
-- access, but these policies protect the same tables if they are accessed by
-- Supabase clients directly.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_prep_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  has_auth_uid BOOLEAN;
BEGIN
  SELECT to_regprocedure('auth.uid()') IS NOT NULL INTO has_auth_uid;
  IF NOT has_auth_uid THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_own_row'
  ) THEN
    CREATE POLICY users_own_row ON users
      FOR SELECT
      USING (auth_subject = auth.uid()::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'auth_sessions'
      AND policyname = 'auth_sessions_own_rows'
  ) THEN
    CREATE POLICY auth_sessions_own_rows ON auth_sessions
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth_sessions.user_id
            AND users.auth_subject = auth.uid()::text
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth_sessions.user_id
            AND users.auth_subject = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_own_rows'
  ) THEN
    CREATE POLICY profiles_own_rows ON profiles
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = profiles.user_id
            AND users.auth_subject = auth.uid()::text
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = profiles.user_id
            AND users.auth_subject = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'resume_extractions'
      AND policyname = 'resume_extractions_own_rows'
  ) THEN
    CREATE POLICY resume_extractions_own_rows ON resume_extractions
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = resume_extractions.user_id
            AND users.auth_subject = auth.uid()::text
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = resume_extractions.user_id
            AND users.auth_subject = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'saved_jobs'
      AND policyname = 'saved_jobs_own_rows'
  ) THEN
    CREATE POLICY saved_jobs_own_rows ON saved_jobs
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = saved_jobs.user_id
            AND users.auth_subject = auth.uid()::text
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = saved_jobs.user_id
            AND users.auth_subject = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'applications'
      AND policyname = 'applications_own_rows'
  ) THEN
    CREATE POLICY applications_own_rows ON applications
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = applications.user_id
            AND users.auth_subject = auth.uid()::text
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = applications.user_id
            AND users.auth_subject = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'alerts' AND policyname = 'alerts_own_rows'
  ) THEN
    CREATE POLICY alerts_own_rows ON alerts
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = alerts.user_id
            AND users.auth_subject = auth.uid()::text
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = alerts.user_id
            AND users.auth_subject = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'alert_deliveries'
      AND policyname = 'alert_deliveries_own_rows'
  ) THEN
    CREATE POLICY alert_deliveries_own_rows ON alert_deliveries
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = alert_deliveries.user_id
            AND users.auth_subject = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications'
      AND policyname = 'notifications_own_rows'
  ) THEN
    CREATE POLICY notifications_own_rows ON notifications
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = notifications.user_id
            AND users.auth_subject = auth.uid()::text
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = notifications.user_id
            AND users.auth_subject = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quick_prep_cache'
      AND policyname = 'quick_prep_cache_own_or_generic_rows'
  ) THEN
    CREATE POLICY quick_prep_cache_own_or_generic_rows ON quick_prep_cache
      FOR SELECT
      USING (
        user_id IS NULL
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = quick_prep_cache.user_id
            AND users.auth_subject = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_events'
      AND policyname = 'audit_events_own_rows'
  ) THEN
    CREATE POLICY audit_events_own_rows ON audit_events
      FOR SELECT
      USING (
        actor_user_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM users
          WHERE users.id = audit_events.actor_user_id
            AND users.auth_subject = auth.uid()::text
        )
      );
  END IF;
END $$;

-- Supabase Storage bucket and policies. These statements are guarded so the
-- migration remains runnable in CI's plain pgvector Postgres image.
DO $$
DECLARE
  has_storage BOOLEAN;
  has_auth_uid BOOLEAN;
BEGIN
  SELECT to_regclass('storage.buckets') IS NOT NULL
     AND to_regclass('storage.objects') IS NOT NULL
    INTO has_storage;
  SELECT to_regprocedure('auth.uid()') IS NOT NULL INTO has_auth_uid;

  IF NOT has_storage THEN
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'resumes',
    'resumes',
    false,
    10485760,
    ARRAY[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
  )
  ON CONFLICT (id) DO UPDATE
  SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  -- NOTE: storage.objects is owned by Supabase's internal storage service.
  -- RLS is already enabled on it by default in Supabase managed projects.
  -- Attempting ALTER TABLE here fails with "must be owner of table objects".
  -- The storage policies below are sufficient.

  IF NOT has_auth_uid THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'resumes_users_select_own'
  ) THEN
    CREATE POLICY resumes_users_select_own ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'resumes'
        AND EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id::text = (storage.foldername(name))[1]
            AND users.auth_subject = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'resumes_users_insert_own'
  ) THEN
    CREATE POLICY resumes_users_insert_own ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'resumes'
        AND EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id::text = (storage.foldername(name))[1]
            AND users.auth_subject = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'resumes_users_update_own'
  ) THEN
    CREATE POLICY resumes_users_update_own ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'resumes'
        AND EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id::text = (storage.foldername(name))[1]
            AND users.auth_subject = auth.uid()::text
        )
      )
      WITH CHECK (
        bucket_id = 'resumes'
        AND EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id::text = (storage.foldername(name))[1]
            AND users.auth_subject = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'resumes_users_delete_own'
  ) THEN
    CREATE POLICY resumes_users_delete_own ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'resumes'
        AND EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id::text = (storage.foldername(name))[1]
            AND users.auth_subject = auth.uid()::text
        )
      );
  END IF;
END $$;


-- ── Record migrations in schema_migrations (skip if already present) ─────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  execution_ms INTEGER NOT NULL
);

INSERT INTO schema_migrations (version, checksum, execution_ms) VALUES
  ('013_profiles_preferences',             '30a80a712be164c08f0f2fc7a4565f7cb5d98eaf8e6a48743a1c4f55a705aedc', 0),
  ('014_resume_extractions_user_unique',   '799c2c38748b0ab123b9925319e953de93c6372c6113e14fc46b92ed62588708', 0),
  ('015_alert_deliveries_and_quick_prep',  'c34111d2b506f86b1da7ea8f8feffcedf1969daba996c714c5a7c90f296575a3', 0),
  ('016_audit_retention',                  '6a17c1244fca4e1433c2c00a4a25c8b1583993c30aa45e5cfd8840a32ab7229e', 0),
  ('017_privacy_data_safety',              '651879360c8830aa6da22beb6cbf9958d49397c770755eb8f66491c683d4defe', 0)
ON CONFLICT (version) DO NOTHING;
