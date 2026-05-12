"""Shared worker utilities."""

from __future__ import annotations

import json
from collections.abc import Iterable, Mapping
from typing import Any, cast

from redis import Redis

from job_globe_workers.settings import settings

_JSON_STREAM_FIELDS = frozenset({"metadata", "required_skills"})


def redis_client() -> Any:
    """Return a Redis client configured for worker stream payloads."""
    return cast(Any, Redis.from_url(settings.redis_url, decode_responses=True))


def deserialise_stream_payload(
    payload: Mapping[str, str],
    json_fields: Iterable[str] = _JSON_STREAM_FIELDS,
) -> dict[str, Any]:
    """Rehydrate nested values from a flattened Redis Streams payload."""
    nested_fields = set(json_fields)
    result: dict[str, Any] = {}
    for key, value in payload.items():
        if not value:
            result[key] = None
            continue
        if key in nested_fields and value.startswith(("{", "[")):
            try:
                result[key] = json.loads(value)
                continue
            except json.JSONDecodeError:
                pass
        result[key] = value
    return result


def serialise_stream_payload(event: Mapping[str, Any]) -> dict[str, str]:
    """Flatten a pipeline event into Redis Streams string fields."""
    return {
        key: json.dumps(value) if isinstance(value, (dict, list)) else str(value)
        for key, value in event.items()
        if value is not None
    }
