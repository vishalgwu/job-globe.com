from __future__ import annotations

import time

from job_globe_workers.settings import settings


def run_placeholder_worker() -> None:
    print(
        "job-globe worker placeholder started "
        f"redis_url={settings.redis_url} discovery_stream={settings.discovery_stream}",
        flush=True,
    )
    while True:
        time.sleep(60)


if __name__ == "__main__":
    run_placeholder_worker()
