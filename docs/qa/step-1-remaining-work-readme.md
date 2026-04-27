# Step 1 Handoff Completion README

Status: Complete.

Completion date: 2026-04-26.

This file was originally the beginner checklist for the external Step 1 handoff. All items are now complete.

Step 1 code work is complete locally. Docker was also checked locally: PostgreSQL, Redis, web, and workers run; migrations create 17 tables; demo seed data loads; the web app returns HTTP 200.

The external setup work is also complete: Supabase staging, Vercel deployment, GitHub branch protection, Product Owner approval, and Legal/Privacy approval are done.

## Quick Checklist

| Task | Who Usually Does It | Status |
| --- | --- | --- |
| Enable GitHub branch protection on `main` | Repository admin | Done |
| Configure Supabase project, secrets, and auth callbacks | Backend/DevOps owner | Done |
| Connect staging deployment provider | DevOps owner | Done |
| Run migrations and seeds against staging database | Backend/DevOps owner | Done |
| Get Product Owner approval for ADRs and wireframes | Product Owner | Done |
| Get Legal/Privacy sign-off on privacy framework | Legal/Privacy reviewer | Done |

## Final Verification Summary

- Supabase staging database connection configured and working.
- All SQL migrations ran on Supabase staging.
- Supabase staging schema verified with 17 public tables.
- Seed files ran on Supabase staging:
  - `taxonomy_reference.sql`
  - `demo_jobs.sql`
- Seed data verified:
  - `jobs_raw = 200`
  - `jobs_canonical = 200`
  - `companies = 15`
  - `locations = 20`
  - `saved_jobs = 5`
- GitHub branch protection is enabled on `main`.
- Vercel deployment is connected and live at `https://job-globe-com-web.vercel.app/`.
- Supabase Auth site URL and redirect URL are configured.
- Product Owner approval received.
- Legal/Privacy approval received.
- Final verification passed:
  - `npm.cmd run verify:step1`
  - `.venv-job-globe\Scripts\python.exe -m ruff check apps\workers`
  - `.venv-job-globe\Scripts\python.exe -m mypy apps\workers\src`
  - `.venv-job-globe\Scripts\python.exe -m pytest -p no:cacheprovider apps\workers\tests`

## Before You Start

1. Make sure you are in the project folder:

```powershell
cd C:\college\Github\Projects\job-globe.com
```

2. Confirm the latest code is on your machine:

```powershell
git pull origin main
```

3. Do not commit secrets, passwords, API keys, database URLs, or Supabase keys into Git.

## 1. Enable GitHub Branch Protection

Goal: protect `main` so nobody can accidentally push broken code.

You need: admin access to `https://github.com/vishalgwu/job-globe.com`.

Steps:

1. Open the GitHub repository.
2. Go to `Settings`.
3. Go to `Branches`.
4. Click `Add branch protection rule`.
5. In branch name pattern, enter:

```text
main
```

6. Enable these settings:

- Require a pull request before merging.
- Require at least one approval.
- Require status checks to pass before merging.
- Select the CI workflow once GitHub shows it.
- Require conversation resolution before merging.
- Block force pushes.
- Block deletions.

7. Save the rule.

How to confirm it is done:

- GitHub shows a branch protection rule for `main`.
- Direct pushes to `main` should be blocked for normal contributors.
- Pull requests should require CI before merge.

Related repo file:

- `docs/security/branch-protection.md`

## 2. Configure Supabase

Goal: create the real auth/database provider settings for staging.

You need: Supabase project access and permission to manage auth settings and secrets.

Steps:

1. Create or open the Supabase project for Job Globe staging.
2. In Supabase, configure Auth callback URLs for the staging site.
3. Add the local development callback if needed:

```text
http://localhost:3000
```

4. Add the staging callback after the staging URL exists:

```text
https://<staging-domain>
```

5. Collect the required staging values:

- Supabase URL.
- Supabase anon key.
- Supabase service role key, if server-side jobs need it.
- Staging database URL.
- JWT/session settings.

6. Store those values in the hosting provider or GitHub environment secrets.
7. Do not paste secret values into Markdown files, issues, commits, or chat.

How to confirm it is done:

- Supabase project exists.
- Auth callback URLs are set.
- Staging secrets are saved in the secret manager.
- The app can read the required environment variables during deployment.

Related repo files:

- `docs/setup/secrets-management.md`
- `docs/decisions/ADR-005-auth-provider.md`

## 3. Connect Staging Deployment Provider

Goal: make a staging site that deploys from this repository.

You need: access to the selected deployment provider, such as Vercel, Render, Railway, Fly.io, or another approved platform.

Steps:

1. Choose the staging provider with the project owner.
2. Connect the GitHub repository:

```text
vishalgwu/job-globe.com
```

3. Set the app root/build settings for the web app.
4. Add required environment variables from the secret manager.
5. Configure the staging domain.
6. Trigger the first staging deployment.

How to confirm it is done:

- A staging URL exists.
- The staging deployment completes successfully.
- The staging URL loads in a browser.
- The staging URL is added to Supabase callback URLs.

Related repo file:

- `infra/deploy/staging-placeholder.yml`

## 4. Run Migrations And Seeds On Staging

Goal: create the staging database schema and load demo data.

You need: staging database URL and permission to connect to the staging database.

Steps:

1. Get the staging `DATABASE_URL` from the secret manager.
2. Run migrations against staging using the approved deployment process.
3. Run the taxonomy and demo seed files against staging.
4. Verify the staging database has 17 public tables.
5. Verify demo data was loaded.

Useful local reference commands:

```powershell
npm.cmd run migration:check
docker compose -f infra/docker/docker-compose.dev.yml exec -T postgres psql -U job_globe -d job_globe -c "select count(*) as table_count from information_schema.tables where table_schema='public';"
```

Expected verification result:

```text
table_count = 17
jobs_raw = 200 rows
companies = 15 rows
saved_jobs = 5 rows
```

How to confirm it is done:

- Save the staging table count result.
- Save the staging seed count result.
- Update `docs/qa/step-1-completion-report.md` with the staging verification date.

Related repo folders:

- `packages/database/migrations`
- `packages/database/seeds`
- `infra/scripts`

## 5. Get Product Owner Approval

Goal: confirm the product owner agrees with Step 1 architecture decisions and wireframe boundaries.

You need: Product Owner review.

Steps:

1. Send the Product Owner these files:

- `docs/decisions/ADR-001-monorepo-structure.md`
- `docs/decisions/ADR-002-database-choice.md`
- `docs/decisions/ADR-003-globe-library.md`
- `docs/decisions/ADR-004-embedding-model.md`
- `docs/decisions/ADR-005-auth-provider.md`
- `docs/design/wireframe-approval-notes.md`

2. Ask for approval or requested changes.
3. If changes are requested, create a GitHub issue or update the docs in a new PR.
4. If approved, record the approval date and approver name.

How to confirm it is done:

- Product Owner approval is recorded in a GitHub issue, PR comment, email, or project tracker.
- `docs/qa/step-1-completion-report.md` is updated with the approval reference.

## 6. Get Legal/Privacy Sign-Off

Goal: confirm the privacy framework is acceptable before building deeper data workflows.

You need: Legal or Privacy reviewer.

Steps:

1. Send this file for review:

- `docs/decisions/privacy-framework.md`

2. Ask the reviewer to check:

- What user data is collected.
- What job/application data is stored.
- How long data should be retained.
- Whether user deletion/export workflows are required.
- Whether any wording must be added before launch.

3. Record approval or requested changes.
4. If changes are requested, update the privacy framework in a PR.

How to confirm it is done:

- Legal/Privacy approval is recorded in a GitHub issue, PR comment, email, or project tracker.
- `docs/qa/step-1-completion-report.md` is updated with the approval reference.

## Final Step 1 Handoff

After all six items above are complete:

1. Update `docs/qa/step-1-completion-report.md`.
2. Update `docs/qa/step-1-definition-of-done.md`.
3. Run the local verification one more time:

```powershell
npm.cmd run verify:step1
.\.venv-job-globe\Scripts\python.exe -m ruff check apps\workers
.\.venv-job-globe\Scripts\python.exe -m mypy apps\workers\src
.\.venv-job-globe\Scripts\python.exe -m pytest -p no:cacheprovider apps\workers\tests
```

4. Commit the documentation updates.
5. Open a pull request or push to `main`, depending on the branch protection rule.

Step 1 is fully complete only when code, local Docker verification, staging verification, and approval records are all present.
