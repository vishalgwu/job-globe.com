"""Worker health and observability module.

Provides:
  - queue_depths()  — Redis stream pending/lag counts per stream
  - source_freshness() — age of last successful run per connector
  - ingestion_summary() — 24-hour counts from agent_runs table
  - report()  — structured health dict for logging / API exposure
  - log_health_loop() — background thread that logs health on an interval

All functions are side-effect free (read-only) except log_health_loop.
"""

from __future__ import annotations

import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import structlog
from redis import Redis

from job_globe_workers.db.connection import get_pool
from job_globe_workers.settings import settings

logger = structlog.get_logger(__name__)

_STREAMS = [
    settings.discovery_stream,
    settings.verification_stream,
    settings.canonical_stream,
    settings.alerts_stream,
]

_SOURCES = [
    "greenhouse",
    "lever",
    "adzuna",
    "usajobs",
    "eures",
    "workable",
    "smartrecruiters",
]


# ── Redis stream metrics ───────────────────────────────────────────────────

def queue_depths() -> dict[str, int]:
    """Return the current length of each Redis stream (pending message count)."""
    client = Redis.from_url(settings.redis_url, decode_responses=True)  # type: ignore[call-arg]
    depths: dict[str, int] = {}
    for stream in _STREAMS:
        try:
            info = client.xlen(stream)  # type: ignore[attr-defined]
            depths[stream] = int(info)
        except Exception:  # noqa: BLE001
            depths[stream] = -1
    return depths


# ── DB metrics ────────────────────────────────────────────────────────────

def source_freshness() -> dict[str, dict[str, Any]]:
    """Return last-run info for each source connector."""
    pool = get_pool()
    result: dict[str, dict[str, Any]] = {}
    cutoff = datetime.now(tz=timezone.utc) - timedelta(hours=24)

    with pool.connection() as conn:
        for source in _SOURCES:
            row = conn.execute(
                """
                SELECT started_at, finished_at, processed_count, failed_count, status
                FROM agent_runs
                WHERE agent_name = 'discovery' AND source = %s
                ORDER BY started_at DESC
                LIMIT 1
                """,
                (source,),
            ).fetchone()

            if row is None:
                result[source] = {"status": "never_run", "last_run": None}
                continue

            started_at, finished_at, processed, failed, status = row
            age_seconds: float | None = None
            if started_at:
                aware_started = (
                    started_at.replace(tzinfo=timezone.utc)
                    if started_at.tzinfo is None
                    else started_at
                )
                age_seconds = (datetime.now(tz=timezone.utc) - aware_started).total_seconds()

            result[source] = {
                "status": status,
                "last_run": str(started_at) if started_at else None,
                "age_seconds": age_seconds,
                "processed_count": processed,
                "failed_count": failed,
                "is_fresh": age_seconds is not None and age_seconds < 3600,
            }

    return result


def ingestion_summary() -> dict[str, Any]:
    """Return 24-hour ingestion volume from agent_runs."""
    pool = get_pool()
    with pool.connection() as conn:
        row = conn.execute(
            """
            SELECT
                COUNT(*) AS run_count,
                COALESCE(SUM(processed_count), 0) AS total_processed,
                COALESCE(SUM(failed_count), 0) AS total_failed
            FROM agent_runs
            WHERE started_at >= now() - interval '24 hours'
              AND agent_name = 'discovery'
            """
        ).fetchone()

        canonical_count = conn.execute(
            "SELECT COUNT(*) FROM jobs_canonical WHERE status = 'active'"
        ).fetchone()

        raw_count = conn.execute(
            "SELECT COUNT(*) FROM jobs_raw WHERE fetched_at >= now() - interval '24 hours'"
        ).fetchone()

    run_count, processed, failed = row or (0, 0, 0)  # type: ignore[misc]
    return {
        "last_24h_runs": int(run_count),
        "last_24h_raw_jobs_fetched": int(raw_count[0]) if raw_count else 0,  # type: ignore[index]
        "last_24h_processed": int(processed),
        "last_24h_failed": int(failed),
        "total_active_canonical_jobs": int(canonical_count[0]) if canonical_count else 0,  # type: ignore[index]
    }


def report() -> dict[str, Any]:
    """Build a complete health report dict."""
    try:
        depths = queue_depths()
    except Exception as exc:  # noqa: BLE001
        depths = {"error": str(exc)}

    try:
        freshness = source_freshness()
    except Exception as exc:  # noqa: BLE001
        freshness = {"error": str(exc)}

    try:
        summary = ingestion_summary()
    except Exception as exc:  # noqa: BLE001
        summary = {"error": str(exc)}

    overall = "ok"
    if isinstance(freshness, dict) and "error" not in freshness:
        stale_sources = [
            src for src, info in freshness.items()
            if isinstance(info, dict) and not info.get("is_fresh") and info.get("last_run")
        ]
        if stale_sources:
            overall = "degraded"

    return {
        "status": overall,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "queue_depths": depths,
        "source_freshness": freshness,
        "ingestion_summary": summary,
    }


def log_health_loop(stop_event: threading.Event, interval_seconds: float = 300.0) -> None:
    """Emit a structured health log on a regular interval."""
    logger.info("health.loop.started", interval_seconds=interval_seconds)
    while not stop_event.is_set():
        try:
            health = report()
            log_level = "warning" if health["status"] == "degraded" else "info"
            getattr(logger, log_level)("health.report", **health)
        except Exception as exc:  # noqa: BLE001
            logger.error("health.report_error", error=str(exc))

        # Sleep interruptibly
        deadline = time.monotonic() + interval_seconds
        while time.monotonic() < deadline and not stop_event.is_set():
            time.sleep(1.0)

    logger.info("health.loop.stopped")
