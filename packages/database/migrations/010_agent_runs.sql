CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  source TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  processed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_started ON agent_runs(agent_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_metadata_gin ON agent_runs USING GIN (metadata);
