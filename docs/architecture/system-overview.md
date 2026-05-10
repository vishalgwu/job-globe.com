# System Overview

Jarvis Job Globe is a full-stack job discovery platform. It separates a Next.js web app from a Python worker pipeline, connected through Supabase/PostgreSQL and Redis Streams.

For maintained handoff docs, see:

- `docs/md/PROJECT_STATUS.md`
- `docs/md/FRONTEND.md`
- `docs/md/API.md`
- `docs/md/WORKERS.md`
- `docs/md/DATABASE.md`
- `docs/md/INFRASTRUCTURE.md`

## Components

### Web App

Location: `apps/web`

The web app handles:

- globe browsing and fallback list/map behavior
- search and filters
- job list and job detail panel
- Supabase auth pages and session-aware APIs
- onboarding, profile, resume, saved jobs, alerts, and application history
- route handlers under `apps/web/app/api`

### Worker Plane

Location: `apps/workers/src/job_globe_workers`

The worker package handles:

1. discovery from configured job sources
2. Redis Streams publication/consumption
3. URL verification
4. company identity enrichment
5. geo mapping
6. taxonomy tagging
7. duplicate detection and canonical job upserts
8. worker health logging

### Database

Location: `packages/database`

The schema is PostgreSQL with pgvector support. Migrations define users, profiles, resumes, companies, locations, raw/canonical jobs, taxonomy, embeddings, saved jobs, applications, alerts, agent runs, and audit events.

### Shared Packages

Location: `packages/shared-types`, `packages/config`

TypeScript contracts are used by the web app. Python contract files exist for future alignment. Config templates document environment variables by target environment.

### Infrastructure

Location: `infra`, `.github`

Docker Compose supports local development. GitHub Actions runs web, worker, and database checks. Vercel deploys the web app from `main`. Terraform files currently contain placeholders only.

## Data Flow

```text
External job APIs
  -> discovery runner
  -> Redis Stream
  -> verification
  -> company identity / geo / taxonomy
  -> duplicate detection
  -> jobs_canonical in PostgreSQL
  -> /api/jobs
  -> globe UI
```

## Auth Flow

```text
Browser
  -> Supabase Auth
  -> HttpOnly session cookie
  -> API route resolveRequestUser()
  -> internal users table
```

Anonymous users can browse jobs. Authenticated users can persist profiles, resumes, saved jobs, alerts, applications, and receive personalized match details.
