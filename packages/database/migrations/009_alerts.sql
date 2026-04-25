CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query JSONB NOT NULL DEFAULT '{}'::jsonb,
  minimum_match_score INTEGER NOT NULL DEFAULT 70 CHECK (minimum_match_score BETWEEN 0 AND 100),
  delivery_channels TEXT[] NOT NULL DEFAULT '{email,in_app}',
  active BOOLEAN NOT NULL DEFAULT true,
  last_evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_active ON alerts(user_id, active);
CREATE INDEX IF NOT EXISTS idx_alerts_query_gin ON alerts USING GIN (query);
