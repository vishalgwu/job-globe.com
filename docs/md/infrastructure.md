# Production Infrastructure

Updated: 2026-05-11

This document describes intended infrastructure plus the current config state. Deployment is scaffolded, not production-proven.

## Overview

| Layer | Intended service | Current status |
|---|---|---|
| Next.js web | Vercel | Config exists in `vercel.json`; production deployment not verified in this audit. |
| Python workers | Railway | Config exists in `railway.json`; deployment not verified in this audit. |
| PostgreSQL | Supabase or managed Postgres with pgvector | SQL migrations validate locally: 16 files, 21 tables. |
| Auth + Storage | Supabase | Code uses Supabase Auth and private `resumes` bucket. Storage policies require review. |
| Redis | Railway Redis or compatible Redis | Stream publishing/legacy reads exist. Consumer groups are scaffolded but not active. |
| Email | Resend | Sender code exists; end-to-end delivery not verified and likely needs user-email lookup fix. |
| AI | OpenAI | Route/worker code references OpenAI; web lockfile currently missing dependency. |

## Current Config Files

| File | Status | Notes |
|---|---|---|
| `vercel.json` | ⚠️ In Progress | Points to `apps/web`; depends on fixed web dependency lockfile. |
| `railway.json` | ⚠️ In Progress | Points to worker Dockerfile and starts `python -m job_globe_workers`. |
| `infra/docker/docker-compose.dev.yml` | ⚠️ In Progress | Defines local Postgres, Redis, web, workers. |
| `infra/docker/docker-compose.prod.yml` | ⚠️ In Progress | Production-like local smoke setup, not actual production infra. |
| `infra/docker/Dockerfile.web` | ❌ Broken | Contains invalid Dockerfile syntax in a `COPY` instruction. |
| `infra/docker/Dockerfile.workers` | ⚠️ In Progress | Worker image config exists; not verified in this audit. |
| `.github/workflows/ci.yml` | ❌ Stale | Still expects 13 migrations/17 tables; current repo has 16/21. |
| `.github/workflows/deploy-staging.yml` | ❌ Placeholder | Echo-only handoff job. |
| `infra/terraform/*` | ❌ Placeholder | No real modules/variables/outputs. |
| `infra/load-tests/jobs-api.js` | ⚠️ In Progress | k6 script exists; no recorded baseline results. |

## Required Environment Variables

### Vercel Web

```text
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://job-globe.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AUTH_SECRET=...
DATABASE_URL=...
REDIS_URL=...
OPENAI_API_KEY=...
RESEND_API_KEY=...
ALERT_FROM_EMAIL=alerts@job-globe.com
QUICK_PREP_MODEL=gpt-4o-mini
QUICK_PREP_CACHE_TTL_HOURS=24
GREENHOUSE_WEBHOOK_SECRET=...
LEVER_WEBHOOK_SECRET=...
```

### Railway Workers

```text
DATABASE_URL=...
REDIS_URL=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
RESEND_API_KEY=...
ALERT_FROM_EMAIL=alerts@job-globe.com
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
USAJOBS_API_KEY=...
USAJOBS_USER_AGENT=...
GREENHOUSE_BOARD_TOKENS=...
LEVER_COMPANY_SLUGS=...
WORKABLE_API_TOKEN=...
WORKABLE_COMPANY_SLUGS=...
SMARTRECRUITERS_COMPANY_IDS=...
REDIS_CONSUMER_GROUP=job-globe-workers
REDIS_CONSUMER_NAME=worker-0
REDIS_MAX_RETRIES=3
AUDIT_CLEANUP_INTERVAL_HOURS=24
```

## Deployment Readiness Checklist

Before treating deployment as production-ready:

1. Fix `package-lock.json` so `npm ci`, typecheck, and build can resolve all web dependencies.
2. Fix `Dockerfile.web`.
3. Update CI migration/table assertions to 16/21.
4. Run `npm run lint`, `npm run typecheck`, `npm run build`, and web tests successfully.
5. Run worker ruff, mypy, and pytest successfully.
6. Apply migrations to staging and confirm `schema_migrations` count.
7. Confirm Supabase RLS and Storage bucket policy for `resumes`.
8. Confirm account deletion removes/anonymizes every required record and raw Storage object.
9. Confirm worker deployment can connect to Postgres, Redis, Supabase Storage, OpenAI, and Resend.
10. Run k6 load test and save baseline results.
11. Complete security review and legal/privacy review.

## Local Commands

Run web only:

```powershell
npm run dev:web
```

Run local services:

```powershell
npm run dev
```

Validate migrations:

```powershell
.\.venv-job-globe\Scripts\python.exe packages/database/scripts/validate_migrations.py packages/database/migrations
```

Apply migrations:

```powershell
.\.venv-job-globe\Scripts\python.exe packages/database/scripts/apply_migrations.py packages/database/migrations
```

Run load test after a target is available:

```bash
BASE_URL=https://your-app.vercel.app k6 run infra/load-tests/jobs-api.js
```

## Rollback Notes

### Vercel

Rollback through the Vercel dashboard by promoting/redeploying the last good deployment. This has not been proven in this repo audit.

### Railway

```bash
railway deployments
railway rollback <deployment-id>
```

This has not been proven in this repo audit.

### Database

Migrations are forward-only. To reverse a database change, write a new migration that safely undoes or replaces the previous change.

## Known Infrastructure Risks

- Production deployment has not been verified.
- Docker web build is currently blocked by invalid syntax.
- CI is stale and will not accurately validate current migrations.
- Secrets are environment-driven, but actual production values and provider setup are not verified.
- Redis reliable-processing behavior is not active until workers use consumer groups and acknowledgements.
- Observability is insufficient for production: logs exist, but traces, dashboards, and alerting are missing.
