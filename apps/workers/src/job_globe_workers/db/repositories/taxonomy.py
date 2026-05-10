"""Repository for job_taxonomy and job_taxonomy_links tables."""

from __future__ import annotations

import uuid
from typing import Any

import structlog
from psycopg import Connection

logger = structlog.get_logger(__name__)

# Module-level cache: (category, value) → UUID
# Avoids a DB roundtrip per-job for well-known taxonomy entries.
_taxonomy_cache: dict[tuple[str, str], uuid.UUID] = {}


def get_taxonomy_id(
    conn: Connection[Any], *, category: str, value: str
) -> uuid.UUID | None:
    """Return the UUID for a known taxonomy (category, value) pair, or None."""
    cache_key = (category, value)
    if cache_key in _taxonomy_cache:
        return _taxonomy_cache[cache_key]

    row = conn.execute(
        "SELECT id FROM job_taxonomy WHERE category = %s AND value = %s",
        (category, value),
    ).fetchone()
    if row is None:
        return None
    tid = uuid.UUID(str(row[0]))
    _taxonomy_cache[cache_key] = tid
    return tid


def load_taxonomy_synonyms(
    conn: Connection[Any],
) -> dict[str, dict[str, uuid.UUID]]:
    """Return {category: {synonym/value: taxonomy_id}} for all rows.

    Used by the tagger to match free-text signals to taxonomy entries.
    """
    rows = conn.execute(
        "SELECT id, category, value, synonyms FROM job_taxonomy"
    ).fetchall()

    index: dict[str, dict[str, uuid.UUID]] = {}
    for row_id, category, value, synonyms in rows:
        tid = uuid.UUID(str(row_id))
        index.setdefault(category, {})[value] = tid
        for syn in (synonyms or []):
            index[category][syn] = tid

    return index


def link_taxonomy(
    conn: Connection[Any],
    *,
    job_id: uuid.UUID,
    taxonomy_id: uuid.UUID,
    confidence: float = 1.0,
) -> None:
    """Insert or update a job ↔ taxonomy link."""
    conn.execute(
        """
        INSERT INTO job_taxonomy_links (job_id, taxonomy_id, confidence)
        VALUES (%s, %s, %s)
        ON CONFLICT (job_id, taxonomy_id) DO UPDATE SET confidence = EXCLUDED.confidence
        """,
        (job_id, taxonomy_id, confidence),
    )
