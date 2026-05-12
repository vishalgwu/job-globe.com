# Jarvis Job Globe Remaining Work Master List

Audit date: 2026-05-12

Scope: full local repository structure, retained Markdown docs, CI/CD workflows, Docker/Railway/Vercel config, database migrations/seeds/scripts, Next.js app/API routes, Python workers/tests, shared types, and environment templates.

Method: every item below is grounded in local file inspection or a local command run. Platform-side state such as Vercel, Railway, GitHub Actions, and Supabase dashboard settings is marked as requiring external verification.

## Status Legend

| Label        | Meaning                                                |
| ------------ | ------------------------------------------------------ |
| Blocker      | Launch cannot safely proceed without this.             |
| Required     | Needed before accepting real users.                    |
| Gap          | Product or engineering work is incomplete.             |
| Config       | Built code needs platform secrets/settings/data.       |
| Verification | Code exists but production behavior is not yet proven. |
| Debt         | Functional, but not production-grade.                  |

## Completed Since The Previous Docs

- WebGL globe is implemented with `globe.gl`; the old CSS-sphere description is obsolete.
- Quick Prep now calls `/api/quick-prep` from the job panel and falls back to placeholder content on failure.
- Job comparison has both API and UI through `JobComparePanel` and the compare tray.
- Intro overlay no longer contains the non-functional audio toggle or fake demo-cluster CTA.
- Worker HTTP health endpoint exists at `/health`.
- Worker pytest bootstrap now handles missing or partially installed `unstructured.partition.docx`.
- Web typecheck no longer fails on `openai` or `ioredis`; both are app dependencies.
- CI workflow comments were cleaned, and staging smoke test now fails on non-`ok` health status.
- Root `.env.example` now includes worker stream, connector, health, and tuning settings that were missing.

## 1. Critical Launch Blockers

### 1.1 Legal privacy sign-off

Status: Blocker

Files:

- `apps/web/app/privacy/page.tsx`
- `docs/decisions/privacy-framework.md`

The privacy page is explicitly draft text. It has not been reviewed for GDPR, CCPA/CPRA, AI/subprocessor disclosures, or production data-retention claims.

Required:

- Replace draft copy with legal-approved text.
- Confirm OpenAI, Supabase, Resend, Vercel, Railway, and any job-source providers are covered in subprocessor language.
- Decide whether parsed-profile correction must ship before real users or be removed from any claim/copy.

### 1.2 Production secrets and platform env verification

Status: Blocker / Config

Code depends on these values across Vercel, Railway, Supabase, and GitHub Actions:

- Supabase URL, anon key, and service role key.
- `OPENAI_API_KEY`.
- `RESEND_API_KEY`.
- `REDIS_URL`.
- `ALLOWED_ORIGINS`.
- Greenhouse and Lever webhook secrets.
- Adzuna, USAJobs, Workable, Greenhouse board, Lever company, and SmartRecruiters connector settings.
- Vercel and Railway deployment secrets.

Required:

- Verify each value in the platform where it is used.
- Keep real values out of Git; `.env` remains ignored.
- Confirm Railway workers do not run with default localhost Redis.

### 1.3 Supabase production schema, RLS, Storage, and seeds

Status: Blocker / Verification

Files:

- `packages/database/migrations/001_users_and_auth.sql` through `017_privacy_data_safety.sql`
- `packages/database/seeds/taxonomy_reference.sql`
- `packages/database/seeds/demo_jobs.sql`

Local migration validation passes for 17 files and 21 tables, but CI/local Postgres cannot prove Supabase dashboard state.

Required:

- Apply all 17 migrations to the live Supabase project.
- Verify RLS policies in the dashboard.
- Verify the private `resumes` bucket and object policies.
- Apply taxonomy seed in production.
- Decide whether demo jobs should exist in staging only or production as controlled demo data.

### 1.4 Real job ingestion

Status: Blocker / Config

Implemented connectors exist for Adzuna, USAJobs, EURES, Workable, SmartRecruiters, Greenhouse, and Lever, but production job supply depends on real credentials and source access.

Required:

- Configure at least one broad source such as Adzuna or USAJobs in Railway.
- Configure company-side ATS board tokens/slugs where available.
- Run workers and confirm fresh `jobs_raw` and `jobs_canonical` rows.
- Verify official apply URLs are live and non-placeholder.

### 1.5 Staging deployment proof

Status: Blocker / Verification

Files:

- `.github/workflows/deploy-staging.yml`
- `vercel.json`
- `railway.json`

The staging workflow is defined and now fails if `/api/health` is not `ok`, but the hosted workflow was not run during this local audit.

Required:

- Push to `main` or manually dispatch an equivalent deploy.
- Confirm Vercel preview is reachable.
- Confirm Railway worker deploy succeeds.
- Confirm web `/api/health` returns `ok`.
- Confirm worker `/health` is reachable according to Railway's production networking/health-check model.

### 1.6 Load-test baseline

Status: Required / Verification

Files:

- `infra/load-tests/jobs-api.js`
- `infra/load-tests/README.md`

The k6 script exists and has thresholds, but no baseline artifact is recorded.

Required:

- Run k6 against the staging URL.
- Record p95 latency, error rate, target commit, environment, and date.
- Decide whether k6 should become part of scheduled or pre-launch CI.

## 2. CI/CD Status

### 2.1 Local CI-equivalent checks

Status: Verified locally on 2026-05-12

Passed:

- `npm run lint`
- `npm run typecheck`
- `npm run test --workspace=apps/web` - 49 tests
- `npm run build`
- `python packages/database/scripts/validate_migrations.py packages/database/migrations`
- `.\.venv-job-globe\Scripts\python.exe -m ruff check apps/workers`
- `.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src` - 57 source files
- `.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests` - 106 tests

Observed warning:

- Next.js 16.2.4 warns that the `middleware` file convention is deprecated in favor of `proxy`.

### 2.2 Hosted CI not rerun in this audit

Status: Verification

The local commands match the workflow steps closely, but they are not a substitute for GitHub-hosted Actions.

Required:

- Confirm the next GitHub Actions `CI` run passes after these documentation/config/test-bootstrap edits.

### 2.3 Deployment pipeline limitations

Status: Required

The deploy workflow does not apply migrations, seed taxonomy, run k6, or verify all worker internals.

Required:

- Add a controlled production/staging migration process.
- Add a post-deploy verification checklist or job for database version, Redis connectivity, worker health, and source freshness.
- Decide whether staging deploy should include worker `/health` verification in addition to web `/api/health`.

## 3. Product And UX Gaps

### 3.1 Mobile and browser QA

Status: Required

The current WebGL globe, fallback map, job panel, compare tray, filter bar, onboarding, resume upload, and profile pages need current browser evidence after the latest UI changes.

Required:

- Verify desktop and mobile viewports.
- Confirm globe canvas is nonblank, framed correctly, and interactive.
- Confirm text does not overlap in compact widths.
- Confirm fallback map path works when WebGL is unavailable.

### 3.2 Parsed-profile correction UI

Status: Required / Gap

Resume parsing stores structured profile data, but users cannot correct parsed fields.

Required:

- Add a profile correction/edit flow, or keep all user-facing copy clear that correction is not available yet.

### 3.3 Account export/delete UI

Status: Required / Gap

`GET /api/account` and `DELETE /api/account` exist, but no settings page exposes them to users.

Required:

- Add a guarded account settings page with export and delete controls.
- Include confirmation states and clear consequences before deletion.

### 3.4 True neighbourhood data model

Status: Gap

The UI has a job-marker layer named `neighbourhood`, but the API modes are `global`, `country`, `city`, `jobs`, and `detail`. There is no sub-city neighbourhood schema or aggregation.

Required:

- Either implement neighbourhood-level location data or rename the UI layer to avoid over-promising.

### 3.5 Demo seed realism

Status: Debt

`packages/database/seeds/demo_jobs.sql` uses fictional companies and placeholder-style data.

Required:

- Keep demo data clearly separated from production.
- For public launch, rely on real connector-ingested jobs with official apply URLs.

## 4. Data, Workers, And Backend Gaps

### 4.1 Persistent observability

Status: Required / Debt

Implemented:

- Web in-process counters.
- Worker structured logs.
- Worker lightweight `/health`.
- Worker detailed health report in periodic logs.

Missing:

- External metrics sink.
- Distributed rate-limit counters.
- OpenTelemetry traces beyond structlog stub.
- Production alerting.
- KPI/admin dashboard.

### 4.2 Terraform infrastructure

Status: Gap

Files under `infra/terraform` contain only TODO placeholders.

Required:

- Either implement infrastructure-as-code for managed resources or document that Vercel/Railway/Supabase are managed manually.

### 4.3 Python shared contracts

Status: Gap

`packages/shared-types/python/profile.py` and `packages/shared-types/python/match.py` are placeholders, while TypeScript contracts are more complete.

Required:

- Fill Python contracts or remove the expectation that they are shared canonical contracts.

### 4.4 Quick-prep/resume parser model naming

Status: Debt

`QUICK_PREP_MODEL` is used by the worker resume parser for structured resume extraction. The web quick-prep route currently hardcodes `gpt-4o-mini`.

Required:

- Split model config names or document the current coupling clearly.

### 4.5 Production migration automation

Status: Required

Local and CI database validation works. Deployment does not apply migrations.

Required:

- Create a safe migration process for Supabase staging/production.
- Record who runs it, when, and how rollback/retry is handled.

## 5. Security And Privacy Remaining Work

### 5.1 Platform CORS and origin verification

Status: Required

`ALLOWED_ORIGINS` is wired in middleware, but production values must be verified.

Required:

- Set exact Vercel/staging domains.
- Avoid wildcard origins for authenticated APIs.

### 5.2 Webhook production verification

Status: Required

Greenhouse and Lever routes reject unconfigured webhooks and verify HMAC signatures when secrets are set.

Required:

- Set real secrets.
- Confirm provider timestamp/signature format matches the implemented headers.
- Test replay-window rejection with a staging payload.

### 5.3 Penetration/security test

Status: Required

No penetration test or security review artifact is stored in the repo.

Required:

- Test auth boundaries, RLS policies, account deletion, file upload limits, signed URL expiry, webhook signatures, and rate limiting.

## 6. Prioritised Execution Order

1. Run hosted GitHub Actions after these edits and confirm `CI` passes.
2. Verify all required platform secrets in Vercel, Railway, Supabase, and GitHub Actions.
3. Apply and verify Supabase migrations, RLS, Storage policies, and taxonomy seed.
4. Run staging deploy and confirm web `/api/health` plus worker health.
5. Configure at least one real job connector and confirm fresh canonical jobs.
6. Run k6 against staging and record baseline results.
7. Complete legal privacy/subprocessor review.
8. Run full browser/mobile QA of globe, filters, job panel, compare, onboarding, resume, profile, saved jobs, applications, and alerts.
9. Add account export/delete UI.
10. Add parsed-profile correction UI or explicitly defer it in product copy.
11. Add persistent observability and production alerting.
12. Decide whether to implement Terraform or document managed infrastructure as manual.

## 7. Confirmed Working From This Audit

- Next.js App Router build succeeds.
- Web lint/typecheck/tests pass.
- 16 API route files are present.
- `globe.gl` WebGL globe is active with fallback map support.
- Quick Prep calls the live API route from the job panel.
- Compare jobs UI is wired to the compare API.
- 17 database migrations validate.
- Worker ruff, mypy, and pytest pass locally after the partial-`unstructured` test bootstrap fix.
- Worker main starts discovery, verification, company identity, duplicate detection, resume parser, job/profile embedders, alert evaluator, audit cleanup, health log, and health HTTP threads.
- Dockerfiles exist for web and workers.
- CI and staging deploy workflows exist and are syntactically straightforward YAML.
