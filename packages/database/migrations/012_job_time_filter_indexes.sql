CREATE INDEX IF NOT EXISTS idx_jobs_canonical_status_first_seen_at
ON jobs_canonical(status, first_seen_at DESC);
