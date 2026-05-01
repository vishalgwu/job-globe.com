from __future__ import annotations

import hashlib
import os
import subprocess
import sys
import time
from pathlib import Path


CREATE_HISTORY_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  execution_ms INTEGER NOT NULL
);
"""


def main(migrations_dir: str) -> int:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required", file=sys.stderr)
        return 1

    root = Path(migrations_dir)
    files = sorted(root.glob("*.sql"))
    if not files:
        print(f"No migration files found in {root}", file=sys.stderr)
        return 1

    run_psql(database_url, sql=CREATE_HISTORY_TABLE_SQL)

    applied = 0
    skipped = 0

    for file_path in files:
        version = file_path.stem
        checksum = sha256(file_path)
        existing_checksum = migration_checksum(database_url, version)

        if existing_checksum:
            if existing_checksum != checksum:
                print(
                    f"Checksum mismatch for {version}: database has {existing_checksum}, "
                    f"file has {checksum}",
                    file=sys.stderr,
                )
                return 1

            print(f"Skipping {file_path.name}; already applied")
            skipped += 1
            continue

        print(f"Applying {file_path.name}")
        start = time.perf_counter()
        run_psql(database_url, file_path=file_path)
        execution_ms = round((time.perf_counter() - start) * 1000)
        record_migration(database_url, version, checksum, execution_ms)
        applied += 1

    print(f"Migration history up to date: {applied} applied, {skipped} skipped.")
    return 0


def migration_checksum(database_url: str, version: str) -> str | None:
    result = run_psql(
        database_url,
        sql=(
            "SELECT checksum FROM schema_migrations "
            f"WHERE version = {sql_literal(version)};"
        ),
        capture_output=True,
    )
    checksum = result.stdout.strip()
    return checksum or None


def record_migration(database_url: str, version: str, checksum: str, execution_ms: int) -> None:
    run_psql(
        database_url,
        sql=(
            "INSERT INTO schema_migrations (version, checksum, execution_ms) VALUES "
            f"({sql_literal(version)}, {sql_literal(checksum)}, {execution_ms});"
        ),
    )


def run_psql(
    database_url: str,
    *,
    sql: str | None = None,
    file_path: Path | None = None,
    capture_output: bool = False,
) -> subprocess.CompletedProcess[str]:
    if (sql is None) == (file_path is None):
        raise ValueError("Pass exactly one of sql or file_path.")

    command = ["psql", database_url, "-v", "ON_ERROR_STOP=1"]
    if sql is not None:
        command.extend(["-At", "-c", sql])
    else:
        command.extend(["-f", str(file_path)])

    try:
        return subprocess.run(
            command,
            check=True,
            text=True,
            capture_output=capture_output,
        )
    except FileNotFoundError as error:
        raise SystemExit(
            "psql was not found. Install PostgreSQL client tools or run this script in an "
            "environment that provides psql."
        ) from error


def sha256(file_path: Path) -> str:
    digest = hashlib.sha256()
    with file_path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv) > 1 else "packages/database/migrations"))
