"""Tracing configuration and no-op-safe span helpers."""

from __future__ import annotations

import logging
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

try:
    from opentelemetry import trace as otel_trace
except ImportError:  # pragma: no cover - optional dependency hook
    otel_trace = None  # type: ignore[assignment]


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


@contextmanager
def trace_span(name: str, **attributes: Any) -> Iterator[None]:
    """Start an OpenTelemetry span when the API is installed, otherwise no-op."""
    if otel_trace is None:
        logger.debug("trace.span.stub", span=name, **attributes)
        yield
        return

    tracer = otel_trace.get_tracer("job-globe-workers")
    with tracer.start_as_current_span(name) as span:
        for key, value in attributes.items():
            if value is not None:
                span.set_attribute(key, value)
        try:
            yield
        except Exception as exc:
            span.record_exception(exc)
            raise
