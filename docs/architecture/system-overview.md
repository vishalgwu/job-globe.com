# System Overview

Jarvis Job Globe is a full-stack job discovery platform. The architecture separates a Next.js web app from a Python worker pipeline, connected through a PostgreSQL database and a Redis Streams event bus.

## Components

### Web app (`apps/web`)

Next.js 14 App Router deployed to Vercel. Handles:

- Globe rendering (globe.gl / Three.js / Deck.gl)
- Supabase Auth — cookie-based SSR sessions via `@supabase/ssr`
- Onboarding (profile questionnaire + resume upload)
- Authenticated profile, saved jobs, and alerts pages
- Job detail with live rule-based match scoring for signed-in users
- All `/api/*` routes reading from Supabase via the service-role key

### Worker plane (`apps/workers`)

Python 3.11 multi-threaded process running as a Docker container. Runs the full ingestion pipeline:

1. **Discovery runner** — fetches from 7 source connectors, publishes `RawJobEvent` to Redis Stream `job-globe.discovery`
2. **Verification worker** — HTTP HEAD-checks apply URLs, computes trust scores, filters dead links
3. **Company identity resolver** — domain extraction, Clearbit logo fetch, trust score, upserts `companies`
4. **Geo mapper** — matches city to ~200 hardcoded centroids or pycountry country fallback, upserts `locations`
5. **Taxonomy tagger** — rule-based classification of function/seniority/remote_type/employment_type with confidence
6. **Duplicate detector** — fingerprint dedup, idempotent upsert into `jobs_canonical`

The observability health module logs queue depth, source freshness, and 24-hour ingestion volume every 5 minutes.

### Shared packages

- `packages/database` — 13 SQL migrations, seed data, migration validation scripts
- `packages/shared-types` — TypeScript and Python (Pydantic) contracts for jobs, companies, locations, profiles, and match results
- `packages/config` — environment variable templates

### Infrastructure (`infra`)

- `infra/docker/` — Docker Compose for local dev (PostgreSQL 15 + pgvector, Redis 7, web, workers)
- `infra/scripts/` — deploy, migration, and seed scripts
- `infra/terraform/` — cloud infrastructure placeholders (not yet active)

## Data flow

```
Source APIs
    │  fetch on freshness schedule
    ▼
Discovery Runner → Redis Stream (job-globe.discovery)
    │  consume
    ▼
Verification → Company Identity → Geo Mapping → Taxonomy → Duplicate Detection
    │  upsert
    ▼
jobs_canonical (PostgreSQL / Supabase)
    │  read
    ▼
/api/jobs → Globe UI
```

The web app reads only. Workers write only. No shared application code crosses the boundary.

## Auth flow

```
Browser → Supabase Auth (email/password) → HttpOnly session cookie
API routes → resolveRequestUser() → Supabase JWT verification → internal users table
```

Anonymous users can browse and save jobs to session storage. Authenticated users get profile persistence, resume storage, real match scores, and (Phase 5) alerts.

## Key design decisions

| Decision | ADR |
|---|---|
| Monorepo structure | ADR-001 |
| PostgreSQL + Supabase | ADR-002 |
| globe.gl for 3-D rendering | ADR-003 |
| Embedding model (deferred) | ADR-004 |
| Supabase Auth | ADR-005 |

See `docs/decisions/` for full ADRs.
