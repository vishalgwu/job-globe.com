INSERT INTO job_taxonomy (category, value, synonyms, metadata) VALUES
  ('function', 'software-engineering', ARRAY['backend', 'frontend', 'full-stack'], '{"step":"foundation"}'::jsonb),
  ('function', 'data-analytics', ARRAY['analytics', 'business-intelligence'], '{}'::jsonb),
  ('function', 'machine-learning', ARRAY['ai', 'ml-engineering'], '{}'::jsonb),
  ('function', 'product-management', ARRAY['product', 'pm'], '{}'::jsonb),
  ('function', 'design', ARRAY['ux', 'ui'], '{}'::jsonb),
  ('function', 'security', ARRAY['cybersecurity', 'appsec'], '{}'::jsonb),
  ('function', 'operations', ARRAY['devops', 'platform'], '{}'::jsonb),
  ('function', 'sales', ARRAY['account-executive', 'growth'], '{}'::jsonb),
  ('seniority', 'intern', ARRAY['student'], '{}'::jsonb),
  ('seniority', 'entry', ARRAY['junior', 'new-grad'], '{}'::jsonb),
  ('seniority', 'mid', ARRAY['experienced'], '{}'::jsonb),
  ('seniority', 'senior', ARRAY['staff'], '{}'::jsonb),
  ('remote_type', 'onsite', ARRAY[]::text[], '{}'::jsonb),
  ('remote_type', 'hybrid', ARRAY[]::text[], '{}'::jsonb),
  ('remote_type', 'remote', ARRAY[]::text[], '{}'::jsonb),
  ('employment_type', 'full-time', ARRAY['fte'], '{}'::jsonb),
  ('employment_type', 'contract', ARRAY['consulting'], '{}'::jsonb)
ON CONFLICT (category, value) DO UPDATE SET synonyms = EXCLUDED.synonyms, metadata = EXCLUDED.metadata;
