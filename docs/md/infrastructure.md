# Production Infrastructure

## Overview

| Layer | Service | Notes |
|---|---|---|
| Next.js web | Vercel | Auto-deploy from `main` |
| Python workers | Railway | Manual deploy or CI trigger |
| PostgreSQL | Supabase (or Railway Postgres) | pgvector extension required |
| Auth + Storage | Supabase | Auth, private `resumes` bucket |
| Redis | Railway | Redis 7 service |

---

## Components

### Vercel (Next.js web)

- `vercel.json` at repo root configures build.
- `rootDirectory` is `apps/web`; Vercel runs `npm ci` from the monorepo root then builds with `npm run build --workspace=apps/web`.
- Auto-deploys on every push to `main`. Preview deploys on PRs.
- Required environment variables (set in Vercel dashboard under Project → Settings → Environment Variables):

  ```
  NODE_ENV=production
  NEXT_PUBLIC_APP_URL=https://job-globe.com
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=...
  AUTH_SECRET=...
  DATABASE_URL=...        # Supabase direct connection string
  REDIS_URL=...           # Railway Redis internal URL
  OPENAI_API_KEY=...
  RESEND_API_KEY=...
  ALERT_FROM_EMAIL=alerts@job-globe.com
  QUICK_PREP_MODEL=gpt-4o-mini
  QUICK_PREP_CACHE_TTL_HOURS=24
  ```

### Railway (Python workers + Redis)

- `railway.json` at repo root configures the workers service.
- Build: `infra/docker/Dockerfile.workers` (DOCKERFILE builder).
- Start command: `python -m job_globe_workers`
- Restart policy: ON_FAILURE, max 5 retries.
- Redis is provisioned as a separate Railway service using the `redis:7-alpine` template.
- Required environment variables (set in Railway dashboard or via `railway variables --set`):

  ```
  DATABASE_URL=...
  REDIS_URL=...
  OPENAI_API_KEY=...
  ADZUNA_APP_ID=...
  ADZUNA_APP_KEY=...
  USAJOBS_API_KEY=...
  GREENHOUSE_BOARD_TOKENS=...
  LEVER_COMPANY_SLUGS=...
  WORKABLE_API_TOKEN=...
  WORKABLE_COMPANY_SLUGS=...
  GREENHOUSE_WEBHOOK_SECRET=...
  LEVER_WEBHOOK_SECRET=...
  REDIS_CONSUMER_GROUP=job-globe-workers
  REDIS_CONSUMER_NAME=worker-0
  REDIS_MAX_RETRIES=3
  AUDIT_CLEANUP_INTERVAL_HOURS=24
  RAILWAY_PROJECT_ID=...
  ```

### Supabase (PostgreSQL + Auth + Storage)

- Existing project. pgvector extension must be enabled (`CREATE EXTENSION IF NOT EXISTS vector`).
- Auth provider handles user sessions; `SUPABASE_SERVICE_ROLE_KEY` is used server-side only.
- Private bucket `resumes` stores uploaded CVs. Retention controlled by `RESUME_RAW_RETENTION_DAYS`.

---

## How to Deploy

### First-time setup

1. **Vercel**
   ```bash
   npx vercel login
   npx vercel link          # link to existing project or create new
   # Set all env vars in the Vercel dashboard, then:
   npx vercel --prod
   ```
   After the first deploy, Vercel auto-deploys on every push to `main`.

2. **Railway workers**
   ```bash
   chmod +x infra/scripts/railway-deploy.sh
   ./infra/scripts/railway-deploy.sh
   ```
   The script installs the Railway CLI if needed, prompts for login and project link, syncs non-placeholder env vars from `.env`, then runs `railway up --detach`.

3. **Database migrations**
   ```bash
   DATABASE_URL=<connection-string> ./infra/scripts/migrate-and-seed.sh
   # Skip demo data in production:
   DATABASE_URL=<connection-string> ./infra/scripts/migrate-and-seed.sh --no-demo
   ```

### Subsequent deploys

- **Web**: push to `main` — Vercel deploys automatically.
- **Workers**: run `railway up --detach` from the repo root (or trigger via CI — see below).

### CI (GitHub Actions)

Add these secrets to the repo:
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — for web deploys.
- `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID` — for worker deploys.

---

## Health Check Endpoints

| Service | Endpoint | Expected response |
|---|---|---|
| Next.js web | `GET /api/health` | `200 {"status":"ok"}` |
| Workers | Process liveness (Railway monitors process exit code) | N/A — no HTTP server |

The workers log a structured health line via `log_health_loop` every 60 s (visible in `railway logs`).

---

## Environment Variable Mapping

| Variable | Vercel | Railway workers | Local `.env` |
|---|---|---|---|
| `DATABASE_URL` | Yes | Yes | Yes |
| `REDIS_URL` | Yes | Yes | Yes |
| `NEXT_PUBLIC_*` | Yes | No | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | No | Yes |
| `OPENAI_API_KEY` | Yes | Yes | Yes |
| `ADZUNA_APP_ID/KEY` | No | Yes | Yes |
| `USAJOBS_API_KEY` | No | Yes | Yes |
| `GREENHOUSE_*` | No | Yes | Yes |
| `LEVER_*` | No | Yes | Yes |
| `RESEND_API_KEY` | Yes | No | Yes |
| `REDIS_CONSUMER_GROUP` | No | Yes | Yes |
| `RAILWAY_PROJECT_ID` | No | No | Yes (local deploy script) |

---

## Rollback Procedure

### Vercel (web)

1. Open Vercel dashboard → Deployments.
2. Find the last good deployment, click the three-dot menu → **Redeploy** (promotes it to production instantly, no rebuild).

### Railway (workers)

```bash
# List recent deploys
railway deployments

# Rollback to a specific deployment ID
railway rollback <deployment-id>
```

Or push a revert commit to trigger a fresh deploy:
```bash
git revert HEAD --no-edit
git push origin main
railway up --detach
```

### Database

Migrations are forward-only (no automated rollback). To undo a migration:
1. Write a new migration file that reverses the change (e.g., `DROP COLUMN`, `DROP TABLE`).
2. Run `migrate-and-seed.sh --no-seed` against the target database.

---

## Local Production Smoke Test

```bash
cp .env.example .env   # fill in real values
docker compose -f infra/docker/docker-compose.prod.yml up --build
# Web available at http://localhost:3000
```
