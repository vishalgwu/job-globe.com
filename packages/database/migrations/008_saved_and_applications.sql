CREATE TABLE IF NOT EXISTS saved_jobs (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs_canonical(id) ON DELETE CASCADE,
  notes TEXT,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, job_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs_canonical(id) ON DELETE CASCADE,
  apply_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'redirected',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_metadata_gin ON applications USING GIN (metadata);
