"""Metric name helpers for structured logging.

Full health metrics are in job_globe_workers.observability.health.
"""


def metric_name(agent: str, event: str) -> str:
    """Return a canonical dot-separated metric name."""
    return f"job_globe.{agent}.{event}"
