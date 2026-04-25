from collections.abc import Iterator
from typing import Any, cast

from redis import Redis

from job_globe_workers.settings import settings


def read_events(stream: str, last_id: str = "0-0") -> Iterator[tuple[str, dict[str, str]]]:
    client = cast(Any, Redis.from_url(settings.redis_url, decode_responses=True))
    for _, messages in client.xread({stream: last_id}, count=10, block=1000):
        for message_id, payload in messages:
            yield str(message_id), {str(key): str(value) for key, value in payload.items()}
