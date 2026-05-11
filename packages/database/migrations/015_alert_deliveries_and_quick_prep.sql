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
