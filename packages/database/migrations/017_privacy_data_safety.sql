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

  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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
