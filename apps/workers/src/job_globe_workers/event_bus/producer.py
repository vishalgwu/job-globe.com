from collections.abc import Mapping
from typing import Any, cast

from redis import Redis

from job_globe_workers.settings import settings


def publish_event(stream: str, payload: Mapping[str, str]) -> str:
    client = cast(Any, Redis.from_url(settings.redis_url, decode_responses=True))
    return str(client.xadd(stream, dict(payload)))
