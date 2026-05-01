# Achieved To Date

Last updated: 2026-05-01

This file records only work that is visible in the repository, verified through local commands, or verified through the live production endpoints. It does not include secrets.

## Verified Baseline

- The repository is on `main` and is pushed to GitHub.
- The private root `.env` file is ignored by Git.
- The current Node baseline uses `npm` and `package-lock.json`.
- Root scripts exist for local development, lint, typecheck, build, migration validation, and migration application.
- Docker Compose starts PostgreSQL 15 with pgvector, Redis 7, the web app, and workers from `infra/docker/docker-compose.dev.yml`.
- CI runs web lint, typecheck, build, worker checks, worker tests, and database migration validation.

## Supabase

- Supabase project metadata is recorded in `docs/setup/deployment-inventory.md`.
- Project name: `job-globe-staging`.
- Project ref: `mqfiocolakvqkpvxlafk`.
- Project URL: `https://mqfiocolakvqkpvxlafk.supabase.co`.
- Region: `us-east-1`.
- PostgreSQL pooler metadata is recorded without passwords.
- All SQL migrations have been run against Supabase staging.
- Migration history is tracked in `public.schema_migrations`.
- The production health check verifies 12 migration records.
- The production health check verifies 200 active job records are reachable.

## Web And APIs

- The production web app is deployed at `https://job-globe-com-web.vercel.app/`.
- `/api/health` is the canonical health endpoint for Docker, Vercel, and Supabase checks.
- Production `/api/health` returns HTTP 200 with:
  - `environment=ok`
  - `supabase.jobs=ok`
  - `supabase.migrations=ok`
- `/api/jobs` reads from Supabase and returns `source: "supabase"`.
- `/api/jobs?mode=global` returns country-level data from Supabase.
- `/api/jobs?mode=jobs` returns job list data from Supabase.
- `/api/jobs?mode=detail&id=<job-id>` returns one Supabase-backed job detail record.
- The Jobs API contract is documented in `docs/api/jobs-api.md`.

## Product Surface

- The main globe route exists as an interactive app surface.
- Global, country, city, and neighbourhood layer states exist in the UI.
- Search and filters call the Jobs API.
- Job detail panel, apply CTA, save CTA, match placeholder, and quick-prep placeholder exist.
- Onboarding UI exists with profile questions and a resume upload placeholder.
- Anonymous saved jobs use browser session storage.

## Deployment And Verification

- Vercel project: `job-globe-com-web`.
- Vercel owner: `vishalgwu`.
- Production branch: `main`.
- Vercel production deployment is successful.
- The previous production blocker for `NEXT_PUBLIC_SUPABASE_URL` is resolved.
- GitHub Actions CI passed for application commit `8318734`.
- Vercel reported success for application commit `8318734`.
- Vercel verification and rollback steps are documented in `docs/runbooks/vercel-deployment.md`.

## Explicitly Not Complete Yet

- `/api/profile` is still a safe demo-mode stub and does not persist profiles to Supabase.
- `/api/alerts` is still a placeholder.
- Real source ingestion agents are not implemented in the repo.
- Resume parsing and private resume storage are not implemented.
- Authenticated saved jobs, applications, and alert subscriptions are not complete.
- Match scoring, embeddings, and personalized ranking are not complete.
- External QA evidence for Lighthouse, device/browser matrix, VoiceOver, and NVDA is not recorded as complete.
