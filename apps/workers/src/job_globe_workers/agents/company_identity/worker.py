"""Company identity worker — consumes verification stream, resolves companies."""

from __future__ import annotations

import json
import threading
from typing import Any

import structlog

from job_globe_workers.agents.company_identity.resolver import resolve_company
from job_globe_workers.event_bus.consumer import read_events
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


def run_company_identity_loop(stop_event: threading.Event) -> None:
    """Consume verification stream, resolve company identity, forward downstream."""
    last_id = "0-0"
    processed = 0
    logger.info("company_identity.loop.started")

    while not stop_event.is_set():
        for msg_id, payload in read_events(settings.verification_stream, last_id):
            if stop_event.is_set():
                break
            try:
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

                # Forward enriched event
                out: dict[str, str] = {
                    k: (str(v) if not isinstance(v, (dict, list)) else json.dumps(v))
                    for k, v in event.items()
                    if v is not None
                }
                out["company_id"] = str(company_id)
                publish_event(settings.canonical_stream, out)
                processed += 1
                last_id = msg_id
            except Exception as exc:  # noqa: BLE001
                logger.error("company_identity.event_error", error=str(exc))

    logger.info("company_identity.loop.stopped", processed=processed)
