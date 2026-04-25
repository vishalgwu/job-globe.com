CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code CHAR(2) NOT NULL,
  country_name TEXT NOT NULL,
  region TEXT,
  city TEXT NOT NULL,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  hierarchy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, region, city)
);

CREATE INDEX IF NOT EXISTS idx_locations_country_city ON locations(country_code, city);
CREATE INDEX IF NOT EXISTS idx_locations_hierarchy_gin ON locations USING GIN (hierarchy);
