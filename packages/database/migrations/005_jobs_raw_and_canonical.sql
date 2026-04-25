DO $$ BEGIN
  CREATE TYPE job_remote_type AS ENUM ('onsite', 'hybrid', 'remote', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS jobs_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  source_job_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_live_at TIMESTAMPTZ,
  UNIQUE(source, source_job_id)
);

CREATE TABLE IF NOT EXISTS jobs_canonical (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_job_id UUID REFERENCES jobs_raw(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'full-time',
  remote_type job_remote_type NOT NULL DEFAULT 'unknown',
  seniority TEXT NOT NULL DEFAULT 'unknown',
  apply_url TEXT NOT NULL,
  salary_min INTEGER,
  salary_max INTEGER,
  currency CHAR(3) DEFAULT 'USD',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  search_document TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || array_to_string(required_skills, ' '))) STORED,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_raw_payload_gin ON jobs_raw USING GIN (payload);
CREATE INDEX IF NOT EXISTS idx_jobs_canonical_search_gin ON jobs_canonical USING GIN (search_document);
CREATE INDEX IF NOT EXISTS idx_jobs_canonical_required_skills_gin ON jobs_canonical USING GIN (required_skills);
CREATE INDEX IF NOT EXISTS idx_jobs_canonical_location ON jobs_canonical(location_id);
CREATE INDEX IF NOT EXISTS idx_jobs_canonical_company ON jobs_canonical(company_id);
