# Jarvis Job Globe — Project Status

Last updated: 2026-05-10
Production: https://job-globe-com-web.vercel.app/
Health: https://job-globe-com-web.vercel.app/api/health → `200 OK`

---

## What Is Built (Phases 1–5 Complete)

### Infrastructure & DevOps
- Monorepo: `apps/web`, `apps/workers`, `packages`, `infra`, `.github`
- Docker Compose: PostgreSQL 15 + pgvector, Redis 7, web, workers (`infra/docker/docker-compose.dev.yml`)
- CI: lint, typecheck, build, worker checks, worker tests, migration validation
- Vercel production deployment on `main` — project `job-globe-com-web`, owner `vishalgwu`
- GitHub branch protection on `main` (PR required, approvals required, force push blocked)

### Database (Supabase — `job-globe-staging`, `us-east-1`)
All 13 migrations applied; 17 tables confirmed on staging:

| Migration | Tables |
|---|---|
| 001 | users, auth setup, pgvector extension |
| 002 | profiles |
| 003 | companies |
| 004 | locations |
| 005 | jobs_raw, jobs_canonical |
| 006 | job_taxonomy, job_taxonomy_links |
| 007 | job_embeddings, profile_embeddings (pgvector) |
| 008 | saved_jobs, applications |
| 009 | alerts |
| 010 | agent_runs |
| 011 | audit_events |
| 012 | job time-filter indexes |
| 013 | profiles_preferences |

Seed data: 200 demo jobs, 15 companies, 20 locations, taxonomy reference, 5 saved jobs.

### Web App (`apps/web` — Next.js 14 App Router)

**Globe**
- `GlobeCanvas` — CSS 3D spherical projection, drag/pinch/zoom, auto-rotation, WebGL detection
- `FallbackMap` — 2D DOM fallback when WebGL unavailable or user toggles
- `GlobeExperience` — orchestrates 4 zoom layers (global → country → city → neighbourhood), filter wiring, job/company selection, accessible list mode, saved-jobs tray
- `FilterBar`, `ZoomController`, `IntroOverlay` (built; composed into GlobeExperience)

**Auth**
- Login page — Supabase `signInWithPassword`, error handling, post-login redirect
- Register page — Supabase `signUp`, password confirmation, email confirmation, redirect to onboarding
- `/api/auth/session` — real resolver returning `{ authenticated, userId, email, hasProfile }`
- `/api/auth/logout`, `/api/auth/refresh` — implemented

**Onboarding**
- 8-step wizard: role family, target locations, remote pref, job type, salary sensitivity, company size, time-to-start, work auth + resume upload
- Resume upload (`ResumeUpload.tsx`) — POSTs `FormData` to `/api/resume`, shows progress, retention date, error states
- Submits to `/api/profile`; shows "saved to account" vs "demo mode" based on auth state

**Profile & User Pages**
- `/profile` — shows all preferences, resume status (signed URL + delete), privacy controls
- `/saved` — lists saved jobs from `/api/saved-jobs` with remove action
- `/alerts` — create/list/pause/resume/delete alerts; filter summary badges
- `/applications` — apply redirect history with date, domain, re-open link

**API Routes**

| Route | Methods | Notes |
|---|---|---|
| `/api/jobs` | GET | 4 modes: global, country, city, detail. Reads Supabase. |
| `/api/auth/session` | GET | Auth state + hasProfile |
| `/api/auth/logout` | POST | |
| `/api/auth/refresh` | POST | |
| `/api/profile` | GET, POST | Onboarding answers → Supabase profiles |
| `/api/alerts` | GET, POST, DELETE, PATCH | Full CRUD + pause/resume; daily-max guard |
| `/api/applications` | GET, POST | Upsert on `(user_id, job_id)` conflict |
| `/api/resume` | GET, POST, DELETE | Supabase Storage, signed URLs, 30-day retention |
| `/api/saved-jobs` | GET, POST, DELETE | Sync between session storage and Supabase |
| `/api/health` | GET | env + supabase.jobs + supabase.migrations + auth + storage checks |

**Match Scoring**
- `lib/match/scorer.ts` — `ruleBasedScore()`, `cosineSimilarity()`, `buildMatchBreakdown()`, `buildSummary()`
- Authenticated job detail requests get live `MatchBreakdown` from profile answers
- Quick prep: `skillsIHave` / `skillsMissing`, role-specific interview questions, resume tailoring note
- Unauthenticated requests receive a graceful placeholder

**Observability (Web)**
- `lib/observability/logger.ts` — structured JSON logger with `withObservability()` wrapper
- `lib/observability/metrics.ts` — named counters for key API operations

**Tests (Web)**
- `__tests__/` — Vitest suite covering match scorer pure functions, profile validation, auth-guard contracts, and 18 smoke API tests

### Worker Pipeline (`apps/workers` — Python 3.11)

**Discovery — 7 source connectors (all implemented)**
- Greenhouse (public board API, webhook-capable)
- Lever (public postings API, webhook-capable)
- Adzuna (search API — requires `ADZUNA_APP_ID` + `ADZUNA_APP_KEY`)
- USA Jobs (federal API — requires `USAJOBS_API_KEY`)
- EURES (EU jobs portal, no auth)
- Workable (company subdomain API, optional token)
- SmartRecruiters (public API, no auth)

Abstract connector base (`agents/discovery/connectors/base.py`) with retry, back-off, rate-limit handling shared across all connectors.

**Ingestion Pipeline (all implemented)**

| Stage | File | What it does |
|---|---|---|
| Discovery runner | `agents/discovery/runner.py` | Respects freshness rules, publishes `RawJobEvent` to `job-globe.discovery` Redis stream |
| Verification | `agents/verification/worker.py` | HTTP HEAD-checks apply URLs, stamps `verified_live_at`, filters dead URLs |
| URL trust scoring | `url_checker.py` | 0–1 trust score (HTTPS, ATS domain, redirect depth) |
| Company identity | `agents/company_identity/resolver.py` | Domain extraction, Clearbit logo API, upserts `companies` |
| Geo mapping | `agents/geo_mapping/geocoder.py` | ~200 city centroids + pycountry fallback, upserts `locations` |
| Taxonomy tagger | `agents/categorisation/tagger.py` | Rule-based function/seniority/remote/employment classification with confidence |
| Duplicate detector | `agents/duplicate_detection/detector.py` | Fingerprinting, idempotent upsert into `jobs_canonical` |
| Observability health | `observability/health.py` | Queue depth, source freshness, 24-hr ingestion volume (logs every 5 min) |
| Main entrypoint | `main.py` | Multi-threaded, SIGTERM-aware, graceful shutdown |

**Event Bus**
- Redis Streams producer + consumer (`src/job_globe_workers/event_bus/`)
- Settings module (`src/job_globe_workers/settings.py`) — pydantic-settings, all credentials

**Tests (Workers)**
- 86 tests passing (connectors, geo mapping, taxonomy, duplicate detection, URL checking, company trust, freshness rules)
- Full suite runs in < 0.5s, zero failures

**Runbooks** (source onboarding, source failure handling, ingestion replay) — in `docs/runbooks/`

---

## What Remains

### Sign-Off Gates (blocking full production launch)

| Item | Owner | Status |
|---|---|---|
| Run Lighthouse against production URL and record real scores | Engineering | ⬜ Pending |
| Browser/device QA — Chrome, Firefox, Safari, iOS Safari, mobile Android | Engineering | ⬜ Pending |
| Screen reader QA — VoiceOver (macOS/iOS), NVDA (Windows), keyboard-only nav | Engineering | ⬜ Pending |
| Legal/Privacy sign-off on resume consent copy | Legal | ⬜ Pending |
| Enable branch protection rules on `main` in GitHub Settings | Engineering | ⬜ Pending |
| Configure `TRANSACTIONAL_EMAIL_API_KEY` and enable email alert delivery | Engineering | ⬜ Pending |

### Deferred Features (Phase 6+)

| Feature | Why deferred | Prerequisites |
|---|---|---|
| Resume NLP parsing — structured field extraction with confidence values | Storage pipeline complete; parser is a future enrichment step | Resume extraction worker reading from Supabase Storage |
| Embedding-based match scoring — replace rule-based with pgvector cosine similarity | Deferred per ADR-004 until model decision validated in production | `profile_embeddings` + `job_embeddings` tables exist and ready |

---

## Key Numbers

- **Production URL:** https://job-globe-com-web.vercel.app/
- **Supabase project ref:** `mqfiocolakvqkpvxlafk`
- **Tables in schema:** 17
- **DB migrations:** 13
- **Demo jobs seeded:** 200
- **Source connectors:** 7
- **Python tests:** 86 passing
- **Web tests:** Vitest suite (matcher, profile validation, 18 smoke API tests)
- **Last known healthy commit:** `8318734`

---

## Doc Map

```
docs/
├── STATUS.md                          ← this file
├── architecture/
│   └── system-overview.md             ← component map, data flow, auth flow
├── api/
│   ├── jobs-api.md                    ← /api/jobs contract (all 4 modes)
│   ├── profile-api.md                 ← /api/profile contract
│   └── alerts-api.md                  ← /api/alerts contract
├── decisions/
│   ├── ADR-001-monorepo-structure.md
│   ├── ADR-002-database-choice.md
│   ├── ADR-003-globe-library.md
│   ├── ADR-004-embedding-model.md     ← explains why embeddings are deferred
│   ├── ADR-005-auth-provider.md
│   └── privacy-framework.md           ← resume retention, consent policy
└── setup/
    └── deployment-inventory.md        ← Supabase + Vercel endpoint metadata
```
