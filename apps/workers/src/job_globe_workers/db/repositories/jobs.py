"""Repository for jobs_raw and jobs_canonical tables.

All writes are idempotent:
  - jobs_raw uses ON CONFLICT (source, source_job_id) DO UPDATE
  - jobs_canonical uses ON CONFLICT (apply_url) DO UPDATE
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

import structlog
from psycopg import Connection

logger = structlog.get_logger(__name__)


def upsert_raw_job(
    conn: Connection[Any],
    *,
    source: str,
    source_job_id: str,
    source_url: str,
    payload: dict[str, Any],
    fetched_at: datetime | None = None,
) -> uuid.UUID:
    """Insert or update a raw job record.  Returns the row UUID."""
    fetched_at = fetched_at or datetime.utcnow()
    row = conn.execute(
        """
        INSERT INTO jobs_raw (source, source_job_id, source_url, payload, fetched_at)
        VALUES (%s, %s, %s, %s::jsonb, %s)
        ON CONFLICT (source, source_job_id)
        DO UPDATE SET
            source_url   = EXCLUDED.source_url,
            payload      = EXCLUDED.payload,
            fetched_at   = EXCLUDED.fetched_at
        RETURNING id
        """,
        (source, source_job_id, source_url, json.dumps(payload), fetched_at),
    ).fetchone()
    raw_id: uuid.UUID = row[0]  # type: ignore[index]
    logger.debug("jobs_raw.upserted", source=source, source_job_id=source_job_id, id=str(raw_id))
    return raw_id


def mark_raw_job_verified(conn: Connection[Any], raw_job_id: uuid.UUID) -> None:
    """Stamp verified_live_at on a raw job after URL verification passes."""
    conn.execute(
        "UPDATE jobs_raw SET verified_live_at = now() WHERE id = %s",
        (raw_job_id,),
    )


def upsert_canonical_job(
    conn: Connection[Any],
    *,
    raw_job_id: uuid.UUID | None,
    company_id: uuid.UUID | None,
    location_id: uuid.UUID | None,
    title: str,
    description: str,
    employment_type: str,
    remote_type: str,
    seniority: str,
    apply_url: str,
    salary_min: int | None,
    salary_max: int | None,
    currency: str,
    required_skills: list[str],
    expires_at: datetime | None = None,
) -> uuid.UUID:
    """Insert or update a canonical job.  Returns the row UUID."""
    row = conn.execute(
        """
        INSERT INTO jobs_canonical (
            raw_job_id, company_id, location_id,
            title, description, employment_type, remote_type, seniority,
            apply_url, salary_min, salary_max, currency, required_skills,
            status, first_seen_at, last_seen_at, expires_at
        ) VALUES (
            %s, %s, %s,
            %s, %s, %s, %s::job_remote_type, %s,
            %s, %s, %s, %s, %s::text[],
            'active', now(), now(), %s
        )
        ON CONFLICT (apply_url) DO UPDATE SET
            raw_job_id      = COALESCE(EXCLUDED.raw_job_id, jobs_canonical.raw_job_id),
            company_id      = COALESCE(EXCLUDED.company_id, jobs_canonical.company_id),
            location_id     = COALESCE(EXCLUDED.location_id, jobs_canonical.location_id),
            title           = EXCLUDED.title,
            description     = EXCLUDED.description,
            employment_type = EXCLUDED.employment_type,
            remote_type     = EXCLUDED.remote_type::job_remote_type,
            seniority       = EXCLUDED.seniority,
            salary_min      = COALESCE(EXCLUDED.salary_min, jobs_canonical.salary_min),
            salary_max      = COALESCE(EXCLUDED.salary_max, jobs_canonical.salary_max),
            currency        = EXCLUDED.currency,
            required_skills = EXCLUDED.required_skills,
            status          = 'active',
            last_seen_at    = now(),
            expires_at      = COALESCE(EXCLUDED.expires_at, jobs_canonical.expires_at)
        RETURNING id
        """,
        (
            raw_job_id, company_id, location_id,
            title, description, employment_type, remote_type, seniority,
            apply_url, salary_min, salary_max, currency, required_skills,
            expires_at,
        ),
    ).fetchone()
    canonical_id: uuid.UUID = row[0]  # type: ignore[index]
    logger.debug(
        "jobs_canonical.upserted",
        apply_url=apply_url,
        id=str(canonical_id),
    )
    return canonical_id


def expire_stale_jobs(conn: Connection[Any], *, older_than_days: int = 30) -> int:
    """Mark canonical jobs that haven't been seen recently as expired.

    Returns the count of rows updated.
    """
    result = conn.execute(
        """
        UPDATE jobs_canonical
        SET status = 'expired'
        WHERE status = 'active'
          AND last_seen_at < now() - make_interval(days => %s)
        """,
        (older_than_days,),
    )
    count: int = result.rowcount  # type: ignore[assignment]
    if count:
        logger.info("jobs.stale_expired", count=count, older_than_days=older_than_days)
    return count


def get_canonical_job_id_by_url(
    conn: Connection[Any], apply_url: str
) -> uuid.UUID | None:
    """Return the canonical job UUID for a given apply_url, or None."""
    row = conn.execute(
        "SELECT id FROM jobs_canonical WHERE apply_url = %s",
        (apply_url,),
    ).fetchone()
    if row is None:
        return None
    return uuid.UUID(str(row[0]))
