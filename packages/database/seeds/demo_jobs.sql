INSERT INTO users (id, auth_provider, auth_subject, email, role, display_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'supabase', 'demo-member', 'demo@job-globe.local', 'member', 'Demo Member'),
  ('00000000-0000-0000-0000-000000000002', 'supabase', 'demo-admin', 'admin@job-globe.local', 'admin', 'Demo Admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (user_id, headline, preferred_locations, preferred_remote_type, skills) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Global software candidate', ARRAY['New York','London','Toronto'], 'hybrid', '["TypeScript","Python","SQL"]'::jsonb)
ON CONFLICT (user_id) DO UPDATE SET headline = EXCLUDED.headline, skills = EXCLUDED.skills;

WITH location_seed(country_code, country_name, region, city, latitude, longitude) AS (
  VALUES
    ('US','United States','New York','New York',40.7128,-74.0060), ('US','United States','California','San Francisco',37.7749,-122.4194),
    ('CA','Canada','Ontario','Toronto',43.6532,-79.3832), ('CA','Canada','British Columbia','Vancouver',49.2827,-123.1207),
    ('GB','United Kingdom','England','London',51.5072,-0.1276), ('GB','United Kingdom','England','Manchester',53.4808,-2.2426),
    ('DE','Germany','Berlin','Berlin',52.5200,13.4050), ('DE','Germany','Bavaria','Munich',48.1351,11.5820),
    ('FR','France','Ile-de-France','Paris',48.8566,2.3522), ('FR','France','Auvergne-Rhone-Alpes','Lyon',45.7640,4.8357),
    ('IN','India','Karnataka','Bengaluru',12.9716,77.5946), ('IN','India','Telangana','Hyderabad',17.3850,78.4867),
    ('JP','Japan','Tokyo','Tokyo',35.6762,139.6503), ('JP','Japan','Osaka','Osaka',34.6937,135.5023),
    ('AU','Australia','New South Wales','Sydney',-33.8688,151.2093), ('AU','Australia','Victoria','Melbourne',-37.8136,144.9631),
    ('BR','Brazil','Sao Paulo','Sao Paulo',-23.5558,-46.6396), ('BR','Brazil','Rio de Janeiro','Rio de Janeiro',-22.9068,-43.1729),
    ('SG','Singapore','Central','Singapore',1.3521,103.8198), ('SG','Singapore','West','Jurong East',1.3329,103.7436)
)
INSERT INTO locations (country_code, country_name, region, city, latitude, longitude, hierarchy)
SELECT country_code, country_name, region, city, latitude, longitude, jsonb_build_object('source', 'demo')
FROM location_seed
ON CONFLICT (country_code, region, city) DO NOTHING;

WITH company_seed(name, domain) AS (
  VALUES
    ('Aster Labs','aster-labs.example'), ('Blue Harbor Systems','blue-harbor.example'), ('Cloudbridge AI','cloudbridge-ai.example'),
    ('Datum Works','datum-works.example'), ('Evergreen Robotics','evergreen-robotics.example'), ('Forte Finance','forte-finance.example'),
    ('Helio Health','helio-health.example'), ('IonGrid','iongrid.example'), ('Juniper Learning','juniper-learning.example'),
    ('Keystone Mobility','keystone-mobility.example'), ('Luma Retail','luma-retail.example'), ('Northstar Security','northstar-security.example'),
    ('Orbit Supply','orbit-supply.example'), ('Pioneer Climate','pioneer-climate.example'), ('Quantum Talent','quantum-talent.example')
)
INSERT INTO companies (name, domain, trust_score, source_metadata)
SELECT name, domain, 80, '{"source":"demo"}'::jsonb FROM company_seed
ON CONFLICT (domain) DO UPDATE SET name = EXCLUDED.name;

WITH generated AS (
  SELECT
    n,
    (ARRAY['greenhouse','lever','smartrecruiters','workable','usajobs','eures','adzuna'])[1 + ((n - 1) % 7)] AS source,
    (ARRAY['software-engineering','data-analytics','machine-learning','product-management','design','security','operations','sales'])[1 + ((n - 1) % 8)] AS category,
    (ARRAY['onsite','hybrid','remote','unknown'])[1 + ((n - 1) % 4)]::job_remote_type AS remote_type,
    (ARRAY['entry','mid','senior','intern'])[1 + ((n - 1) % 4)] AS seniority,
    (ARRAY['TypeScript','Python','SQL','React','PostgreSQL','Redis','Product Strategy','UX Research','Security Review','Machine Learning'])[1 + ((n - 1) % 10)] AS skill_a,
    (ARRAY['TypeScript','Python','SQL','React','PostgreSQL','Redis','Product Strategy','UX Research','Security Review','Machine Learning'])[1 + (n % 10)] AS skill_b
  FROM generate_series(1, 200) AS n
), raw_upsert AS (
  INSERT INTO jobs_raw (source, source_job_id, source_url, payload)
  SELECT source, 'demo-' || n, 'https://jobs.example/demo-' || n, jsonb_build_object('demo', true, 'category', category)
  FROM generated
  ON CONFLICT (source, source_job_id) DO UPDATE SET payload = EXCLUDED.payload
  RETURNING id, source, source_job_id
), canonical_insert AS (
  INSERT INTO jobs_canonical (raw_job_id, company_id, location_id, title, description, employment_type, remote_type, seniority, apply_url, salary_min, salary_max, currency, required_skills, status)
  SELECT
    raw_upsert.id,
    (SELECT id FROM companies ORDER BY name OFFSET ((generated.n - 1) % 15) LIMIT 1),
    (SELECT id FROM locations ORDER BY country_code, city OFFSET ((generated.n - 1) % 20) LIMIT 1),
    initcap(replace(generated.category, '-', ' ')) || ' Specialist ' || generated.n,
    'Synthetic ' || generated.category || ' role for Step 1 demo data across global job clusters.',
    'full-time', generated.remote_type, generated.seniority,
    'https://jobs.example/apply/demo-' || generated.n,
    70000, 120000, 'USD', ARRAY[generated.skill_a, generated.skill_b], 'active'
  FROM generated
  JOIN raw_upsert ON raw_upsert.source_job_id = 'demo-' || generated.n
  WHERE NOT EXISTS (SELECT 1 FROM jobs_canonical WHERE apply_url = 'https://jobs.example/apply/demo-' || generated.n)
  RETURNING id, title
)
INSERT INTO job_taxonomy_links (job_id, taxonomy_id, confidence)
SELECT canonical_insert.id, job_taxonomy.id, 0.9500
FROM canonical_insert
JOIN job_taxonomy ON canonical_insert.title ILIKE initcap(replace(job_taxonomy.value, '-', ' ')) || '%'
WHERE job_taxonomy.category = 'function'
ON CONFLICT (job_id, taxonomy_id) DO NOTHING;

INSERT INTO saved_jobs (user_id, job_id, notes)
SELECT '00000000-0000-0000-0000-000000000001', id, 'Demo saved job'
FROM jobs_canonical
ORDER BY first_seen_at
LIMIT 5
ON CONFLICT (user_id, job_id) DO NOTHING;
