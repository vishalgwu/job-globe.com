"""Redis Streams consumer utilities.

Provides both a simple legacy reader (read_events) for backward compatibility
and a full consumer group implementation for reliable at-least-once delivery.

Consumer group contract:
- Messages are claimed via XREADGROUP and acknowledged with XACK on success.
- Stale/unacknowledged messages are reclaimed via XAUTOCLAIM.
- Messages that exceed redis_max_retries are published to the DLQ stream.
"""

from __future__ import annotations

import time
from collections.abc import Iterator
from typing import Any, cast

import structlog
from redis import Redis
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import ResponseError

from job_globe_workers.settings import settings

logger = structlog.get_logger(__name__)

_REDIS_RETRY_DELAYS = (5, 10, 30, 60)  # seconds between successive retry attempts


def _client() -> Any:
    return cast(Any, Redis.from_url(settings.redis_url, decode_responses=True))


def ensure_consumer_group(stream: str, group: str) -> None:
    """Create the consumer group if it does not already exist.

    Uses XGROUP CREATE with MKSTREAM so the stream is created implicitly.
    Silently ignores the BUSYGROUP error if the group already exists.

    Retries with backoff on connection errors so that a temporarily
    unavailable Redis (e.g. service still starting) does not crash the
    worker thread permanently.
    """
    for attempt, delay in enumerate(_REDIS_RETRY_DELAYS, start=1):
        try:
            r = _client()
            r.xgroup_create(stream, group, id="$", mkstream=True)
            return
        except ResponseError as exc:
            if "BUSYGROUP" in str(exc):
                return
            raise
        except (RedisConnectionError, OSError) as exc:
            logger.warning(
                "redis.connection_failed",
                stream=stream,
                attempt=attempt,
                max_attempts=len(_REDIS_RETRY_DELAYS),
                retry_in_seconds=delay,
                error=str(exc),
                hint=(
                    "Check that REDIS_URL is set in Railway service variables"
                    " and a Redis service is provisioned."
                ),
            )
            if attempt == len(_REDIS_RETRY_DELAYS):
                raise
            time.sleep(delay)


def read_group_events(
    stream: str,
    group: str,
    consumer: str,
    count: int = 10,
    block_ms: int = 1000,
) -> Iterator[tuple[str, dict[str, str]]]:
    """Yield (msg_id, payload) from a consumer group read.

    Calls XREADGROUP GROUP group consumer STREAMS stream >
    Each yielded message must be acknowledged with ack_event() on success.
    """
    r = _client()
    results: Any = r.xreadgroup(
        groupname=group,
        consumername=consumer,
        streams={stream: ">"},
        count=count,
        block=block_ms,
    )
    if not results:
        return
    for _stream_name, messages in results:
        for message_id, payload in messages:
            yield str(message_id), {str(k): str(v) for k, v in payload.items()}


def _get_delivery_count(r: Any, stream: str, group: str, msg_id: str) -> int:
    """Return the delivery count for a message from the PEL."""
    try:
        pending: Any = r.xpending_range(stream, group, msg_id, msg_id, count=1)
        if pending:
            return int(pending[0].get("times_delivered", 1))
    except Exception:  # noqa: BLE001
        pass
    return 1


def read_pending_events(
    stream: str,
    group: str,
    consumer: str,
    min_idle_ms: int = 60_000,
) -> Iterator[tuple[str, dict[str, str], int]]:
    """Reclaim stale pending messages and yield (msg_id, payload, delivery_count).

    Uses XAUTOCLAIM to atomically transfer ownership of messages that have
    been idle for at least min_idle_ms milliseconds.
    """
    r = _client()
    result: Any = r.xautoclaim(
        stream,
        group,
        consumer,
        min_idle_time=min_idle_ms,
        start_id="0-0",
        count=10,
    )
    if not result:
        return
    _next_id, messages, _deleted = result
    if not messages:
        return
    for message_id, payload in messages:
        if payload is None:
            continue
        delivery_count = _get_delivery_count(r, stream, group, str(message_id))
        yield (
            str(message_id),
            {str(k): str(v) for k, v in payload.items()},
            delivery_count,
        )


def ack_event(stream: str, group: str, msg_id: str) -> None:
    """Acknowledge a successfully processed message (XACK)."""
    r = _client()
    r.xack(stream, group, msg_id)


def publish_to_dlq(
    stream: str,
    msg_id: str,
    payload: dict[str, str],
    error: str,
) -> None:
    """Publish a failed message to the dead-letter queue stream.

    The DLQ stream name is stream + settings.redis_dlq_stream_suffix.
    """
    from job_globe_workers.event_bus.producer import publish_event

    dlq_stream = stream + settings.redis_dlq_stream_suffix
    dlq_payload: dict[str, str] = {
        **payload,
        "_original_stream": stream,
        "_original_msg_id": msg_id,
        "_error": error,
    }
    publish_event(dlq_stream, dlq_payload)


def read_events(
    stream: str,
    last_id: str = "0-0",
) -> Iterator[tuple[str, dict[str, str]]]:
    """Simple non-group stream reader for backward compatibility.

    Yields (msg_id, payload) using XREAD (no consumer group semantics).
    """
    r = _client()
    results: Any = r.xread({stream: last_id}, count=10, block=1000)
    if not results:
        return
    for _stream_name, messages in results:
        for message_id, payload in messages:
            yield str(message_id), {str(k): str(v) for k, v in payload.items()}
