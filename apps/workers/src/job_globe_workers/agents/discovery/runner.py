"""Discovery runner — orchestrates all connectors on their freshness schedule.

Responsibilities:
  1. Load every configured connector.
  2. Check whether the connector's freshness interval has elapsed since its
     last successful run (via agent_runs table).
  3. For each due connector, call fetch_with_retry() and publish each raw
     job dict as a RawJobEvent to the discovery Redis stream.
  4. Record agent_run rows for observability.

Thread safety: this module runs in a single thread.  It blocks between
connector batches as needed so callers can run it in a daemon thread.
"""

from __future__ import annotations

import json
import threading
import time
from datetime import datetime, timezone
from typing import Any

import structlog

from job_globe_workers.agents.discovery.connectors.adzuna import AdzunaConnector
from job_globe_workers.agents.discovery.connectors.base import AbstractConnector
from job_globe_workers.agents.discovery.connectors.eures import EuresConnector
from job_globe_workers.agents.discovery.connectors.greenhouse import GreenhouseConnector
from job_globe_workers.agents.discovery.connectors.lever import LeverConnector
from job_globe_workers.agents.discovery.connectors.smartrecruiters import SmartRecruitersConnector
from job_globe_workers.agents.discovery.connectors.usajobs import UsaJobsConnector
from job_globe_workers.agents.discovery.connectors.workable import WorkableConnector
from job_globe_workers.agents.discovery.scheduler import (
    DEFAULT_FRESHNESS_RULES,
    SourceFreshnessRule,
)
from job_globe_workers.db.connection import get_pool
from job_globe_workers.db.repositories.agent_runs import (
    finish_agent_run,
    get_last_run_time,
    start_agent_run,
)
from job_globe_workers.db.repositories.audit import record_worker_failure
from job_globe_workers.event_bus.producer import publish_event
from job_globe_workers.settings import settings

logger = structlog.get_logger(__name__)

# Maps source name → connector class
_CONNECTOR_REGISTRY: dict[str, type[AbstractConnector]] = {
    "greenhouse": GreenhouseConnector,
    "lever": LeverConnector,
    "adzuna": AdzunaConnector,
    "usajobs": UsaJobsConnector,
    "eures": EuresConnector,
    "workable": WorkableConnector,
    "smartrecruiters": SmartRecruitersConnector,
}

_FRESHNESS_MAP: dict[str, SourceFreshnessRule] = {
    r.source: r for r in DEFAULT_FRESHNESS_RULES
}


def _is_due(last_run: datetime | None, rule: SourceFreshnessRule) -> bool:
    """Return True when the connector has not run recently enough."""
    if last_run is None:
        return True
    now = datetime.now(tz=timezone.utc)  # noqa: UP017
    # Ensure last_run is timezone-aware for comparison
    if last_run.tzinfo is None:
        last_run = last_run.replace(tzinfo=timezone.utc)  # noqa: UP017
    return (now - last_run) >= rule.interval


def _build_event_payload(source: str, job: dict[str, Any]) -> dict[str, str]:
    """Flatten a raw job dict into a Redis Streams-compatible str→str mapping."""
    # Redis Streams values must all be strings.
    # We serialise nested dicts/lists as JSON strings.
    payload: dict[str, str] = {"source": source}
    for key, value in job.items():
        if isinstance(value, (dict, list)):
            payload[key] = json.dumps(value)
        elif value is None:
            payload[key] = ""
        else:
            payload[key] = str(value)
    return payload


def run_discovery_once(stop_event: threading.Event | None = None) -> None:
    """Run one full pass of all due connectors.

    Iterates the connector registry, checks freshness, fetches, and
    publishes to the discovery stream.  Designed to be called from
    run_discovery_loop().
    """
    pool = get_pool()

    for source_name, ConnectorClass in _CONNECTOR_REGISTRY.items():
        if stop_event and stop_event.is_set():
            logger.info("discovery.runner.stopping")
            return

        connector = ConnectorClass()

        if not connector.is_configured():
            logger.debug(
                "discovery.connector.skipped",
                source=source_name,
                reason="not_configured",
            )
            continue

        rule = _FRESHNESS_MAP.get(source_name)
        if rule is None:
            logger.warning("discovery.no_freshness_rule", source=source_name)
            continue

        with pool.connection() as conn:
            last_run = get_last_run_time(conn, agent_name="discovery", source=source_name)

        if not _is_due(last_run, rule):
            logger.debug(
                "discovery.connector.not_due",
                source=source_name,
                last_run=str(last_run),
                interval=str(rule.interval),
            )
            continue

        logger.info("discovery.connector.starting", source=source_name)

        with pool.connection() as conn:
            run_id = start_agent_run(conn, agent_name="discovery", source=source_name)
            conn.commit()

        processed = 0
        failed = 0
        error_msg: str | None = None

        try:
            for raw_job in connector.fetch_with_retry():
                if stop_event and stop_event.is_set():
                    break
                try:
                    event = _build_event_payload(source_name, raw_job)
                    publish_event(settings.discovery_stream, event)
                    processed += 1
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    logger.warning(
                        "discovery.publish_failed",
                        source=source_name,
                        error=str(exc),
                    )
                    record_worker_failure(
                        pool,
                        agent_name="discovery",
                        error=exc,
                        metadata={
                            "failurePoint": "publish",
                            "source": source_name,
                        },
                    )
        except Exception as exc:  # noqa: BLE001
            error_msg = str(exc)
            logger.error(
                "discovery.connector.failed",
                source=source_name,
                error=error_msg,
            )
            record_worker_failure(
                pool,
                agent_name="discovery",
                error=exc,
                metadata={
                    "failurePoint": "connector",
                    "source": source_name,
                },
            )

        with pool.connection() as conn:
            finish_agent_run(
                conn,
                run_id=run_id,
                processed_count=processed,
                failed_count=failed,
                error_message=error_msg,
                metadata={"stream": settings.discovery_stream},
            )
            conn.commit()

        logger.info(
            "discovery.connector.done",
            source=source_name,
            processed=processed,
            failed=failed,
        )


def run_discovery_loop(stop_event: threading.Event) -> None:
    """Run discovery passes continuously until stop_event is set.

    This is the long-lived entry point called from main.py.
    Between passes it sleeps for worker_poll_interval_seconds so it
    doesn't spin-loop when all connectors are within their freshness window.
    """
    logger.info("discovery.loop.started")
    while not stop_event.is_set():
        try:
            run_discovery_once(stop_event)
        except Exception as exc:  # noqa: BLE001
            logger.error("discovery.loop.unhandled_error", error=str(exc))
            try:
                pool = get_pool()
            except Exception:  # noqa: BLE001
                pool = None
            if pool is not None:
                record_worker_failure(
                    pool,
                    agent_name="discovery",
                    error=exc,
                    metadata={"failurePoint": "loop"},
                )
        # Sleep in small increments so we react to stop_event quickly
        _interruptible_sleep(settings.worker_poll_interval_seconds * 12, stop_event)
    logger.info("discovery.loop.stopped")


def _interruptible_sleep(seconds: float, stop_event: threading.Event) -> None:
    """Sleep for *seconds* but wake immediately if stop_event is set."""
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline and not stop_event.is_set():
        time.sleep(min(1.0, deadline - time.monotonic()))
