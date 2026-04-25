CREATE TABLE IF NOT EXISTS job_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  parent_id UUID REFERENCES job_taxonomy(id) ON DELETE SET NULL,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category, value)
);

CREATE TABLE IF NOT EXISTS job_taxonomy_links (
  job_id UUID NOT NULL REFERENCES jobs_canonical(id) ON DELETE CASCADE,
  taxonomy_id UUID NOT NULL REFERENCES job_taxonomy(id) ON DELETE CASCADE,
  confidence NUMERIC(5,4) NOT NULL DEFAULT 1,
  PRIMARY KEY(job_id, taxonomy_id)
);

CREATE INDEX IF NOT EXISTS idx_job_taxonomy_category_value ON job_taxonomy(category, value);
CREATE INDEX IF NOT EXISTS idx_job_taxonomy_synonyms_gin ON job_taxonomy USING GIN (synonyms);
CREATE INDEX IF NOT EXISTS idx_job_taxonomy_metadata_gin ON job_taxonomy USING GIN (metadata);
