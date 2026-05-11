#!/usr/bin/env bash
# Deploy the Job Globe Python workers to Railway.
#
# Usage:
#   chmod +x infra/scripts/railway-deploy.sh
#   ./infra/scripts/railway-deploy.sh
#
# Prerequisites:
#   - .env file at the repo root with all required variables
#   - Railway account with a project already created (or create via `railway init`)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

# ── 1. Ensure Railway CLI is available ───────────────────────────────────────
if ! command -v railway &>/dev/null; then
  echo "Railway CLI not found. Installing..."
  if command -v brew &>/dev/null; then
    brew install railway
  elif command -v npm &>/dev/null; then
    npm install -g @railway/cli
  else
    curl -fsSL https://railway.app/install.sh | sh
  fi
fi

RAILWAY_VERSION="$(railway --version 2>&1 | head -1)"
echo "Using Railway CLI: ${RAILWAY_VERSION}"

# ── 2. Authenticate ──────────────────────────────────────────────────────────
echo ""
echo "Logging in to Railway (browser will open)..."
railway login

# ── 3. Link project ──────────────────────────────────────────────────────────
echo ""
echo "Linking Railway project (follow the prompts)..."
railway link

# ── 4. Push environment variables from .env ──────────────────────────────────
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} not found. Copy .env.example to .env and fill in values." >&2
  exit 1
fi

echo ""
echo "Syncing environment variables from ${ENV_FILE} to Railway..."

# Variables that must NOT be forwarded to Railway (local-only / Vercel-only)
SKIP_VARS=(
  "NODE_ENV"
  "NEXT_PUBLIC_APP_URL"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "POSTGRES_USER"
  "POSTGRES_PASSWORD"
  "POSTGRES_DB"
)

while IFS= read -r line || [[ -n "${line}" ]]; do
  # Skip blank lines and comments
  [[ -z "${line}" || "${line}" =~ ^[[:space:]]*# ]] && continue

  # Only process KEY=VALUE lines
  if [[ "${line}" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"

    # Skip placeholder values
    if [[ "${value}" == *"replace-with"* || -z "${value}" ]]; then
      continue
    fi

    # Skip frontend-only vars
    skip=false
    for skip_key in "${SKIP_VARS[@]}"; do
      if [[ "${key}" == "${skip_key}" ]]; then
        skip=true
        break
      fi
    done
    "${skip}" && continue

    railway variables --set "${key}=${value}"
    echo "  set ${key}"
  fi
done < "${ENV_FILE}"

echo "Environment variables synced."

# ── 5. Deploy ─────────────────────────────────────────────────────────────────
echo ""
echo "Deploying workers to Railway..."
cd "${REPO_ROOT}"
railway up --detach

echo ""
echo "Deployment triggered. Monitor progress at: https://railway.app/dashboard"
echo "To stream logs: railway logs --tail"
