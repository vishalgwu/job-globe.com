"""Repository for the agent_runs table.

agent_runs gives us an audit trail of every ingestion cycle —
how many jobs were processed/failed, how long it took, and any error.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

import structlog
from psycopg import Connection

logger = structlog.get_logger(__name__)


def start_agent_run(
    conn: Connection[Any],
    *,
    agent_name: str,
    source: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> uuid.UUID:
    """Create an agent_run row with status='started'.  Returns its UUID."""
    row = conn.execute(
        """
        INSERT INTO agent_runs (agent_name, status, source, metadata)
        VALUES (%s, 'started', %s, %s::jsonb)
        RETURNING id
        """,
        (agent_name, source, json.dumps(metadata or {})),
    ).fetchone()
    run_id: uuid.UUID = row[0]  # type: ignore[index]
    logger.debug("agent_run.started", agent=agent_name, source=source, run_id=str(run_id))
    return run_id


def finish_agent_run(
    conn: Connection[Any],
    *,
    run_id: uuid.UUID,
    processed_count: int,
    failed_count: int,
    error_message: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Mark an agent_run as completed (or failed if error_message is set)."""
    status = "failed" if error_message else "completed"
    conn.execute(
        """
        UPDATE agent_runs SET
            status          = %s,
            finished_at     = now(),
            processed_count = %s,
            failed_count    = %s,
            error_message   = %s,
            metadata        = metadata || %s::jsonb
        WHERE id = %s
        """,
        (
            status,
            processed_count,
            failed_count,
            error_message,
            json.dumps(metadata or {}),
            run_id,
        ),
    )
    logger.info(
        "agent_run.finished",
        run_id=str(run_id),
        status=status,
        processed=processed_count,
        failed=failed_count,
    )


def get_last_run_time(
    conn: Connection[Any], *, agent_name: str, source: str | None = None
) -> datetime | None:
    """Return the started_at of the most recent completed run for an agent+source pair."""
    row = conn.execute(
        """
        SELECT started_at FROM agent_runs
        WHERE agent_name = %s
          AND (%s IS NULL OR source = %s)
          AND status = 'completed'
        ORDER BY started_at DESC
        LIMIT 1
        """,
        (agent_name, source, source),
    ).fetchone()
    return row[0] if row else None
