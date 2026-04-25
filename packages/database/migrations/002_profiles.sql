CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  headline TEXT,
  preferred_locations TEXT[] NOT NULL DEFAULT '{}',
  preferred_remote_type TEXT,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  work_authorization TEXT,
  salary_expectation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resume_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_object_key TEXT,
  raw_file_sha256 TEXT,
  encrypted_at TIMESTAMPTZ,
  raw_delete_after TIMESTAMPTZ,
  parsed_text TEXT,
  parsed_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  parser_version TEXT NOT NULL DEFAULT 'step-1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_skills_gin ON profiles USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_resume_extractions_user_id ON resume_extractions(user_id);
