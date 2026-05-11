# Phase 1 Critical Completion QA Evidence

Updated: 2026-05-11

This file records QA evidence and corrections from the project audit. It does not claim public-launch sign-off.

## Earlier Staging Evidence

The previous Phase 1 pass recorded:

- Supabase health checks against a staging-connected local Next.js server.
- Authenticated flow smoke tests for profile save, resume upload/delete, saved job, application redirect record, alert create/delete.
- Audit rows for profile update, resume upload/delete, saved job create, application redirect, alert create/delete.
- Browser screenshots and basic accessibility-tree checks for `/`, `/privacy`, and `/login`.
- Basic performance timing artifacts under `docs/qa/artifacts/`.

Those artifacts remain useful as historical evidence, but they are not enough for current launch readiness because subsequent code changes introduced or exposed build/test/config gaps.

## Current Audit Verification

Commands run on 2026-05-11:

| Check | Result |
|---|---|
| `npm run test --workspace=apps/web` | ✅ Passed: 5 test files, 48 tests. |
| `python packages/database/scripts/validate_migrations.py packages/database/migrations` | ✅ Passed: 16 files, 21 tables, pgvector, GIN indexes, resume uniqueness, alert deliveries, and audit retention. |
| `.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src` | ✅ Passed: 56 source files. |
| `npm run typecheck` | ❌ Failed: TypeScript cannot resolve `openai` or `ioredis`. |
| `.\.venv-job-globe\Scripts\python.exe -m ruff check apps/workers` | ❌ Failed: 11 lint issues. |
| `.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests` | ❌ Failed: 98 passed, 5 failed. |

## Current Failure Detail

### Web Typecheck

`npm run typecheck` fails because these imports cannot resolve:

- `openai` in `apps/web/app/api/quick-prep/route.ts`.
- `ioredis` in `apps/web/app/api/webhooks/greenhouse/route.ts`.
- `ioredis` in `apps/web/app/api/webhooks/lever/route.ts`.

Root cause found during audit: `apps/web/package.json` declares the dependencies, but `package-lock.json` and the installed dependency tree do not include them.

### Worker Pytest

Worker tests collected 103 tests:

- 98 passed.
- 5 failed in `apps/workers/tests/parsers/test_resume_extractor.py`.

Failure categories:

- Test patch target `unstructured.partition.docx.partition_docx` cannot resolve in the installed environment.
- Tests patch `job_globe_workers.parsers.resume_extractor.OpenAI`, but `OpenAI` is imported inside the function rather than at module scope.

### Worker Ruff

Ruff fails on:

- Long lines in `agents/alert_evaluator/email_sender.py`.
- `zip()` calls without `strict=`.
- `datetime.UTC` modernization.
- Long lines in audit cleanup/profile embedder.
- Unsorted/unused imports in resume parser tests.

## Product QA Risks

- `/privacy` route is a draft notice and should not be treated as legal-approved policy evidence.
- Resume upload smoke evidence does not prove resume parsing, because parser download path currently mismatches upload object keys.
- Account deletion route has correctness defects and must not be considered verified.
- Alert email delivery is not verified.
- No human screen-reader pass has been completed.
- No current k6 load-test baseline has been recorded.
- No formal security review or penetration test evidence exists.

## Required Before Public Launch

- All build/typecheck/lint/test checks green.
- Resume upload -> parse -> user-visible status verified.
- Account export/delete verified end to end, including raw Storage cleanup.
- `/privacy` route or external policy reviewed and approved.
- Supabase RLS and Storage policies reviewed.
- Human screen-reader pass completed.
- Load-test baseline captured.
- Production deployment and rollback proof captured.
