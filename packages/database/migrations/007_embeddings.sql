CREATE TABLE IF NOT EXISTS job_embeddings (
  job_id UUID PRIMARY KEY REFERENCES jobs_canonical(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL DEFAULT 1536,
  embedding VECTOR(1536),
  embedded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile_embeddings (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL DEFAULT 1536,
  embedding VECTOR(1536),
  embedded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_embeddings_vector ON job_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_profile_embeddings_vector ON profile_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
