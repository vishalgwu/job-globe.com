# Testing Conventions

- Frontend unit tests live beside components as `*.test.tsx` when introduced.
- Worker tests live in `apps/workers/tests` and use pytest.
- Database migrations are validated by `packages/database/scripts/validate_migrations.py` and later by applying them to the test PostgreSQL service.
- Naming convention: tests describe observable behavior, not implementation details.
- Coverage target for shared logic after Step 2: 80% line coverage on changed packages.
