#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/database/seeds/taxonomy_reference.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/database/seeds/demo_jobs.sql
