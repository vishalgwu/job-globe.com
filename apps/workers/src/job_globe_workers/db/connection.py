"""PostgreSQL connection pool for the worker plane.

Uses psycopg3 (psycopg[binary]) with a thread-safe connection pool.
Each module that needs DB access calls get_pool() — the pool is created
once and reused across threads.

Usage:
    from job_globe_workers.db.connection import get_pool

    with get_pool().connection() as conn:
        conn.execute("SELECT 1")
"""

from __future__ import annotations

import threading

import structlog
from psycopg_pool import ConnectionPool

from job_globe_workers.settings import settings

logger = structlog.get_logger(__name__)

_pool: ConnectionPool | None = None
_lock = threading.Lock()


def get_pool() -> ConnectionPool:
    """Return the process-wide psycopg3 connection pool, creating it on first call."""
    global _pool  # noqa: PLW0603

    if _pool is not None:
        return _pool

    with _lock:
        # Double-checked locking — another thread may have created it
        if _pool is not None:
            return _pool

        logger.info(
            "db.pool.creating",
            min_size=settings.db_pool_min_size,
            max_size=settings.db_pool_max_size,
        )
        _pool = ConnectionPool(
            conninfo=settings.database_url,
            min_size=settings.db_pool_min_size,
            max_size=settings.db_pool_max_size,
            open=True,
        )
        logger.info("db.pool.ready")
        return _pool


def close_pool() -> None:
    """Gracefully close the pool.  Call from shutdown handlers."""
    global _pool  # noqa: PLW0603

    with _lock:
        if _pool is not None:
            _pool.close()
            _pool = None
            logger.info("db.pool.closed")
