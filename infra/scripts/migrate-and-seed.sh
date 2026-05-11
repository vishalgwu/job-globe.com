#!/usr/bin/env bash
# Run database migrations and seed data.
#
# Usage:
#   DATABASE_URL=postgresql://... ./infra/scripts/migrate-and-seed.sh
#   DATABASE_URL=postgresql://... ./infra/scripts/migrate-and-seed.sh --no-seed
#
# Options:
#   --no-seed   Skip seeding (run migrations only)
#   --no-demo   Skip demo_jobs seed (taxonomy only)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

: "${DATABASE_URL:?DATABASE_URL environment variable is required}"

RUN_SEED=true
RUN_DEMO=true

for arg in "$@"; do
  case "${arg}" in
    --no-seed) RUN_SEED=false ;;
    --no-demo) RUN_DEMO=false ;;
    *) echo "Unknown argument: ${arg}" >&2; exit 1 ;;
  esac
done

# ── 1. Apply schema migrations ───────────────────────────────────────────────
echo "==> Running schema migrations..."
cd "${REPO_ROOT}"
python packages/database/scripts/apply_migrations.py packages/database/migrations
echo "    Migrations complete."

# ── 2. Seed taxonomy reference data ─────────────────────────────────────────
if "${RUN_SEED}"; then
  TAXONOMY_SEED="${REPO_ROOT}/packages/database/seeds/taxonomy_reference.sql"
  if [[ -f "${TAXONOMY_SEED}" ]]; then
    echo "==> Seeding taxonomy reference data..."
    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${TAXONOMY_SEED}"
    echo "    Taxonomy seed complete."
  else
    echo "    WARN: taxonomy seed file not found at ${TAXONOMY_SEED}, skipping."
  fi

  # ── 3. Seed demo jobs ──────────────────────────────────────────────────────
  if "${RUN_DEMO}"; then
    DEMO_SEED="${REPO_ROOT}/packages/database/seeds/demo_jobs.sql"
    if [[ -f "${DEMO_SEED}" ]]; then
      echo "==> Seeding demo jobs..."
      psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${DEMO_SEED}"
      echo "    Demo jobs seed complete."
    else
      echo "    WARN: demo jobs seed file not found at ${DEMO_SEED}, skipping."
    fi
  fi
fi

echo ""
echo "Database initialisation finished successfully."
