# Jarvis Job Globe

An interactive 3-D globe for discovering jobs worldwide. Users spin the globe, drill from country → city → neighbourhood, filter by role/remote/type, and get personalised match scores and interview prep once they sign in.

**Live production:** https://job-globe-com-web.vercel.app/

---

## Table of Contents

1. [What This Is](#what-this-is)
2. [Architecture Overview](#architecture-overview)
3. [Tech Stack](#tech-stack)
4. [Folder Structure](#folder-structure)
5. [Local Development](#local-development)
6. [Environment Variables](#environment-variables)
7. [Data Ingestion Pipeline](#data-ingestion-pipeline)
8. [Web App & API Routes](#web-app--api-routes)
9. [Authentication Flow](#authentication-flow)
10. [Match Scoring System](#match-scoring-system)
11. [Database Schema](#database-schema)
12. [Testing](#testing)
13. [CI/CD](#cicd)
14. [Deployment](#deployment)
15. [Project Status](#project-status)
16. [Key Documentation](#key-documentation)

---

## What This Is

Jarvis Job Globe is a full-stack job discovery platform built as a monorepo. The web front-end renders an interactive 3-D globe (via `globe.gl` / Three.js) that shows live job density worldwide. Clicking into a country, city, or neighbourhood reveals filtered job listings pulled from a canonical PostgreSQL database that is continuously populated by a Python worker pipeline.

Signed-in users complete a short onboarding questionnaire, optionally upload a resume, and receive personalised match scores and interview prep for every job they view.

---

## Architecture Overview

```
Browser
  └── Next.js (apps/web, Vercel)
        ├── Globe UI  ──► /api/jobs  (Supabase reads)
        ├── Auth pages ──► Supabase Auth (cookie-based SSR sessions)
        ├── Profile/saved pages ──► /api/profile, /api/resume, /api/saved-jobs
        └── Job detail ──► /api/jobs?mode=detail  (rule-based match scoring)

Python worker plane (apps/workers, Docker)
  Discovery runner
    └── 7 source connectors → Redis Stream: job-globe.discovery
  Verification worker
    └── HTTP HEAD checks → URL trust scores
  Company identity resolver
    └── domain extraction + Clearbit logos → companies table
  Geo mapper
    └── ~200 city centroids + pycountry fallback → locations table
  Taxonomy tagger
    └── rule-based function/seniority/remote/type → job_taxonomy_links
  Duplicate detector + canonical merge
    └── fingerprint dedup → jobs_canonical table

Shared infrastructure
  PostgreSQL 15 + pgvector (Supabase staging: mqfiocolakvqkpvxlafk)
  Redis 7 (Streams event bus)
  Supabase Storage (private resume bucket)
```

Data flows one way: source connectors → Redis → pipeline stages → `jobs_canonical` → `/api/jobs` → browser. The web app never writes directly to `jobs_canonical`; it only reads.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web framework | Next.js 14 (App Router) |
| Language (web) | TypeScript |
| Globe rendering | globe.gl, Three.js, Deck.gl |
| State management | Zustand |
| Auth | Supabase Auth (`@supabase/ssr` cookie-based SSR) |
| Database | PostgreSQL 15 + pgvector (Supabase) |
| Cache / event bus | Redis 7 (Streams) |
| Worker language | Python 3.11 |
| Worker HTTP | httpx |
| Worker validation | Pydantic v2 + pydantic-settings |
| Worker DB access | psycopg3 (connection pool) |
| Styling | Tailwind CSS |
| Web tests | Vitest (jsdom) |
| Worker tests | pytest |
| Lint / format | ESLint, Prettier, Ruff, Black |
| Type checking | tsc, mypy (strict) |
| CI | GitHub Actions |
| Hosting (web) | Vercel |
| Hosting (workers) | Docker Compose (local), Docker image (staging/prod) |

---

## Folder Structure

```
job-globe.com/
├── .env                          # Local secrets — git-ignored
├── .env.example                  # Safe template committed to repo
├── .github/
│   ├── CODEOWNERS
│   └── workflows/
│       ├── ci.yml                # Main CI: web lint/type/test/build, workers ruff/mypy/pytest, DB migrations
│       └── deploy-staging.yml
├── apps/
│   ├── web/                      # Next.js front-end (deployed to Vercel)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/        # Login page — Supabase signInWithPassword
│   │   │   │   ├── register/     # Register page — Supabase signUp + email confirm
│   │   │   │   └── onboarding/   # Onboarding questionnaire flow
│   │   │   ├── (globe)/
│   │   │   │   └── page.tsx      # Main globe route (app entry point)
│   │   │   ├── (profile)/
│   │   │   │   ├── profile/      # Profile page — prefs, resume view/delete
│   │   │   │   ├── saved/        # Saved jobs page
│   │   │   │   ├── alerts/       # Alerts page (placeholder — Phase 5)
│   │   │   │   └── applications/ # Applications page (placeholder — Phase 5)
│   │   │   └── api/
│   │   │       ├── health/       # GET /api/health — liveness + Supabase checks
│   │   │       ├── jobs/         # GET /api/jobs — global/country/city/jobs/detail modes
│   │   │       ├── auth/
│   │   │       │   ├── session/  # GET /api/auth/session — returns auth state + hasProfile
│   │   │       │   ├── refresh/  # POST /api/auth/refresh — refreshes Supabase JWT
│   │   │       │   └── logout/   # POST /api/auth/logout
│   │   │       ├── profile/      # GET/POST /api/profile — onboarding answers, authenticated
│   │   │       ├── resume/       # GET/POST/DELETE /api/resume — upload, signed URL, delete
│   │   │       ├── saved-jobs/   # GET/POST/DELETE /api/saved-jobs — authenticated saved jobs
│   │   │       └── alerts/       # GET/POST /api/alerts — placeholder (Phase 5)
│   │   ├── components/
│   │   │   ├── globe/            # GlobeExperience, GlobeCanvas, ZoomController, IntroOverlay, FallbackMap
│   │   │   ├── job-panel/        # JobPanel, ApplyCTA, MatchBreakdown, QuickPrepToolkit
│   │   │   ├── filters/          # FilterBar
│   │   │   ├── onboarding/       # OnboardingFlow, QuestionStep, ResumeUpload
│   │   │   ├── profile/          # PrivacyControls, ProfileEditor, SkillGraph (placeholders)
│   │   │   └── ui/               # Badge, Button, Card, Modal, Skeleton, Tooltip
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts     # createBrowserSupabaseClient() for client components
│   │   │   │   ├── server.ts     # createSSRSupabaseClient() for API routes
│   │   │   │   └── auth.ts       # resolveRequestUser() — cookie session → DB user
│   │   │   ├── jobs/
│   │   │   │   ├── supabaseJobs.ts   # All Supabase query functions + getJobDetailWithProfile()
│   │   │   │   └── filters.ts        # Filter parsing helpers
│   │   │   ├── match/
│   │   │   │   └── scorer.ts     # ruleBasedScore, cosineSimilarity, buildMatchBreakdown
│   │   │   ├── config/auth.ts    # Auth provider config
│   │   │   └── demo/jobs.ts      # Static demo fallback data
│   │   ├── stores/
│   │   │   ├── jobStore.ts       # Saved jobs — auth-aware (API sync) + anon (sessionStorage)
│   │   │   ├── globeStore.ts     # Globe layer/zoom/filter state
│   │   │   └── userStore.ts      # Auth user state
│   │   ├── hooks/
│   │   │   ├── useGlobeState.ts
│   │   │   ├── useJobPanel.ts
│   │   │   ├── useMatchScore.ts
│   │   │   └── useAlerts.ts
│   │   ├── __tests__/
│   │   │   ├── match-scorer.test.ts       # ruleBasedScore, cosineSimilarity, buildMatchBreakdown
│   │   │   ├── profile-validation.test.ts # All field rules + consent normalisation
│   │   │   └── auth-guards.test.ts        # Session shapes, 401 guard pattern
│   │   ├── vitest.config.ts
│   │   ├── next.config.mjs
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   ├── workers/                  # Python worker plane (runs as Docker container)
│   │   ├── src/job_globe_workers/
│   │   │   ├── agents/
│   │   │   │   ├── discovery/
│   │   │   │   │   ├── connectors/
│   │   │   │   │   │   ├── base.py          # AbstractConnector — retry, back-off, rate-limit, lazy httpx
│   │   │   │   │   │   ├── greenhouse.py    # Greenhouse public board API
│   │   │   │   │   │   ├── lever.py         # Lever public postings API
│   │   │   │   │   │   ├── adzuna.py        # Adzuna search API (requires ADZUNA_APP_ID/KEY)
│   │   │   │   │   │   ├── usajobs.py       # USA Jobs federal API (requires USAJOBS_API_KEY)
│   │   │   │   │   │   ├── eures.py         # EU EURES portal (no auth)
│   │   │   │   │   │   ├── workable.py      # Workable company subdomain API
│   │   │   │   │   │   └── smartrecruiters.py # SmartRecruiters public postings API
│   │   │   │   │   ├── runner.py            # Orchestrates connectors, respects freshness, writes agent_runs
│   │   │   │   │   └── scheduler.py         # Freshness rules per source
│   │   │   │   ├── verification/
│   │   │   │   │   ├── worker.py            # HTTP HEAD-checks apply URLs, stamps verified_live_at
│   │   │   │   │   └── url_checker.py       # Trust scoring: HTTPS + ATS domain + redirect depth
│   │   │   │   ├── company_identity/
│   │   │   │   │   ├── resolver.py          # Domain extraction, Clearbit logo, trust score, upsert companies
│   │   │   │   │   └── worker.py
│   │   │   │   ├── geo_mapping/
│   │   │   │   │   └── geocoder.py          # ~200 city centroids, pycountry country fallback, upsert locations
│   │   │   │   ├── categorisation/
│   │   │   │   │   └── tagger.py            # Rule-based function/seniority/remote_type/employment_type
│   │   │   │   └── duplicate_detection/
│   │   │   │       └── detector.py          # sha256 fingerprint dedup, upsert jobs_canonical
│   │   │   ├── db/
│   │   │   │   ├── connection.py            # psycopg3 connection pool
│   │   │   │   └── repositories/
│   │   │   │       ├── jobs.py              # jobs_raw + jobs_canonical (idempotent upserts)
│   │   │   │       ├── companies.py
│   │   │   │       ├── locations.py
│   │   │   │       ├── taxonomy.py
│   │   │   │       └── agent_runs.py
│   │   │   ├── event_bus/
│   │   │   │   ├── producer.py              # Publishes RawJobEvent to Redis Streams
│   │   │   │   └── consumer.py              # Consumes from Redis Streams
│   │   │   ├── observability/
│   │   │   │   ├── health.py                # Queue depth, source freshness, 24-hr summary (5-min loop)
│   │   │   │   ├── metrics.py
│   │   │   │   └── tracing.py
│   │   │   ├── parsers/
│   │   │   │   ├── normaliser.py            # Field normalisation shared across connectors
│   │   │   │   └── resume_extractor.py      # Resume NLP stub (Phase 5)
│   │   │   ├── scoring/
│   │   │   │   └── match_engine.py
│   │   │   ├── settings.py                  # Pydantic-settings: all env vars with defaults
│   │   │   ├── main.py                      # Multi-threaded entry point, SIGTERM-aware graceful shutdown
│   │   │   └── runtime.py                   # Shim: imports main() for Docker CMD
│   │   ├── tests/
│   │   │   └── agents/
│   │   │       ├── test_connectors.py
│   │   │       ├── test_url_checker.py
│   │   │       ├── test_company_identity.py
│   │   │       ├── test_geo_mapping.py
│   │   │       ├── test_categorisation.py
│   │   │       ├── test_duplicate_detection.py
│   │   │       └── test_scheduler.py
│   │   └── pyproject.toml
│   │
│   └── jarvis-job-globe/         # Original HTML prototype (reference only, not in build)
│
├── packages/
│   ├── database/
│   │   ├── migrations/           # 13 SQL migrations (001–013), applied in order
│   │   ├── seeds/                # demo_jobs.sql + taxonomy_reference.sql
│   │   └── scripts/
│   │       ├── apply_migrations.py    # Runs migrations against DATABASE_URL
│   │       └── validate_migrations.py # Checks file naming and ordering
│   ├── shared-types/
│   │   ├── typescript/           # job.ts, company.ts, location.ts, match.ts, profile.ts
│   │   └── python/               # job.py, company.py, location.py, match.py, profile.py (Pydantic)
│   └── config/
│       └── environments/         # .env.example files for dev/staging/prod
│
├── infra/
│   ├── docker/
│   │   ├── docker-compose.dev.yml    # PostgreSQL 15 + pgvector, Redis 7, web, workers
│   │   ├── docker-compose.test.yml
│   │   ├── Dockerfile.web
│   │   └── Dockerfile.workers
│   ├── scripts/
│   │   ├── deploy.sh
│   │   ├── run-migrations.sh
│   │   └── seed-demo-data.sh
│   └── terraform/                # Cloud infra placeholders (not yet active)
│
└── docs/
    ├── api/                      # API contracts: jobs-api.md, profile-api.md, alerts-api.md
    ├── architecture/             # system-overview.md, agent-event-flow.md, data-freshness-policy.md
    ├── decisions/                # ADR-001 through ADR-005, privacy-framework.md
    ├── design/                   # wireframe-approval-notes.md
    ├── project-status/
    │   ├── achieved-to-date.md   # Ground truth of what is built and verified
    │   └── remaining-work-phases.md  # Phase plan with completion status
    ├── qa/                       # Step completion reports, testing conventions
    ├── runbooks/                 # Operational runbooks for each agent and deployment
    ├── security/                 # branch-protection.md
    ├── setup/                    # deployment-inventory.md, secrets-management.md
    └── whole_project/            # Original project spec documents (.docx)
```

---

## Local Development

### Prerequisites

- Node.js >= 20, npm >= 10
- Docker Desktop (for PostgreSQL, Redis, and worker containers)
- Python 3.11 + a virtual environment (for running workers or tests outside Docker)

### One-command start

```powershell
# Windows
copy .env.example .env
# Fill in real values in .env (see Environment Variables section)

npm install
npm run dev
```

`npm run dev` runs `docker compose -f infra/docker/docker-compose.dev.yml up --build`, which starts:

- PostgreSQL 15 + pgvector on port 5432
- Redis 7 on port 6379
- Next.js web app on port 3000 (or 3001 in dev)
- Python workers container

### Web-only development (no Docker)

```powershell
# Start only the database and cache
docker compose -f infra/docker/docker-compose.dev.yml up -d postgres redis

# Run web app directly
npm run dev:web
```

### Python worker development

```powershell
# Create and activate a virtual environment
python -m venv .venv-job-globe
.\.venv-job-globe\Scripts\activate

# Install worker package in editable mode with dev extras
pip install -e "apps/workers[dev]"

# Run tests
pytest apps/workers/tests

# Lint and type-check
ruff check apps/workers
mypy apps/workers/src
```

### Run migrations manually

```powershell
# Validate migration files
python packages/database/scripts/validate_migrations.py packages/database/migrations

# Apply migrations to DATABASE_URL
python packages/database/scripts/apply_migrations.py packages/database/migrations
```

### Seed demo data (local only)

```powershell
docker compose -f infra/docker/docker-compose.dev.yml exec -T postgres \
  psql -U job_globe -d job_globe -v ON_ERROR_STOP=1 \
  -f packages/database/seeds/taxonomy_reference.sql \
  -f packages/database/seeds/demo_jobs.sql
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in each group. The `.env` file is git-ignored. Staging and production values live in Vercel project settings and GitHub Actions secrets — never committed.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service-role key (server only) |
| `DATABASE_URL` | Yes | Full PostgreSQL connection string with password |
| `AUTH_SECRET` | Yes | Random secret for session signing |
| `REDIS_URL` | Yes | Redis connection string |
| `REDIS_STREAM_DISCOVERY` | No | Stream name (default: `job-globe.discovery`) |
| `OPENAI_API_KEY` | No | Used for embeddings (Phase 5) |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | No | Required for Adzuna connector |
| `USAJOBS_API_KEY` | No | Required for USA Jobs connector |
| `STORAGE_ENDPOINT` | No | Object storage endpoint for resumes |
| `STORAGE_BUCKET_RESUMES` | No | Bucket name for resume files |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | No | Storage credentials |
| `RESUME_RAW_RETENTION_DAYS` | No | Days before raw resume deletion (default: 30) |
| `TRANSACTIONAL_EMAIL_API_KEY` | No | For alert emails (Phase 5) |

See `docs/setup/secrets-management.md` for full guidance.

---

## Data Ingestion Pipeline

The Python worker plane runs as a multi-threaded process. The pipeline has seven stages connected by Redis Streams.

```
Source APIs (Greenhouse, Lever, Adzuna, USA Jobs, EURES, Workable, SmartRecruiters)
    │
    ▼
Discovery Runner (agents/discovery/runner.py)
    Checks freshness rules (scheduler.py) before fetching.
    Publishes RawJobEvent to Redis Stream: job-globe.discovery
    Records start/end/counts in agent_runs table.
    │
    ▼
Verification Worker (agents/verification/worker.py)
    HTTP HEAD-checks every apply URL.
    Computes trust score (0–1): HTTPS + ATS domain + redirect depth.
    Stamps verified_live_at. Filters dead URLs.
    │
    ▼
Company Identity Resolver (agents/company_identity/resolver.py)
    Extracts domain from apply URL.
    Fetches Clearbit logo if available.
    Computes company trust score.
    Upserts into companies table.
    │
    ▼
Geo Mapper (agents/geo_mapping/geocoder.py)
    Matches city to ~200 hardcoded centroids (no external API dependency).
    Falls back to pycountry country-level lookup.
    Upserts into locations table with lat/lng.
    │
    ▼
Taxonomy Tagger (agents/categorisation/tagger.py)
    Rule-based classification:
      - function: software-engineering, data-science, design, …
      - seniority: intern, entry, mid, senior, staff, principal, …
      - remote_type: remote, hybrid, on-site
      - employment_type: full-time, part-time, contract, internship
    Writes job_taxonomy_links rows with per-rule confidence scores.
    │
    ▼
Duplicate Detector (agents/duplicate_detection/detector.py)
    Fingerprint = sha256(normalised_title + company + city)[:16]
    Also deduplicates on apply_url UNIQUE constraint.
    Idempotent upsert into jobs_canonical with full enrichment.
    │
    ▼
jobs_canonical table (PostgreSQL / Supabase)
    │
    ▼
/api/jobs (Next.js) → Globe UI
```

The observability health module (`observability/health.py`) logs queue depth, source freshness age, and a 24-hour ingestion summary every 5 minutes.

### Freshness targets

- Webhook-enabled sources: under 20 minutes from source update to globe visibility.
- Polled sources: under 1 hour.

---

## Web App & API Routes

### Public routes (no auth required)

| Route | Description |
|---|---|
| `/` | Main globe experience |
| `GET /api/health` | Health check — verifies env, Supabase jobs table, and migrations |
| `GET /api/jobs?mode=global` | Country-level job density for the globe heat layer |
| `GET /api/jobs?mode=jobs` | Filtered job list (title, company, location, type) |
| `GET /api/jobs?mode=detail&id=<id>` | Job detail — includes match score if user is signed in |

### Auth routes

| Route | Description |
|---|---|
| `/login` | Email + password sign-in via Supabase Auth |
| `/register` | Account creation with email confirmation |
| `/onboarding` | Profile questionnaire (8 fields + optional resume upload) |
| `GET /api/auth/session` | Returns `{ authenticated, userId, email, hasProfile }` |
| `POST /api/auth/refresh` | Refreshes Supabase JWT |
| `POST /api/auth/logout` | Clears session cookie |

### Authenticated routes

| Route | Description |
|---|---|
| `/profile` | View/edit onboarding preferences, view or delete resume |
| `/saved` | Saved jobs list with remove action |
| `GET /api/profile` | Returns stored onboarding answers |
| `POST /api/profile` | Saves onboarding answers to Supabase profiles table |
| `GET /api/resume` | Returns signed URL for resume download |
| `POST /api/resume` | Uploads resume file (FormData), respects consent |
| `DELETE /api/resume` | Deletes raw resume file from storage |
| `GET /api/saved-jobs` | Lists all saved job IDs for the authenticated user |
| `POST /api/saved-jobs` | Saves a job |
| `DELETE /api/saved-jobs` | Removes a saved job |

### Jobs API query parameters

All modes accept these optional filters:

| Parameter | Values |
|---|---|
| `category` | Taxonomy value, e.g. `software-engineering` |
| `country` | ISO-like code, e.g. `US` |
| `city` | City name |
| `remote` | `remote`, `hybrid`, `on-site` |
| `jobType` | `internship`, `new-grad`, `full-time`, `contract` |
| `postedWithin` | `1hr`, `6hr`, `1day`, `7day`, `past-month` |
| `q` | Free-text search |

---

## Authentication Flow

Authentication uses Supabase Auth with cookie-based SSR sessions via `@supabase/ssr`.

```
1. User visits /login or /register
   └── Browser calls createBrowserSupabaseClient() (lib/supabase/client.ts)
       └── Uses NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY

2. On successful sign-in, Supabase sets an HttpOnly session cookie.

3. Any API route that needs the user calls resolveRequestUser(request)
   (lib/supabase/auth.ts)
   └── Creates SSR client with createSSRSupabaseClient(request)
   └── Calls supabase.auth.getUser() to verify the JWT from the cookie
   └── Looks up or provisions the user in the internal users table
   └── Returns { userId, email } or null (unauthenticated)

4. Profile routes return 401 if resolveRequestUser() returns null.

5. Token refresh: POST /api/auth/refresh calls supabase.auth.refreshSession()
   and returns the new expiry time.
```

Anonymous users can browse the globe and save jobs to browser session storage. When they sign in, saved jobs are synced from session storage to the API.

---

## Match Scoring System

When a signed-in user views a job detail, the `/api/jobs?mode=detail` route computes a live match score.

```
resolveRequestUser(request)           ← verify Supabase session cookie
    │
    ▼
SELECT * FROM profiles WHERE user_id = ?   ← load onboarding answers
    │
    ▼
getJobDetailWithProfile(jobId, profile)   ← lib/jobs/supabaseJobs.ts
    │
    ├── ruleBasedScore(profileSnapshot, jobSnapshot)   ← lib/match/scorer.ts
    │     Weights:
    │       remote preference match:  0.30
    │       location match:           0.20
    │       job type match:           0.20
    │       role family match:        0.30
    │
    ├── buildMatchBreakdown(profileSnapshot, jobSnapshot)
    │     Produces per-dimension scores + overall label (strong/partial/weak)
    │     Optional: blends with cosine embedding score (70% embedding + 30% rule)
    │     when profile_embeddings and job_embeddings are available (Phase 5)
    │
    ├── skillsIHave / skillsMissing
    │     Infers expected skills from role family → compares against job.required_skills
    │
    ├── Interview questions (5 role-specific questions)
    │
    └── Resume tailoring note (personalised based on role family)
```

Unauthenticated requests receive the same job detail with a placeholder match section.

---

## Database Schema

13 migrations in `packages/database/migrations/`, applied in order:

| Migration | Tables / Changes |
|---|---|
| 001 | `users`, auth scaffold |
| 002 | `profiles` |
| 003 | `companies` |
| 004 | `locations` |
| 005 | `jobs_raw`, `jobs_canonical` |
| 006 | `job_taxonomy`, `job_taxonomy_links` |
| 007 | `profile_embeddings`, `job_embeddings` (pgvector) |
| 008 | `saved_jobs`, `job_applications` |
| 009 | `alerts`, `alert_subscriptions` |
| 010 | `agent_runs` |
| 011 | `audit_events` |
| 012 | Time-filter indexes on `jobs_canonical.posted_at` |
| 013 | Preference columns on `profiles` |

Migration history is tracked in `public.schema_migrations`. The CI database job verifies 12 migration records (seeds excluded from count) and 17 public tables after applying.

---

## Testing

### Web (Vitest)

```powershell
npm run test --workspace=apps/web
# or watch mode
npm run test:watch --workspace=apps/web
```

Three test files under `apps/web/__tests__/`:

- `match-scorer.test.ts` — unit tests for `cosineSimilarity`, `ruleBasedScore`, `buildMatchBreakdown`, `buildSummary`
- `profile-validation.test.ts` — all onboarding field rules, required field checks, consent normalisation
- `auth-guards.test.ts` — session response shapes, 401 guard pattern (Supabase mocked via `vi.mock`)

### Workers (pytest)

```powershell
pytest apps/workers/tests
```

86 tests in `apps/workers/tests/agents/`:

- `test_connectors.py` — normalisation logic for all 7 source connectors
- `test_url_checker.py` — trust score computation, HTTP HEAD mock scenarios
- `test_company_identity.py` — domain extraction, trust scoring
- `test_geo_mapping.py` — city centroid lookup, country fallback, unknown location guard
- `test_categorisation.py` — function/seniority/remote_type/employment_type classification
- `test_duplicate_detection.py` — fingerprint generation, dedup behaviour
- `test_scheduler.py` — freshness rule evaluation

Full suite runs in under 0.5 seconds with zero failures. DB and Redis imports are deferred to function bodies so tests run without live connections.

---

## CI/CD

GitHub Actions runs three jobs on every push to `main` and on pull requests:

**web** — Node 20
1. `npm ci`
2. `npm run lint` (ESLint, zero warnings)
3. `npm run typecheck` (tsc --noEmit)
4. `npm run test --workspace=apps/web` (Vitest)
5. `npm run build` (Next.js production build)

**workers** — Python 3.11
1. `pip install -e "apps/workers[dev]"`
2. `ruff check apps/workers`
3. `mypy apps/workers/src`
4. `pytest apps/workers/tests`

**database** — PostgreSQL 15 + pgvector service container
1. `validate_migrations.py` — file naming and order check
2. `apply_migrations.py` — applies all 13 migrations
3. Load seeds
4. Assert 17 public tables
5. Assert 12 migration records

Vercel deploys automatically from `main` after CI passes. See `docs/runbooks/vercel-deployment.md` for rollback steps.

---

## Deployment

| Component | Where |
|---|---|
| Web app | Vercel — project `job-globe-com-web`, owner `vishalgwu` |
| Database | Supabase staging — project ref `mqfiocolakvqkpvxlafk`, region `us-east-1` |
| Workers | Docker container (local dev via Docker Compose; staging/prod TBD) |
| Resume storage | Supabase Storage — private bucket (signed URLs only) |

Production health check:

```
GET https://job-globe-com-web.vercel.app/api/health
```

Expected response:

```json
{
  "status": "ok",
  "checks": [
    { "name": "environment",          "status": "ok" },
    { "name": "supabase.jobs",        "status": "ok" },
    { "name": "supabase.migrations",  "status": "ok" }
  ]
}
```

See `docs/setup/deployment-inventory.md` for full provider metadata (no secrets).

---

## Project Status

### Phase 1 & 2 — Baseline and product surface ✅ Complete

- Monorepo structure, Docker Compose, CI/CD pipeline
- Supabase staging project, all 13 migrations applied
- Vercel production deployment live
- Interactive globe with country/city/neighbourhood layers
- Job list, job detail panel, search and filters
- Onboarding flow (questionnaire + resume upload placeholder)
- Anonymous saved jobs via browser session storage
- `/api/health`, `/api/jobs` (global/jobs/detail modes) reading from Supabase

### Phase 3 — Live data ingestion and job quality ✅ Complete (2026-05-09)

- AbstractConnector base class with retry, back-off, and rate-limit handling
- 7 source connectors: Greenhouse, Lever, Adzuna, USA Jobs, EURES, Workable, SmartRecruiters
- Full pipeline: discovery → verification → company identity → geo mapping → taxonomy tagging → canonical merge
- URL trust scoring (0–1 scale)
- ~200-city geo centroid map with pycountry fallback
- Rule-based taxonomy classification with confidence scores
- Fingerprint-based duplicate detection and idempotent canonical upserts
- Shared Pydantic types for Python/DB boundary
- Typed DB repository layer (all tables)
- Observability health module (queue depth, freshness, 24-hr summary)
- Multi-threaded main entry point with SIGTERM-aware graceful shutdown
- 86 pytest tests passing, full suite under 0.5 s
- Operational runbooks: source onboarding, source failure handling, ingestion replay

### Phase 4 — Auth, profiles, resume, and matching ✅ Complete (2026-05-09)

- Browser and SSR Supabase client helpers
- Real `/api/auth/session` and `/api/auth/refresh` endpoints
- Login and register pages (Supabase Auth)
- Profile page (loads prefs + resume status + delete control)
- Saved jobs page (list + remove action)
- Authenticated `/api/profile`, `/api/resume`, `/api/saved-jobs` APIs
- Rule-based match scoring wired into `/api/jobs?mode=detail` for signed-in users
- Skills gap (skillsIHave / skillsMissing), interview questions, resume tip in job detail
- Zustand store with auth-aware hydration (API sync when authenticated, sessionStorage fallback when anonymous)
- ResumeUpload component wired to `/api/resume` with progress and success states
- OnboardingFlow shows account-mode vs demo-mode save confirmation
- Vitest added to web app + CI; 3 test files covering scorer, profile validation, auth guards

### Phase 5 — Alerts, observability, and launch QA 🔲 Not started

- `/api/alerts` — replace placeholder with real saved-search subscriptions
- Alert delivery — email provider integration + transactional safeguards
- Application tracking / redirect history
- Production observability for API and worker failures
- Smoke tests for all key endpoints
- Lighthouse performance scores against production
- Browser/device QA (Chrome, Firefox, Safari, iOS, responsive breakpoints)
- VoiceOver and NVDA accessibility QA
- Legal sign-off on resume consent copy
- Resume NLP parsing (structured extraction — storage pipeline is ready, parser deferred)
- Embedding-based match scoring (deferred pending ADR-004 model decision)
- Branch protection + PR-only flow for production changes

Full history: `docs/project-status/achieved-to-date.md`
Remaining plan: `docs/project-status/remaining-work-phases.md`

---

## Key Documentation

| Document | Path |
|---|---|
| Deployment inventory (provider metadata, no secrets) | `docs/setup/deployment-inventory.md` |
| Secrets management guide | `docs/setup/secrets-management.md` |
| Jobs API contract | `docs/api/jobs-api.md` |
| Profile API contract | `docs/api/profile-api.md` |
| Alerts API contract | `docs/api/alerts-api.md` |
| System architecture overview | `docs/architecture/system-overview.md` |
| Agent event flow (Redis Streams) | `docs/architecture/agent-event-flow.md` |
| Data freshness policy | `docs/architecture/data-freshness-policy.md` |
| Privacy framework | `docs/decisions/privacy-framework.md` |
| ADR-001 — Monorepo structure | `docs/decisions/ADR-001-monorepo-structure.md` |
| ADR-002 — Database choice | `docs/decisions/ADR-002-database-choice.md` |
| ADR-003 — Globe library | `docs/decisions/ADR-003-globe-library.md` |
| ADR-004 — Embedding model | `docs/decisions/ADR-004-embedding-model.md` |
| ADR-005 — Auth provider | `docs/decisions/ADR-005-auth-provider.md` |
| Vercel deployment + rollback | `docs/runbooks/vercel-deployment.md` |
| Source onboarding runbook | `docs/runbooks/source-onboarding.md` |
| Source failure runbook | `docs/runbooks/source-failure.md` |
| Ingestion replay runbook | `docs/runbooks/ingestion-replay.md` |
| Testing conventions | `docs/qa/testing-conventions.md` |
| Achieved-to-date (ground truth) | `docs/project-status/achieved-to-date.md` |
| Remaining work phases | `docs/project-status/remaining-work-phases.md` |
