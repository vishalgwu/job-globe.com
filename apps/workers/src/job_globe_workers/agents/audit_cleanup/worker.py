"""Audit event retention cleanup worker.

Runs every audit_cleanup_interval_hours hours.

1. Loads audit_retention_policies from the DB.
2. For each policy, stamps expires_at on matching audit_events rows that
   have NULL expires_at, based on retention_days.
3. Deletes all rows where expires_at < NOW().

Policy glob matching uses fnmatch so patterns like 'worker.*' and '*' work
without requiring a full regex engine.
"""

from __future__ import annotations

import fnmatch
import threading
from typing import Any

import structlog

from job_globe_workers.db.connection import get_pool
from job_globe_workers.settings import settings

logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Core operations
# ---------------------------------------------------------------------------


def apply_retention_policies(pool: Any) -> int:
    """Stamp expires_at on audit_events rows that match a retention policy.

    Only rows with expires_at IS NULL are touched.  For each policy the
    expiry is set to occurred_at + retention_days.

    Returns the total number of rows updated.
    """
    with pool.connection() as conn:
        policy_rows: list[Any] = conn.execute(
            """
            SELECT id, event_type_glob, retention_days
            FROM audit_retention_policies
            ORDER BY retention_days ASC
            """,
        ).fetchall()

    if not policy_rows:
        return 0

    policies: list[dict[str, Any]] = [
        {"id": r[0], "glob": r[1], "retention_days": int(r[2])}
        for r in policy_rows
    ]

    # Fetch distinct event_types that still have NULL expires_at
    with pool.connection() as conn:
        type_rows: list[Any] = conn.execute(
            """
            SELECT DISTINCT event_type
            FROM audit_events
            WHERE expires_at IS NULL
            """
        ).fetchall()

    event_types: list[str] = [str(r[0]) for r in type_rows]

    total_updated = 0
    for event_type in event_types:
        # Find the matching policy with the shortest (strictest) retention
        matched_policy: dict[str, Any] | None = None
        for policy in policies:
            if fnmatch.fnmatch(event_type, policy["glob"]):
                if matched_policy is None or policy["retention_days"] < matched_policy["retention_days"]:
                    matched_policy = policy

        if matched_policy is None:
            continue

        retention_days: int = matched_policy["retention_days"]
        with pool.connection() as conn:
            result = conn.execute(
                """
                UPDATE audit_events
                SET expires_at = occurred_at + (%s || ' days')::interval
                WHERE event_type = %s
                  AND expires_at IS NULL
                """,
                (str(retention_days), event_type),
            )
            conn.commit()
            rows_updated = result.rowcount or 0

        if rows_updated:
            logger.debug(
                "audit_cleanup.policy_applied",
                event_type=event_type,
                retention_days=retention_days,
                rows_updated=rows_updated,
            )
        total_updated += rows_updated

    logger.info("audit_cleanup.policies_applied", total_updated=total_updated)
    return total_updated


def delete_expired_events(pool: Any) -> int:
    """Delete all audit_events rows where expires_at < NOW().

    Returns the number of rows deleted.
    """
    with pool.connection() as conn:
        result = conn.execute(
            "DELETE FROM audit_events WHERE expires_at IS NOT NULL AND expires_at < NOW()"
        )
        conn.commit()
        deleted = result.rowcount or 0

    logger.info("audit_cleanup.deleted_expired", rows_deleted=deleted)
    return deleted


# ---------------------------------------------------------------------------
# Worker loop
# ---------------------------------------------------------------------------


def run_audit_cleanup_loop(stop_event: threading.Event) -> None:
    """Apply retention policies and purge expired events periodically."""
    logger.info("audit_cleanup.loop.started")
    pool = get_pool()

    interval_seconds = settings.audit_cleanup_interval_hours * 3600

    while not stop_event.is_set():
        try:
            updated = apply_retention_policies(pool)
            deleted = delete_expired_events(pool)
            logger.info(
                "audit_cleanup.cycle_complete",
                policies_applied_rows=updated,
                rows_deleted=deleted,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("audit_cleanup.loop.error", error=str(exc))

        stop_event.wait(float(interval_seconds))

    logger.info("audit_cleanup.loop.stopped")
