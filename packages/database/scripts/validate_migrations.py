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
    "012_job_time_filter_indexes.sql",
    "013_profiles_preferences.sql",
    "014_resume_extractions_user_unique.sql",
    "015_alert_deliveries_and_quick_prep.sql",
    "016_audit_retention.sql",
    "017_privacy_data_safety.sql",
]
EXPECTED_TABLES = {
    "users", "auth_sessions", "profiles", "resume_extractions", "companies", "locations",
    "jobs_raw", "jobs_canonical", "job_taxonomy", "job_taxonomy_links", "job_embeddings",
    "profile_embeddings", "saved_jobs", "applications", "alerts", "agent_runs", "audit_events",
    "alert_deliveries", "notifications", "quick_prep_cache", "audit_retention_policies",
}


def main(migrations_dir: str) -> int:
    root = Path(migrations_dir)
    files = sorted(path.name for path in root.glob("*.sql"))
    if files != EXPECTED_FILES:
        print(f"Migration file order mismatch: {files}")
        return 1
    sql = "\n".join((root / name).read_text(encoding="utf-8") for name in EXPECTED_FILES)  # noqa: E501
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
    if "idx_jobs_canonical_status_first_seen_at" not in sql:
        print("Expected jobs_canonical time-filter index is missing")
        return 1
    if "idx_resume_extractions_user_unique" not in sql:
        print("Expected resume_extractions user uniqueness index is missing")
        return 1
    if "alert_deliveries" not in sql:
        print("Expected alert_deliveries table is missing")
        return 1
    if "audit_retention_policies" not in sql:
        print("Expected audit_retention_policies table is missing")
        return 1
    if "delete_internal_account" not in sql:
        print("Expected atomic account deletion function is missing")
        return 1
    if "ALTER TABLE resume_extractions\n  ADD COLUMN IF NOT EXISTS parsed_at" not in sql:
        print("Expected resume parsed_at retention marker is missing")
        return 1
    if "ALTER TABLE users ENABLE ROW LEVEL SECURITY" not in sql:
        print("Expected user-owned table RLS is missing")
        return 1
    if "resumes_users_select_own" not in sql:
        print("Expected resumes storage policies are missing")
        return 1
    print(
        "Migration validation passed: 17 files, 21 tables, pgvector, GIN indexes, "
        "resume uniqueness, alert deliveries, audit retention, and privacy hardening present."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv) > 1 else "packages/database/migrations"))
