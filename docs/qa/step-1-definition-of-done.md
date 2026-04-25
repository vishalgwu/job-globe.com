# Step 1 Definition of Done

| Requirement | Repository Status | External Status |
| --- | --- | --- |
| Repository initialized with agreed folder structure | Complete | Pushed to GitHub |
| Docker Compose environment runs locally with one command | Compose config complete and validates | Docker Desktop must be running to start services |
| All 11 migrations and 17 tables exist | Complete; validator passes | Staging execution still required |
| pgvector enabled and functional | Migration enables pgvector and vector columns | Runtime DB verification still required |
| Auth provider configured | Supabase config boundary, session/logout/refresh routes, and ADR committed | Supabase project/callbacks/secrets still required |
| CI pipeline on pull requests | CI workflow committed | Branch protection must be enabled in GitHub settings |
| Branch protection active on main | Documented in `docs/security/branch-protection.md` | Requires GitHub admin action |
| Design token CSS variables committed | Complete | Figma/PO approval still external |
| Six base UI stubs exist | Complete | Step 2 will flesh out behavior |
| Globe.GL, React Three Fiber, deck.gl installed/import cleanly | Complete; import smoke passes typecheck/build | None |
| Python worker project initialized | Complete; Ruff/Mypy/Pytest pass | None |
| Redis Streams producer and consumer stubs exist | Complete | Runtime test needs Redis service |
| Privacy Framework committed | Complete draft | LGL sign-off required |
| Demo seed populates all 17 tables | 200-job seed committed | DB execution requires Docker/staging DB |
| Wireframes approved | Shell boundaries and notes committed | PO/Figma approval required |
| Foundational ADRs written | Repo, DB, globe, auth, embedding ADRs committed | PO sign-off required |
| CODEOWNERS maps every folder | Complete | GitHub usernames can be expanded later |
