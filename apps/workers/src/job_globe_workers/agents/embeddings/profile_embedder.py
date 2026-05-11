"""Profile embedding generation worker.

Reads profiles rows that have no entry in profile_embeddings yet.
Generates embeddings via OpenAI. Writes to profile_embeddings table.
Runs as a periodic background loop.
"""

from __future__ import annotations

import json
import threading
from typing import Any

import structlog
from openai import OpenAI  # type: ignore[import-untyped]
from psycopg_pool import ConnectionPool

from job_globe_workers.agents.embeddings.job_embedder import embed_text
from job_globe_workers.db.connection import get_pool
from job_globe_workers.settings import settings

logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------


def _build_profile_text(row: Any) -> str:
    """Construct a plain-text representation of a profile for embedding."""
    # Columns: id, headline, preferred_locations, preferred_remote_type, skills, preferences
    headline: str = row[1] or ""
    preferred_locations: list[str] = row[2] or []
    preferred_remote_type: str = row[3] or ""
    skills_raw: Any = row[4]
    preferences_raw: Any = row[5]

    # skills may be a list of strings or a JSONB list already deserialised
    if isinstance(skills_raw, str):
        try:
            skills: list[str] = json.loads(skills_raw)
        except (json.JSONDecodeError, ValueError):
            skills = [skills_raw]
    elif isinstance(skills_raw, list):
        skills = [str(s) for s in skills_raw]
    else:
        skills = []

    # preferences is freeform JSONB — flatten to key: value pairs
    if isinstance(preferences_raw, dict):
        pref_parts = [f"{k}: {v}" for k, v in preferences_raw.items()]
    elif isinstance(preferences_raw, str):
        try:
            parsed = json.loads(preferences_raw)
            pref_parts = [f"{k}: {v}" for k, v in parsed.items()] if isinstance(parsed, dict) else []
        except (json.JSONDecodeError, ValueError):
            pref_parts = []
    else:
        pref_parts = []

    parts: list[str] = []
    if headline:
        parts.append(headline)
    if skills:
        parts.append("Skills: " + ", ".join(skills))
    if preferred_locations:
        parts.append("Preferred locations: " + ", ".join(preferred_locations))
    if preferred_remote_type:
        parts.append(f"Remote preference: {preferred_remote_type}")
    if pref_parts:
        parts.append("Preferences: " + "; ".join(pref_parts))

    return "\n".join(parts)


def embed_pending_profiles(
    pool: ConnectionPool,
    openai_client: OpenAI,
    batch_size: int = 50,
) -> int:
    """Embed up to *batch_size* profiles missing an embedding.

    Returns the number of profiles successfully embedded.
    """
    with pool.connection() as conn:
        rows: list[Any] = conn.execute(
            """
            SELECT p.id, p.headline, p.preferred_locations,
                   p.preferred_remote_type, p.skills, p.preferences
            FROM profiles p
            LEFT JOIN profile_embeddings pe ON pe.profile_id = p.id
            WHERE pe.profile_id IS NULL
            LIMIT %s
            """,
            (batch_size,),
        ).fetchall()

    if not rows:
        return 0

    processed = 0
    for row in rows:
        profile_id: str = str(row[0])
        text = _build_profile_text(row)

        if not text.strip():
            logger.warning("profile_embedder.empty_text", profile_id=profile_id)
            continue

        try:
            vector = embed_text(text, openai_client, settings.embedding_model)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "profile_embedder.embed_failed",
                profile_id=profile_id,
                error=str(exc),
            )
            continue

        try:
            with pool.connection() as conn:
                conn.execute(
                    """
                    INSERT INTO profile_embeddings
                        (profile_id, model, dimensions, embedding, embedded_at)
                    VALUES (%s, %s, %s, %s::vector, NOW())
                    ON CONFLICT (profile_id) DO NOTHING
                    """,
                    (
                        profile_id,
                        settings.embedding_model,
                        settings.embedding_dimensions,
                        str(vector),
                    ),
                )
                conn.commit()
            processed += 1
            logger.debug("profile_embedder.embedded", profile_id=profile_id)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "profile_embedder.insert_failed",
                profile_id=profile_id,
                error=str(exc),
            )

    logger.info(
        "profile_embedder.batch_complete", processed=processed, total=len(rows)
    )
    return processed


# ---------------------------------------------------------------------------
# Worker loop
# ---------------------------------------------------------------------------


def run_profile_embedder_loop(stop_event: threading.Event) -> None:
    """Periodically embed pending profiles until *stop_event* is set."""
    logger.info("profile_embedder.loop.started")

    pool = get_pool()
    openai_client = OpenAI(api_key=settings.openai_api_key)

    while not stop_event.is_set():
        try:
            count = embed_pending_profiles(pool, openai_client)
            if count:
                logger.info("profile_embedder.loop.cycle", embedded=count)
        except Exception as exc:  # noqa: BLE001
            logger.error("profile_embedder.loop.error", error=str(exc))

        stop_event.wait(settings.worker_poll_interval_seconds)

    logger.info("profile_embedder.loop.stopped")
