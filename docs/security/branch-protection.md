# Branch Protection and Release Process

Last updated: 2026-05-10

## Required GitHub settings for `main`

Enable the following in **Settings → Branches → Branch protection rules** for the `main` branch:

- Require a pull request before merging
- Require at least 1 approving review
- Dismiss stale pull request approvals when new commits are pushed
- Require the CI workflow (`CI`) to pass before merging
- Require conversation resolution before merging
- Block force pushes
- Block branch deletion

These settings cannot be committed to the repository — they must be configured directly in GitHub.

## Release process

All changes to `main` must go through a pull request:

1. Create a feature branch from `main` (e.g. `feat/alerts-api`).
2. Make changes, commit, and push the branch.
3. Open a pull request targeting `main`.
4. CI must pass (web lint/typecheck/test/build, workers ruff/mypy/pytest, database migration check).
5. At least one reviewer must approve.
6. All review conversations must be resolved.
7. Merge via squash or merge commit — no force pushes.

Vercel deploys automatically from `main` after a successful merge. See `docs/runbooks/vercel-deployment.md` for rollback steps.

## Hotfix process

For urgent production fixes:

1. Branch from `main` with a `hotfix/` prefix.
2. Keep the change minimal and focused.
3. Open a pull request and request expedited review.
4. If a reviewer is not available within 1 hour for a P0 incident, the project owner may merge with a self-review and file a retrospective issue.

## Phase 5 status

Branch protection rules are not yet enabled on the `main` branch. This must be configured before the project is considered production-ready.

**Action required:** Configure branch protection rules in GitHub settings for `vishalgwu/job-globe.com` before Phase 5 launch sign-off.
