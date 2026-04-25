#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
for file in packages/database/migrations/*.sql; do
  echo "Running $file"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done
