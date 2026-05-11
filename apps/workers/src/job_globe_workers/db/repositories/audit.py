"""Audit-event writes for worker-side system failures."""

from __future__ import annotations

import json
from typing import Any

import structlog
from psycopg import Connection
from psycopg_pool import ConnectionPool

logger = structlog.get_logger(__name__)


def insert_audit_event(
    conn: Connection[Any],
    *,
    event_type: str,
    subject_type: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Insert an audit_events row for a system event."""
    conn.execute(
        """
        INSERT INTO audit_events (
            actor_user_id, event_type, subject_type, subject_id, metadata
        )
        VALUES (NULL, %s, %s, NULL, %s::jsonb)
        """,
        (event_type, subject_type, json.dumps(metadata or {})),
    )


def record_worker_failure(
    pool: ConnectionPool,
    *,
    agent_name: str,
    error: Exception,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Best-effort audit write for worker failures.

    Audit logging must not break ingestion. If the audit insert fails, the
    worker keeps running and the original structured log remains the fallback.
    """
    payload = {
        "agentName": agent_name,
        "error": str(error),
        **(metadata or {}),
    }

    try:
        with pool.connection() as conn:
            insert_audit_event(
                conn,
                event_type="worker.failure",
                subject_type="worker",
                metadata=payload,
            )
            conn.commit()
    except Exception as audit_error:  # noqa: BLE001
        logger.warning(
            "audit.worker_failure_write_failed",
            agent_name=agent_name,
            error=str(audit_error),
        )
