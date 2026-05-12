# Jarvis Job Globe — Remaining Work Master List

**Audit date:** 2026-05-11  
**Last updated:** 2026-05-11 (post-audit execution pass)  
**Scope:** Full codebase, all product vision DOCX files, `.env`, `.env.example`, all CI/CD config, all Dockerfiles, every API route, all Python workers, every migration.  
**Method:** Zero-hallucination — every item below is grounded in a direct file read. Unverified assumptions are marked ⚠️ speculation.

**✅ Completed since audit:** 1.1 deploy-staging.yml written (3 jobs: deploy-web, deploy-workers, smoke-test). 1.2 OPENAI_API_KEY set in .env. 2.3 GitHub secrets configured (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, RAILWAY_TOKEN).

---

## How to read this document

- 🚨 **BLOCKER** — launch cannot succeed without this
- ⚠️ **REQUIRED** — needs resolution before accepting real users  
- 🏗️ **GAP** — spec promised it, code does not deliver it
- 📊 **STUB** — scaffolded but not functional
- 🐛 **DEFECT** — code exists but is broken or incorrect
- 📦 **MISSING CONFIG** — feature is built but the environment variable or secret is not set
- 🗺️ **UX DEBT** — functional but not production-grade experience

---

## 1. Critical launch blockers

### 1.1 ~~deploy-staging.yml is empty~~ ✅ FIXED
File: `.github/workflows/deploy-staging.yml`  
Written 2026-05-11. Three jobs: `deploy-web` (lint → typecheck → test → Vercel preview deploy), `deploy-workers` (Railway CLI `railway up --service workers`), `smoke-test` (GET /api/health on preview URL).

### 1.2 ~~OPENAI_API_KEY not set~~ ✅ FIXED
Set in `.env` as `OPENAI_API_KEY` — 2026-05-11. Must also be set in Vercel environment variables (for `/api/quick-prep`) and Railway service variables (for resume parser, embedders).

### 1.3 RESEND_API_KEY not set
🚨 **BLOCKER** + 📦 **MISSING CONFIG**  
File: `.env` (key absent entirely)  
Alert email delivery uses Resend. `send_alert_digest()` in `email_sender.py` checks `settings.resend_api_key` first and returns `False` with a warning log if it is empty. Users will never receive alert emails. Alert CRUD and evaluator work; only delivery is dead.

**Required:** Obtain Resend API key, add `RESEND_API_KEY` to `.env` and Railway secrets.

### 1.4 No connector API keys — zero job ingestion
🚨 **BLOCKER** + 📦 **MISSING CONFIG**  
File: `apps/workers/src/job_globe_workers/settings.py`  
Every connector's `is_configured()` guard returns `False` because all keys default to empty string:

| Connector | Missing setting(s) |
|---|---|
| Adzuna | `adzuna_app_id`, `adzuna_app_key` |
| USAJobs | `usajobs_api_key` |
| Workable | `workable_api_key` |
| SmartRecruiters | `smartrecruiters_api_key` |
| Greenhouse webhook | `greenhouse_webhook_secret` |
| Lever webhook | `lever_webhook_secret` |
| EURES | No API key required — may work if network allows |

The discovery runner will start, iterate connectors, skip all of them, and produce zero jobs. The only data in production will be the demo seed.

**Required:** Register and configure at least Adzuna (free tier) and one ATS webhook to get real job data flowing.

### 1.5 No real job data in production
🚨 **BLOCKER**  
Consequence of 1.4. The only jobs in the database are from `packages/database/seeds/demo_jobs.sql` — fictional companies with `.example` domains. The globe will show fake data until connectors are live.

### 1.6 npm typecheck fails — openai and ioredis type stubs
🚨 **BLOCKER** (CI breaks on `typecheck` step)  
File: `apps/web/package.json`  
`npm run typecheck` fails because `openai` and `ioredis` are imported in route handlers but their TypeScript types are not available in the web workspace devDependencies. CI runs `npm run typecheck` and will fail.

**Required:** Add `openai` and `ioredis` (or `@types/ioredis`) to `apps/web/package.json` devDependencies.

### 1.7 Worker pytest fails in CI
🚨 **BLOCKER** (CI breaks on `pytest` step)  
File: `apps/workers/tests/` (resume extractor tests)  
Tests for `resume_extractor.py` require `fitz` (PyMuPDF) and `unstructured`. These are not in `requirements.txt` / `pyproject.toml` for the standard CI install. The `workers` CI job runs `pytest apps/workers/tests` and will fail.

**Options:**
- Add `fitz` and `unstructured` as optional `[dev]` extras and install in CI.
- Mark resume extractor tests with `@pytest.mark.skipif` when the imports are unavailable.
- Mock the file extraction layer in tests.

---

## 2. Production verification required

### 2.1 Supabase RLS policies — live project verification
⚠️ **REQUIRED**  
File: `packages/database/migrations/017_privacy_data_safety.sql`  
All RLS policy creation is guarded by `DO $$ BEGIN IF NOT EXISTS ... THEN CREATE POLICY ... END IF END $$` and only runs if `auth.uid()` is resolvable. In CI (plain pgvector/postgres), policies are skipped. They must be verified in the actual Supabase project.

**Required:** Run migration 017 against the production Supabase project and confirm policies appear in the Supabase dashboard for all 11 tables.

### 2.2 Supabase Storage — resumes bucket
⚠️ **REQUIRED**  
File: `packages/database/migrations/017_privacy_data_safety.sql`  
The private `resumes` bucket creation is guarded by `IF NOT EXISTS` on `storage.buckets`. Must be verified in Supabase dashboard: bucket exists, is private, has correct MIME type restrictions (PDF, DOCX, TXT) and 10 MB size limit.

### 2.3 ~~Vercel + Railway secrets not configured~~ ✅ FIXED
GitHub Actions secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `RAILWAY_TOKEN` configured — 2026-05-11.

### 2.4 Privacy page — legal sign-off required
⚠️ **REQUIRED**  
File: `apps/web/app/privacy/page.tsx`  
The page explicitly states: "This notice reflects the privacy behavior currently implemented in the repository. It is not a final legal policy and has not been legally reviewed." The product vision DOCX requires GDPR and CCPA compliance. Cannot accept real users until a lawyer reviews and approves this page.

### 2.5 Load test baseline not recorded
⚠️ **REQUIRED**  
File: `infra/load-tests/jobs-api.js` (script is correct)  
The k6 script has the right query params and assertions, but no baseline run has been executed against staging. No p95 latency number, no error rate baseline. Cannot set SLOs without this.

**Required:** `k6 run infra/load-tests/jobs-api.js --env BASE_URL=<staging-url>` and record results in `infra/load-tests/README.md`.

---

## 3. Implementation gaps (spec vs. code)

### 3.1 Globe is CSS/div-based — not a real 3D globe
🏗️ **GAP**  
File: `apps/web/components/globe/GlobeCanvas/GlobeCanvas.tsx`  
The globe is a pure CSS sphere (`border-radius: 50%`, `background: radial-gradient(...)`) with JavaScript marker projection math. Globe.GL, Three.js, and deck.gl are in `package.json` as dependencies but NOT active in the runtime.

Product vision calls for a real interactive 3D globe (the project is named "Job Globe"). The current implementation is a functional fallback, not the end product.

**Required for MVP quality:** Wire Globe.GL or React Three Fiber to replace the CSS sphere. The fallback map (`FallbackMap`) can remain for accessibility.

### 3.2 QuickPrepToolkit shows static placeholder — not live AI
🏗️ **GAP**  
File: `apps/web/components/job-panel/QuickPrepToolkit/QuickPrepToolkit.tsx`  
The component accepts `quickPrep: QuickPrepPlaceholder`. The placeholder data is whatever the job detail API embeds in the response (static fields). The live `/api/quick-prep` route exists, calls `gpt-4o-mini`, and caches results — but the job panel is NOT wired to it. Users see placeholder text, not AI-generated prep content.

**Required:** Either call `/api/quick-prep?jobId=...` from the panel when a job is opened, or restructure the job detail endpoint to include live quick-prep data. Must have `OPENAI_API_KEY` set first (see 1.2).

### 3.3 Audio toggle is a non-functional stub
🏗️ **GAP**  
File: `apps/web/components/globe/IntroOverlay/IntroOverlay.tsx`  
The intro overlay has a mute/unmute button with `soundEnabled` state. There is no audio file, no Web Audio API call, no ambient sound. The button toggles a boolean that affects nothing. Either remove it or implement ambient globe sound.

### 3.4 Demo cluster CTA does nothing
🏗️ **GAP**  
File: `apps/web/components/globe/IntroOverlay/IntroOverlay.tsx`  
"View Demo Cluster" calls `onDismiss()` — it just closes the overlay. No pre-zoomed city, no pre-loaded cluster of jobs. Either implement a real demo preset (zoom to a configured city, load demo jobs) or remove the CTA.

### 3.5 Job comparison has no UI
🏗️ **GAP**  
File: `apps/web/app/api/jobs/compare/route.ts` (route exists)  
`GET /api/jobs/compare?ids=uuid,uuid` is implemented and returns side-by-side data. There is no UI component to trigger it. Users cannot compare jobs from the interface.

### 3.6 Parsed-profile correction not implemented
🏗️ **GAP**  
Acknowledged in `apps/web/app/privacy/page.tsx`. Users cannot correct mistakes in their parsed resume profile. The profile page shows parse status and allows raw file deletion, but not field editing.

### 3.7 Neighbourhood-level discovery not implemented
🏗️ **GAP**  
Product vision specifies global → country → city → neighbourhood progressive disclosure. The API supports `mode=global|country|city`. Sub-city neighbourhood drill-down is not implemented in the API or UI.

---

## 4. Observability stubs — not production-grade

### 4.1 Web metrics reset on cold start
📊 **STUB**  
File: `apps/web/lib/observability/metrics.ts`  
In-process counters (objects in module scope). Every Vercel cold start resets all counters to zero. No Prometheus export, no OTel, no external sink. Cannot track request rates or error rates across deploys.

**Required:** Integrate PostHog, Amplitude, or expose a `/api/metrics` Prometheus endpoint backed by Redis counters.

### 4.2 Worker metrics are a single helper function
📊 **STUB**  
File: `apps/workers/src/job_globe_workers/observability/metrics.py`  
Contains only `metric_name(component, metric)` which formats a string like `"job_globe.component.metric"`. No counters, no gauges, no histograms, no export. The worker health loop (health.py) is functional but only logs — it does not export metrics anywhere.

### 4.3 OpenTelemetry not wired
📊 **STUB**  
File: `apps/workers/src/job_globe_workers/observability/tracing.py`  
Docstring: "Phase 5 will wire OpenTelemetry here." Currently only configures structlog JSON output. No trace IDs, no span propagation, no Jaeger/Honeycomb export.

### 4.4 Worker health has no HTTP endpoint
📊 **STUB**  
File: `apps/workers/src/job_globe_workers/observability/health.py`  
`report()` builds a solid health dict (queue depths, source freshness, 24h ingestion summary). `log_health_loop()` logs it every 5 minutes. However, there is no HTTP server in the worker container. Railway health checks and external uptime monitors cannot query worker health.

**Required:** Expose a minimal HTTP server (e.g., `http.server` or `fastapi`) in the worker container on port 8080 serving `/health`.

### 4.5 No KPI or admin dashboard
📊 **STUB**  
Product vision DOCX and 5-step build plan both call for a KPI dashboard (job count by source, user signups, alert deliveries, match score distribution). Nothing exists.

---

## 5. Security remaining work

### 5.1 Webhook secrets not in .env
🐛 **DEFECT** + 📦 **MISSING CONFIG**  
Files: `apps/web/app/api/webhooks/greenhouse/route.ts`, `.../lever/route.ts`  
Both webhook routes use HMAC verification. `GREENHOUSE_WEBHOOK_SECRET` and `LEVER_WEBHOOK_SECRET` are not in `.env` (only in `.env.example`). If the routes check these and the values are empty strings, HMAC verification will accept any payload or reject all payloads depending on implementation.

**Required:** Set these secrets or disable HMAC verification explicitly for routes where the connector is not yet active.

### 5.2 CORS not explicitly configured
⚠️ **REQUIRED**  
No explicit CORS headers in route handlers or `next.config.mjs`. Relying on Next.js defaults. The product vision calls for locking down API access to the web origin only in production.

### 5.3 Penetration test not done
⚠️ **REQUIRED**  
5-step build plan explicitly requires a penetration test before launch. Not done.

---

## 6. CI/CD and infrastructure gaps

### 6.1 infra/terraform/ is placeholder only
📊 **STUB**  
All files under `infra/terraform/` are placeholder/empty. No infrastructure-as-code exists for Supabase, Vercel, Railway, Redis, or any supporting services.

### 6.2 CI.yml typecheck step will fail
🐛 **DEFECT** (consequence of 1.6)  
CI runs `npm run typecheck` in the `web` job. This will fail until openai/ioredis devDependencies are added.

### 6.3 CI.yml pytest step will fail  
🐛 **DEFECT** (consequence of 1.7)  
CI runs `pytest apps/workers/tests` in the `workers` job. This will fail until fitz/unstructured are available or tests are mocked/skipped.

---

## 7. UX and product debt

### 7.1 Mobile responsiveness not done
🗺️ **UX DEBT**  
README lists "Globe/map UX simplification and mobile responsiveness pass pending." No responsive breakpoints verified. The globe canvas and job panel layout have not been tested on mobile viewports.

### 7.2 Globe/map UX simplification not done
🗺️ **UX DEBT**  
README lists this as a remaining gap. The current interface has multiple overlapping UI modes (country heat, city bubbles, job markers, list panel) that have not been through a simplification/usability pass.

### 7.3 No onboarding-to-resume-upload funnel verification
🗺️ **UX DEBT**  
The onboarding page and resume upload are functional end-to-end, but the user journey from account creation → onboarding → resume upload → seeing match scores has not been validated in an integrated test or user test session.

### 7.4 No data for freshness indicators
🗺️ **UX DEBT**  
The jobs API supports `postedWithin` filtering and the data model has `freshness` labels. With no live connectors running, all canonical jobs come from demo seeds with synthetic dates. Freshness indicators will be meaningless until real data flows.

---

## 8. Data and seeding gaps

### 8.1 Taxonomy reference seed must run in production
📦 **MISSING CONFIG**  
File: `packages/database/seeds/taxonomy_reference.sql`  
Job categorization and category-based filtering depend on taxonomy reference data. CI seeds it in the database job. It must also be applied to the production Supabase database.

### 8.2 Demo seed uses fictional companies and domains
📊 **STUB**  
All demo companies use `.example` TLDs. Apply links point to `#` or placeholder URLs. The demo experience will not survive any real user who tries to click "Apply."

---

## 9. Known code/schema mismatches (architecture doc)

The following mismatches are listed in `docs/md/architecture.md`. Direct code inspection in this audit indicates some are fixed:

| Mismatch | Status after this audit |
|---|---|
| `/api/account` refers to `job_applications`; schema table is `applications` | **Appears fixed** — `route.ts` uses `from("applications")` |
| Account deletion does not delete raw resume objects from Storage | **Fixed** — `collectResumeObjectKeys` + `removeResumeObjects` implemented |
| Account deletion does not anonymize or remove the internal `users` row | **Fixed** — `delete_internal_account()` deletes the `users` row |

**Action:** Update `docs/md/architecture.md` to remove these three items from the "Known schema/code mismatches" section.

---

## 10. Prioritised execution order

The following order minimises wasted work and unblocks the most downstream value:

**Week 1 — Make CI green and staging deployable**
1. Fix typecheck devDependencies (1.6) — fast
2. Fix or skip worker pytest (1.7) — fast
3. Write deploy-staging.yml (1.1) — 2–4 hours
4. Add GitHub secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, RAILWAY_TOKEN (2.3)

**Week 2 — Wire real data**
5. Set OPENAI_API_KEY in Railway + Vercel env (1.2)
6. Set RESEND_API_KEY in Railway env (1.3)
7. Obtain and set Adzuna API keys (1.4) — get real jobs flowing
8. Verify Supabase RLS + Storage bucket (2.1, 2.2)
9. Run load test against staging, record baseline (2.5)

**Week 3 — Legal and privacy**
10. Legal review of privacy page (2.4)
11. Configure webhook secrets (5.1)
12. Run Supabase taxonomy seed in production (8.1)

**Week 4 — Product quality**
13. Wire QuickPrepToolkit to live `/api/quick-prep` (3.2)
14. Real 3D globe implementation (3.1)
15. Mobile responsiveness pass (7.1)
16. Expose worker health HTTP endpoint (4.4)
17. Remove or implement audio toggle (3.3)
18. Implement or remove demo cluster CTA (3.4)

**Post-launch**
- Job comparison UI (3.5)
- Parsed-profile correction UI (3.6)
- OpenTelemetry wiring (4.3)
- KPI dashboard (4.5)
- Terraform infra-as-code (6.1)
- Penetration test (5.3)
- Neighbourhood drill-down (3.7)

---

## 11. What is confirmed working

The following has been directly verified by code inspection and test results:

- Next.js App Router, all 13 API route groups, Supabase SSR auth
- 17 database migrations, 21 application tables, pgvector, GIN indexes
- Redis consumer groups with XREADGROUP, XACK, XAUTOCLAIM, DLQ pattern on all three pipeline workers
- Rule-based + embedding cosine similarity match scoring (70/30 blend when embeddings exist)
- Security headers: CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy
- Rate limiting: 60 req/min general, 10 req/min for quick-prep and resume routes
- Application lifecycle: redirected → applied → interviewing → offer / rejected / withdrawn
- Alert CRUD and evaluator with Resend email integration (requires RESEND_API_KEY)
- Account data export and full deletion (Storage objects + DB rows + Supabase auth user)
- Accessibility: role="alert" on all errors, aria-expanded on job panel, aria-busy on map, aria-live on status regions
- Worker health loop: queue depths, source freshness, 24h ingestion summary
- Bundled geocoder with ~200 city centroids + pycountry country fallback (no external API dependency)
- Dockerfile.web (multi-stage, standalone Next.js output) and Dockerfile.workers (Python 3.11-slim)
- CI.yml: web tests (48 pass), ruff (passes), mypy (56 files pass), database migrations + seed + count validation
- k6 load test script with correct query param contract and mode key assertion
