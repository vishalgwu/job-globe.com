"""Verification worker.

Consumes events from the discovery stream, verifies apply URL liveness,
persists the raw job to jobs_raw, and re-publishes a verified event to
the verification stream for downstream workers (company identity, geo, etc.)

Stream contract:
    Input:  job-globe.discovery     (published by discovery runner)
    Output: job-globe.verification  (consumed by company_identity, geo, taxonomy, dedupe)

For each event the worker:
  1. Deserialises the raw job payload.
  2. HTTP-checks the apply_url.
  3. Persists the job to jobs_raw (even if dead — we track it for analysis).
  4. If live:  stamps verified_live_at and re-publishes to verification stream.
  5. If dead:  logs and does NOT forward downstream (user never sees it).
"""

from __future__ import annotations

import json
import threading
from typing import Any

import structlog

from job_globe_workers.agents.verification.url_checker import check_url
from job_globe_workers.db.connection import get_pool
from job_globe_workers.db.repositories.agent_runs import finish_agent_run, start_agent_run
from job_globe_workers.db.repositories.jobs import mark_raw_job_verified, upsert_raw_job
from job_globe_workers.event_bus.consumer import read_events
from job_globe_workers.event_bus.producer import publish_event
from job_globe_workers.settings import settings

logger = structlog.get_logger(__name__)


def _deserialise_event(payload: dict[str, str]) -> dict[str, Any]:
    """Reconstruct nested structures from the flattened Redis Streams payload."""
    result: dict[str, Any] = {}
    for key, value in payload.items():
        if not value:
            result[key] = None
            continue
        # Try JSON parse for known nested fields
        if key in ("metadata", "required_skills") and value.startswith(("{", "[")):
            try:
                result[key] = json.loads(value)
                continue
            except json.JSONDecodeError:
                pass
        result[key] = value
    return result


def _process_event(event: dict[str, Any], pool: Any) -> bool:
    """Process one raw job event.

    Returns True if the job was verified live and forwarded downstream.
    """
    source = event.get("source", "unknown")
    source_job_id = event.get("source_job_id", "")
    source_url = event.get("source_url", "")
    apply_url = event.get("apply_url", "")
    title = event.get("title", "")

    if not apply_url:
        logger.warning("verification.no_apply_url", source=source, source_job_id=source_job_id)
        return False

    # Build the full payload for jobs_raw storage
    payload: dict[str, Any] = {k: v for k, v in event.items() if k != "source"}

    # Verify URL liveness
    check = check_url(apply_url)

    with pool.connection() as conn:
        raw_id = upsert_raw_job(
            conn,
            source=source,
            source_job_id=source_job_id,
            source_url=source_url,
            payload={**payload, "verification": {
                "is_live": check.is_live,
                "status_code": check.status_code,
                "trust_score": check.trust_score,
                "final_url": check.final_url,
            }},
        )
        if check.is_live:
            mark_raw_job_verified(conn, raw_id)
        conn.commit()

    if not check.is_live:
        logger.info(
            "verification.dead_url",
            source=source,
            title=title,
            apply_url=apply_url,
            status_code=check.status_code,
        )
        return False

    # Forward to verification stream for downstream workers
    downstream: dict[str, str] = {
        k: (str(v) if not isinstance(v, (dict, list)) else json.dumps(v))
        for k, v in event.items()
        if v is not None
    }
    downstream["raw_job_id"] = str(raw_id)
    downstream["trust_score"] = str(check.trust_score)
    downstream["verified_apply_url"] = check.final_url

    publish_event(settings.verification_stream, downstream)
    logger.debug(
        "verification.forwarded",
        source=source,
        title=title,
        trust_score=check.trust_score,
    )
    return True


def run_verification_loop(stop_event: threading.Event) -> None:
    """Consume the discovery stream and verify jobs until stop_event is set."""
    pool = get_pool()
    last_id = "0-0"
    processed = 0
    failed = 0
    logger.info("verification.loop.started")

    with pool.connection() as conn:
        run_id = start_agent_run(conn, agent_name="verification")
        conn.commit()

    try:
        while not stop_event.is_set():
            for msg_id, payload in read_events(settings.discovery_stream, last_id):
                if stop_event.is_set():
                    break
                try:
                    event = _deserialise_event(payload)
                    forwarded = _process_event(event, pool)
                    if forwarded:
                        processed += 1
                    last_id = msg_id
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    logger.error(
                        "verification.event_error",
                        msg_id=msg_id,
                        error=str(exc),
                    )
    finally:
        with pool.connection() as conn:
            finish_agent_run(
                conn,
                run_id=run_id,
                processed_count=processed,
                failed_count=failed,
            )
            conn.commit()
        logger.info("verification.loop.stopped", processed=processed, failed=failed)
