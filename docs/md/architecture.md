# Architecture

This document describes the architecture that exists in the repository today. Planned functionality is listed only when it is missing or partial.

## Current Architecture

```text
Browser
  -> Next.js App Router pages and client components
  -> Next.js route handlers under apps/web/app/api
  -> Supabase Auth, PostgreSQL, and Storage

Python workers
  -> external job-source APIs
  -> Redis Streams
  -> PostgreSQL raw and canonical job tables

PostgreSQL
  -> users, profiles, resumes, jobs, companies, locations,
     taxonomy, saved jobs, applications, alerts, embeddings,
     agent runs, and audit events
```

Repository shape:

```text
apps/
  web/                 Next.js frontend and API routes
  workers/             Python worker package and tests
  jarvis-job-globe/    Static prototype/reference app
packages/
  database/            SQL migrations, seeds, and migration scripts
  shared-types/        TypeScript contracts and partial Python contracts
  config/              Environment templates
infra/
  docker/              Local Docker Compose files and Dockerfiles
  scripts/             Migration, seed, and deploy helper scripts
  terraform/           Placeholder infrastructure files
docs/
  md/                  Maintained status, architecture, handoff, and gap docs
  decisions/           ADRs and privacy framework
  whole_project/       Reference DOCX product plan/spec
.github/
  workflows/           CI and staging deployment placeholder
```

## Completed Features

- Next.js App Router app with globe, auth, onboarding, profile, saved jobs, applications, and alerts pages.
- Route handlers for jobs, health, auth session/refresh/logout, profile, resume, saved jobs, applications, and alerts.
- Draft `/privacy` notice route for controlled demos.
- Supabase auth resolution into the internal `users` table.
- Supabase Storage resume upload, signed URL read, and raw object delete.
- Application redirects are recorded through `POST /api/applications` before the Apply CTA opens the external URL.
- Audit-event writes exist for selected high-risk user and worker actions.
- PostgreSQL schema with 14 migrations, 17 application tables, pgvector, indexes, taxonomy seed, and demo job seed.
- Staging Supabase health, private `resumes` storage bucket, authenticated user flow, audit rows, and basic browser QA evidence were confirmed for controlled demos on 2026-05-11.
- Python worker package with discovery, verification, company identity, geo mapping, taxonomy tagging, canonical upsert, Redis helpers, and DB repositories.
- Source connector classes for Greenhouse, Lever, Adzuna, USAJOBS, EURES, Workable, and SmartRecruiters.
- Docker Compose for local Postgres, Redis, web, and workers.
- GitHub Actions CI for web, workers, and database validation.

## Web App

The web app lives in `apps/web` and uses Next.js App Router, React, TypeScript, Zustand, and Supabase clients.

Implemented pages:

- `/`
- `/login`
- `/register`
- `/onboarding`
- `/profile`
- `/saved`
- `/applications`
- `/alerts`
- `/privacy`

The active globe experience is implemented mainly in `components/globe/GlobeExperience`, `GlobeCanvas`, and `FallbackMap`. The UI exposes global, country, city/company, and role-marker views. The role-marker view is labelled "Neighbourhood" in the UI, but the API backs it with `mode=jobs`, not a separate neighbourhood data model.

Globe.GL, React Three Fiber, Three.js, and deck.gl are installed. The active rendering path currently uses React/CSS components and image assets rather than those libraries.

## API Layer

Implemented routes:

- `GET /api/jobs`
- `GET /api/health`
- `GET /api/auth/session`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/profile`
- `POST /api/profile`
- `GET /api/resume`
- `POST /api/resume`
- `DELETE /api/resume`
- `GET /api/saved-jobs`
- `POST /api/saved-jobs`
- `DELETE /api/saved-jobs`
- `GET /api/alerts`
- `POST /api/alerts`
- `PATCH /api/alerts`
- `DELETE /api/alerts`
- `GET /api/applications`
- `POST /api/applications`

Protected routes call `resolveRequestUser()` from `apps/web/lib/supabase/auth.ts`, which resolves the Supabase session into an internal `users` row.

## Job Data Flow

The web job API reads from Supabase/PostgreSQL through `apps/web/lib/jobs/supabaseJobs.ts`.

```text
/api/jobs?mode=global   -> country-level rollups
/api/jobs?mode=country  -> city-level rollups
/api/jobs?mode=city     -> company bubbles and markers
/api/jobs?mode=jobs     -> job summaries
/api/jobs?mode=detail   -> one job detail, with profile-aware scoring when available
```

The route supports filters for category, country, city, remote mode, job type, posted window, and free-text query.

## Worker Workflow

The active worker implementation is under `apps/workers/src/job_globe_workers`.

```text
Discovery runner
  -> Redis discovery stream
  -> Verification worker
  -> Redis verification stream
  -> Company identity worker
  -> Redis canonical stream
  -> Duplicate detection / canonical upsert
  -> jobs_canonical
```

The active worker package lives under `apps/workers/src/job_globe_workers`. The earlier top-level placeholder worker folders have been removed so the package path is the source of truth.

## In Progress

- Resume upload and raw delete exist, but PDF/DOCX parsing, structured extraction, correction UI, and retention jobs are missing.
- Match breakdown UI and rule-based scoring exist, but embeddings and pgvector retrieval are not active.
- Alerts CRUD exists, but there is no background evaluator, notification feed, or email delivery.
- `audit_events` is written for key Phase 1 actions, but full audit administration, retention, and coverage are not complete.
- Terraform and staging deployment files are placeholders.

## Remaining Work

- Implement resume parsing, embeddings, alert delivery, and generated quick-prep.
- Add Redis consumer groups, acknowledgement, retry, and dead-letter handling.
- Define production worker deployment, observability, rollback, backup/restore, and launch QA evidence.

## Current State

The architecture is a working foundation, not a production launch system. The web app, API layer, schema, staging Supabase configuration, and worker pipeline code are present. The planned AI, alerting, privacy self-service, infrastructure, and observability layers are incomplete.
