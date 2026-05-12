"""Redis Streams event producer.

Provides publish_event for normal stream publishing and publish_to_dlq for
routing failed messages to a dead-letter queue stream.
"""

from __future__ import annotations

from collections.abc import Mapping

from job_globe_workers.settings import settings
from job_globe_workers.utils import redis_client


def publish_event(stream: str, payload: Mapping[str, str]) -> str:
    """Publish a message to *stream* and return the assigned message ID."""
    r = redis_client()
    return str(r.xadd(stream, dict(payload)))


def publish_to_dlq(
    original_stream: str,
    msg_id: str,
    payload: dict[str, str],
    error: str,
    delivery_count: int | None = None,
) -> str:
    """Publish a failed message to the dead-letter queue stream.

    The DLQ stream name is original_stream + settings.redis_dlq_stream_suffix.
    Extra metadata fields are merged into the payload:
      - _original_stream
      - _original_msg_id
      - _error
      - _delivery_count
    """
    dlq_stream = original_stream + settings.redis_dlq_stream_suffix
    dlq_payload: dict[str, str] = {
        **payload,
        "_original_stream": original_stream,
        "_original_msg_id": msg_id,
        "_error": error,
    }
    if delivery_count is not None:
        dlq_payload["_delivery_count"] = str(delivery_count)
    return publish_event(dlq_stream, dlq_payload)
