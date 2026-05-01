#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
python packages/database/scripts/apply_migrations.py packages/database/migrations
