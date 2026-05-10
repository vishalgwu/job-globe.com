"""Tracing configuration placeholder.

Phase 5 will wire OpenTelemetry here.  For now we configure structlog
with JSON output which is compatible with most log-aggregation platforms.
"""

import logging

import structlog


def configure_tracing(service_name: str = "job-globe-workers") -> str:
    """Configure structlog for JSON structured output."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
    )
    return service_name
