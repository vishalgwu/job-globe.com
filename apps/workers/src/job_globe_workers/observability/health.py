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

import json
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

import structlog

from job_globe_workers.db.connection import get_pool
from job_globe_workers.settings import settings
from job_globe_workers.utils import redis_client

logger = structlog.get_logger(__name__)

_THREAD_LOCK = threading.Lock()
_THREAD_STATES: dict[str, dict[str, Any]] = {}

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

def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()  # noqa: UP017


def mark_thread_started(name: str) -> None:
    """Record that a worker thread has started."""
    now = _now_iso()
    with _THREAD_LOCK:
        state = _THREAD_STATES.setdefault(name, {})
        state.update(
            {
                "name": name,
                "status": "running",
                "started_at": state.get("started_at") or now,
                "last_heartbeat_at": now,
                "stopped_at": None,
                "last_error": None,
            }
        )


def mark_thread_processed(name: str) -> None:
    """Record that a worker thread processed useful pipeline work."""
    now = _now_iso()
    with _THREAD_LOCK:
        state = _THREAD_STATES.setdefault(name, {"name": name, "started_at": now})
        state.update(
            {
                "status": "running",
                "last_heartbeat_at": now,
                "last_processed_at": now,
                "processed_events": int(state.get("processed_events", 0)) + 1,
            }
        )


def mark_thread_stopped(name: str, error: str | None = None) -> None:
    """Record that a worker thread has exited."""
    now = _now_iso()
    with _THREAD_LOCK:
        state = _THREAD_STATES.setdefault(name, {"name": name, "started_at": now})
        state.update(
            {
                "status": "crashed" if error else "stopped",
                "last_heartbeat_at": now,
                "stopped_at": now,
                "last_error": error,
            }
        )


def thread_statuses() -> dict[str, Any]:
    """Return in-memory thread status and last-processed timestamps."""
    live_threads = {thread.name: thread.is_alive() for thread in threading.enumerate()}
    with _THREAD_LOCK:
        states = {name: dict(state) for name, state in _THREAD_STATES.items()}

    for name, state in states.items():
        state["is_alive"] = bool(live_threads.get(name, False))
        if state["is_alive"] and state.get("status") == "stopped":
            state["status"] = "running"

    for name, is_alive in live_threads.items():
        if name != "MainThread" and name not in states:
            states[name] = {
                "name": name,
                "status": "running" if is_alive else "unknown",
                "is_alive": is_alive,
                "started_at": None,
                "last_heartbeat_at": None,
                "last_processed_at": None,
                "processed_events": 0,
                "stopped_at": None,
                "last_error": None,
            }

    return dict(sorted(states.items()))


def lightweight_report() -> dict[str, Any]:
    """Return a fast health report for HTTP checks without DB or Redis calls."""
    threads = thread_statuses()
    dead_threads = [
        name
        for name, state in threads.items()
        if name != "health_http" and not state.get("is_alive", False)
    ]
    return {
        "status": "degraded" if dead_threads else "ok",
        "timestamp": _now_iso(),
        "threads": threads,
        "dead_threads": dead_threads,
    }


def queue_depths() -> dict[str, Any]:
    """Return the current length of each Redis stream (pending message count)."""
    client = redis_client()
    depths: dict[str, int] = {}
    for stream in _STREAMS:
        try:
            info = client.xlen(stream)  # type: ignore[attr-defined]
            depths[stream] = int(info)  # type: ignore[arg-type]
        except Exception:  # noqa: BLE001
            depths[stream] = -1
    return depths


# ── DB metrics ────────────────────────────────────────────────────────────

def source_freshness() -> dict[str, Any]:
    """Return last-run info for each source connector."""
    pool = get_pool()
    result: dict[str, dict[str, Any]] = {}
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
                    started_at.replace(tzinfo=timezone.utc)  # noqa: UP017
                    if started_at.tzinfo is None
                    else started_at
                )
                age_seconds = (datetime.now(tz=timezone.utc) - aware_started).total_seconds()  # noqa: UP017

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
        "timestamp": _now_iso(),
        "threads": thread_statuses(),
        "queue_depths": depths,
        "source_freshness": freshness,
        "ingestion_summary": summary,
    }


class _HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        if urlparse(self.path).path != "/health":
            self.send_error(404)
            return

        body = json.dumps(lightweight_report()).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, _format: str, *args: Any) -> None:
        return


def run_health_http_loop(stop_event: threading.Event) -> None:
    """Serve GET /health until the worker plane shuts down."""
    server = ThreadingHTTPServer(
        (settings.worker_health_host, settings.worker_health_port),
        _HealthHandler,
    )
    server.timeout = 1.0
    logger.info(
        "health.http.started",
        host=settings.worker_health_host,
        port=settings.worker_health_port,
    )
    try:
        while not stop_event.is_set():
            server.handle_request()
    finally:
        server.server_close()
        logger.info("health.http.stopped")


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
