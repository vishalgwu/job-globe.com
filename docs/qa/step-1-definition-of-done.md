# Step 1 Definition of Done

| Requirement | Repository Status | External Status |
| --- | --- | --- |
| Repository initialized with agreed folder structure | Complete | Pushed to GitHub |
| Docker Compose environment runs locally with one command | Complete; Postgres, Redis, web, and worker run locally | Local Docker verified |
| All 11 migrations and 17 tables exist | Complete; validator passes and local Docker DB created 17 tables | Staging execution still required |
| pgvector enabled and functional | Migration enables pgvector and vector columns | Local runtime verification passed; staging verification still required |
| Auth provider configured | Supabase config boundary, session/logout/refresh routes, and ADR committed | Supabase project/callbacks/secrets still required |
| CI pipeline on pull requests | CI workflow committed | Branch protection must be enabled in GitHub settings |
| Branch protection active on main | Documented in `docs/security/branch-protection.md` | Requires GitHub admin action |
| Design token CSS variables committed | Complete | Figma/PO approval still external |
| Six base UI stubs exist | Complete | Step 2 will flesh out behavior |
| Globe.GL, React Three Fiber, deck.gl installed/import cleanly | Complete; import smoke passes typecheck/build | None |
| Python worker project initialized | Complete; Ruff/Mypy/Pytest pass | None |
| Redis Streams producer and consumer stubs exist | Complete | Local Redis service verified; feature behavior comes in later steps |
| Privacy Framework committed | Complete draft | LGL sign-off required |
| Demo seed populates all 17 tables | 200-job seed committed and local seed run passed | Staging seed execution still required |
| Wireframes approved | Shell boundaries and notes committed | PO/Figma approval required |
| Foundational ADRs written | Repo, DB, globe, auth, embedding ADRs committed | PO sign-off required |
| CODEOWNERS maps every folder | Complete | GitHub usernames can be expanded later |
