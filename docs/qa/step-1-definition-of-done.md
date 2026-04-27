# Step 1 Definition of Done

| Requirement | Repository Status | External Status |
| --- | --- | --- |
| Repository initialized with agreed folder structure | Complete | Pushed to GitHub |
| Docker Compose environment runs locally with one command | Complete; Postgres, Redis, web, and worker run locally | Local Docker verified |
| All 11 migrations and 17 tables exist | Complete; validator passes and local Docker DB created 17 tables | Supabase staging created 17 public tables |
| pgvector enabled and functional | Migration enables pgvector and vector columns | Local and staging verification complete |
| Auth provider configured | Supabase config boundary, session/logout/refresh routes, and ADR committed | Supabase project, callbacks, and secrets configured |
| CI pipeline on pull requests | CI workflow committed | Branch protection requires status checks |
| Branch protection active on main | Documented in `docs/security/branch-protection.md` | Enabled on GitHub |
| Design token CSS variables committed | Complete | Product Owner approval received |
| Six base UI stubs exist | Complete | Step 2 will flesh out behavior |
| Globe.GL, React Three Fiber, deck.gl installed/import cleanly | Complete; import smoke passes typecheck/build | None |
| Python worker project initialized | Complete; Ruff/Mypy/Pytest pass | None |
| Redis Streams producer and consumer stubs exist | Complete | Local Redis service verified; feature behavior comes in later steps |
| Privacy Framework committed | Complete | Legal/Privacy sign-off received |
| Demo seed populates all 17 tables | 200-job seed committed and local seed run passed | Supabase staging seed verified |
| Wireframes approved | Shell boundaries and notes committed | Product Owner approval received |
| Foundational ADRs written | Repo, DB, globe, auth, embedding ADRs committed | Product Owner sign-off received |
| CODEOWNERS maps every folder | Complete | GitHub usernames can be expanded later |

Step 1 status: complete as of 2026-04-26.
