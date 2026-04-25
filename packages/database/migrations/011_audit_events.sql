CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_subject ON audit_events(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_metadata_gin ON audit_events USING GIN (metadata);
