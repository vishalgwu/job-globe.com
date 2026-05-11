"""Company identity worker — consumes verification stream, resolves companies."""

from __future__ import annotations

import json
import threading
from typing import Any

import structlog

from job_globe_workers.agents.company_identity.resolver import resolve_company
from job_globe_workers.db.connection import get_pool
from job_globe_workers.db.repositories.audit import record_worker_failure
from job_globe_workers.event_bus.consumer import (
    ack_event,
    ensure_consumer_group,
    publish_to_dlq,
    read_group_events,
    read_pending_events,
)
from job_globe_workers.event_bus.producer import publish_event
from job_globe_workers.settings import settings

logger = structlog.get_logger(__name__)


def _deserialise(payload: dict[str, str]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in payload.items():
        if not value:
            result[key] = None
        elif key in ("metadata", "required_skills") and value.startswith(("{", "[")):
            try:
                result[key] = json.loads(value)
            except json.JSONDecodeError:
                result[key] = value
        else:
            result[key] = value
    return result


def _process_msg(
    msg_id: str,
    payload: dict[str, str],
    pool: Any,
    stream: str,
    group: str,
) -> bool:
    """Resolve company identity for one event and forward downstream.

    Returns True on success; caller is responsible for ack_event().
    """
    event = _deserialise(payload)
    company_name = event.get("company_name") or "Unknown"
    apply_url = event.get("verified_apply_url") or event.get("apply_url") or ""
    source = event.get("source", "unknown")
    trust = float(event.get("trust_score") or 0)

    company_id = resolve_company(
        company_name=company_name,
        apply_url=apply_url,
        source=source,
        verification_trust=trust,
    )

    out: dict[str, str] = {
        k: (str(v) if not isinstance(v, (dict, list)) else json.dumps(v))
        for k, v in event.items()
        if v is not None
    }
    out["company_id"] = str(company_id)
    publish_event(settings.canonical_stream, out)
    return True


def run_company_identity_loop(stop_event: threading.Event) -> None:
    """Consume verification stream using consumer groups, resolve company identity."""
    pool = get_pool()
    stream = settings.verification_stream
    group = settings.redis_consumer_group
    consumer = settings.redis_consumer_name
    processed = 0
    failed = 0
    logger.info("company_identity.loop.started", group=group, consumer=consumer)

    ensure_consumer_group(stream, group)

    while not stop_event.is_set():
        batch_processed = 0

        # 1. Reclaim stale pending messages first
        for msg_id, payload, delivery_count in read_pending_events(
            stream, group, consumer, min_idle_ms=60_000
        ):
            if stop_event.is_set():
                break
            if delivery_count > settings.redis_max_retries:
                logger.error(
                    "company_identity.dlq", msg_id=msg_id, delivery_count=delivery_count
                )
                publish_to_dlq(stream, msg_id, payload, "max_retries_exceeded")
                ack_event(stream, group, msg_id)
                failed += 1
                continue
            try:
                _process_msg(msg_id, payload, pool, stream, group)
                ack_event(stream, group, msg_id)
                processed += 1
                batch_processed += 1
            except Exception as exc:  # noqa: BLE001
                failed += 1
                logger.error("company_identity.pending_event_error", msg_id=msg_id, error=str(exc))
                record_worker_failure(
                    pool,
                    agent_name="company_identity",
                    error=exc,
                    metadata={"messageId": msg_id},
                )

        # 2. Read new messages
        for msg_id, payload in read_group_events(stream, group, consumer):
            if stop_event.is_set():
                break
            try:
                _process_msg(msg_id, payload, pool, stream, group)
                ack_event(stream, group, msg_id)
                processed += 1
                batch_processed += 1
            except Exception as exc:  # noqa: BLE001
                failed += 1
                logger.error("company_identity.event_error", msg_id=msg_id, error=str(exc))
                record_worker_failure(
                    pool,
                    agent_name="company_identity",
                    error=exc,
                    metadata={"messageId": msg_id},
                )

        if batch_processed == 0:
            stop_event.wait(timeout=settings.worker_poll_interval_seconds)

    logger.info("company_identity.loop.stopped", processed=processed, failed=failed)
