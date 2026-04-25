from __future__ import annotations

import re
import sys
from pathlib import Path

EXPECTED_FILES = [
    "001_users_and_auth.sql",
    "002_profiles.sql",
    "003_companies.sql",
    "004_locations.sql",
    "005_jobs_raw_and_canonical.sql",
    "006_job_taxonomy.sql",
    "007_embeddings.sql",
    "008_saved_and_applications.sql",
    "009_alerts.sql",
    "010_agent_runs.sql",
    "011_audit_events.sql",
]
EXPECTED_TABLES = {
    "users", "auth_sessions", "profiles", "resume_extractions", "companies", "locations",
    "jobs_raw", "jobs_canonical", "job_taxonomy", "job_taxonomy_links", "job_embeddings",
    "profile_embeddings", "saved_jobs", "applications", "alerts", "agent_runs", "audit_events",
}


def main(migrations_dir: str) -> int:
    root = Path(migrations_dir)
    files = sorted(path.name for path in root.glob("*.sql"))
    if files != EXPECTED_FILES:
        print(f"Migration file order mismatch: {files}")
        return 1
    sql = "\n".join((root / name).read_text(encoding="utf-8") for name in EXPECTED_FILES)
    tables = set(re.findall(r"CREATE TABLE IF NOT EXISTS\s+([a-z_]+)", sql, flags=re.I))
    missing = EXPECTED_TABLES - tables
    extra = tables - EXPECTED_TABLES
    if missing or extra:
        print(f"Missing tables: {sorted(missing)}")
        print(f"Extra tables: {sorted(extra)}")
        return 1
    if "CREATE EXTENSION IF NOT EXISTS vector" not in sql:
        print("pgvector extension is not enabled")
        return 1
    if "USING GIN" not in sql:
        print("Expected GIN indexes are missing")
        return 1
    print("Migration validation passed: 11 files, 17 tables, pgvector, and GIN indexes present.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv) > 1 else "packages/database/migrations"))
