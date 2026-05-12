"""Job embedding generation worker.

Reads jobs_canonical rows that have no entry in job_embeddings yet.
Generates embeddings via OpenAI. Writes to job_embeddings table.
Runs as a periodic background loop.
"""

from __future__ import annotations

import threading
from typing import Any

import structlog
from openai import OpenAI  # type: ignore[import-untyped]
from psycopg_pool import ConnectionPool

from job_globe_workers.db.connection import get_pool
from job_globe_workers.settings import settings

logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------


def embed_text(text: str, client: OpenAI, model: str) -> list[float]:
    """Generate a single embedding vector for *text* using the OpenAI API."""
    response = client.embeddings.create(
        input=text,
        model=model,
    )
    return response.data[0].embedding


def embed_pending_jobs(
    pool: ConnectionPool,
    openai_client: OpenAI,
    batch_size: int = 50,
) -> int:
    """Embed up to *batch_size* jobs that are missing an embedding.

    Returns the number of jobs successfully embedded.
    """
    with pool.connection() as conn:
        rows: list[Any] = conn.execute(
            """
            SELECT j.id, j.title, j.description, j.required_skills
            FROM jobs_canonical j
            LEFT JOIN job_embeddings je ON je.job_id = j.id
            WHERE je.job_id IS NULL
              AND j.status = 'active'
            LIMIT %s
            """,
            (batch_size,),
        ).fetchall()

    if not rows:
        return 0

    processed = 0
    for row in rows:
        job_id: str = str(row[0])
        title: str = row[1] or ""
        description: str = row[2] or ""
        required_skills: list[str] = row[3] or []

        text = (
            title
            + "\n"
            + description
            + "\nSkills: "
            + ", ".join(required_skills)
        )

        try:
            vector = embed_text(text, openai_client, settings.embedding_model)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "job_embedder.embed_failed",
                job_id=job_id,
                error=str(exc),
            )
            continue

        try:
            with pool.connection() as conn:
                conn.execute(
                    """
                    INSERT INTO job_embeddings (job_id, model, dimensions, embedding, embedded_at)
                    VALUES (%s, %s, %s, %s::vector, NOW())
                    ON CONFLICT (job_id) DO NOTHING
                    """,
                    (
                        job_id,
                        settings.embedding_model,
                        settings.embedding_dimensions,
                        str(vector),
                    ),
                )
                conn.commit()
            processed += 1
            logger.debug("job_embedder.embedded", job_id=job_id)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "job_embedder.insert_failed",
                job_id=job_id,
                error=str(exc),
            )

    logger.info("job_embedder.batch_complete", processed=processed, total=len(rows))
    return processed


# ---------------------------------------------------------------------------
# Worker loop
# ---------------------------------------------------------------------------


def run_job_embedder_loop(stop_event: threading.Event) -> None:
    """Periodically embed pending jobs until *stop_event* is set."""
    logger.info("job_embedder.loop.started")

    pool = get_pool()

    while not stop_event.is_set():
        # Guard: skip cycle if API key is not yet configured rather than crashing.
        if not settings.openai_api_key:
            logger.warning(
                "job_embedder.no_api_key",
                msg="OPENAI_API_KEY not set; skipping cycle. Set OPENAI_API_KEY in Railway.",
            )
            stop_event.wait(60.0)
            continue

        try:
            openai_client = OpenAI(api_key=settings.openai_api_key)
            count = embed_pending_jobs(pool, openai_client)
            if count:
                logger.info("job_embedder.loop.cycle", embedded=count)
        except Exception as exc:  # noqa: BLE001
            logger.error("job_embedder.loop.error", error=str(exc))

        stop_event.wait(settings.worker_poll_interval_seconds)

    logger.info("job_embedder.loop.stopped")
