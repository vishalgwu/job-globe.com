"""Worker plane entrypoint.

Starts all pipeline workers as daemon threads and blocks until a
SIGTERM or SIGINT is received, then performs a graceful shutdown.

Thread topology:
  main --> discovery_thread        (fetches from external APIs -> discovery stream)
       --> verification_thread     (discovery stream -> verification stream)
       --> company_id_thread       (verification stream -> companies table + canonical stream)
       --> dedupe_thread           (canonical stream -> jobs_canonical + taxonomy)
       --> resume_parser_thread    (resume_extractions -> parsed_profile)
       --> job_embedder_thread     (jobs_canonical -> job_embeddings)
       --> profile_embedder_thread (profiles -> profile_embeddings)
       --> alert_evaluator_thread  (alerts -> alert_deliveries + notifications)
       --> audit_cleanup_thread    (audit_events retention + purge)
       --> health_thread           (periodic health log)

All threads share a threading.Event (stop_event) that is set on shutdown.
Each thread's loop polls stop_event and exits cleanly.
"""

from __future__ import annotations

import signal
import sys
import threading

import structlog

from job_globe_workers.agents.alert_evaluator.evaluator import run_alert_evaluator_loop
from job_globe_workers.agents.audit_cleanup.worker import run_audit_cleanup_loop
from job_globe_workers.agents.company_identity.worker import run_company_identity_loop
from job_globe_workers.agents.discovery.runner import run_discovery_loop
from job_globe_workers.agents.duplicate_detection.detector import run_duplicate_detection_loop
from job_globe_workers.agents.embeddings.job_embedder import run_job_embedder_loop
from job_globe_workers.agents.embeddings.profile_embedder import run_profile_embedder_loop
from job_globe_workers.agents.resume_parser.worker import run_resume_parser_loop
from job_globe_workers.agents.verification.worker import run_verification_loop
from job_globe_workers.db.connection import close_pool, get_pool
from job_globe_workers.observability.health import log_health_loop
from job_globe_workers.observability.tracing import configure_tracing
from job_globe_workers.settings import settings

logger = structlog.get_logger(__name__)


def _start_thread(
    name: str,
    target: object,
    stop_event: threading.Event,
) -> threading.Thread:
    thread = threading.Thread(
        target=target,  # type: ignore[arg-type]
        args=(stop_event,),
        name=name,
        daemon=True,
    )
    thread.start()
    logger.info("thread.started", name=name)
    return thread


def main() -> None:
    """Main entry point -- boot all workers, wait for signal."""
    configure_tracing("job-globe-workers")

    logger.info(
        "workers.starting",
        redis_url=settings.redis_url,
        discovery_stream=settings.discovery_stream,
        verification_stream=settings.verification_stream,
        canonical_stream=settings.canonical_stream,
    )

    # Warm up the DB pool before threads start to avoid a race on first use
    try:
        pool = get_pool()
        with pool.connection() as conn:
            conn.execute("SELECT 1")
        logger.info("workers.db_pool_ready")
    except Exception as exc:  # noqa: BLE001
        logger.error("workers.db_pool_failed", error=str(exc))
        sys.exit(1)

    stop_event = threading.Event()

    threads: list[threading.Thread] = [
        # Existing pipeline workers
        _start_thread("discovery", run_discovery_loop, stop_event),
        _start_thread("verification", run_verification_loop, stop_event),
        _start_thread("company_identity", run_company_identity_loop, stop_event),
        _start_thread("duplicate_detection", run_duplicate_detection_loop, stop_event),
        # New workers
        _start_thread("resume_parser", run_resume_parser_loop, stop_event),
        _start_thread("job_embedder", run_job_embedder_loop, stop_event),
        _start_thread("profile_embedder", run_profile_embedder_loop, stop_event),
        _start_thread("alert_evaluator", run_alert_evaluator_loop, stop_event),
        _start_thread("audit_cleanup", run_audit_cleanup_loop, stop_event),
        # Observability
        _start_thread("health", log_health_loop, stop_event),
    ]

    def _shutdown(signum: int, frame: object) -> None:  # type: ignore[type-arg]
        logger.info("workers.shutdown_requested", signal=signum)
        stop_event.set()

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)

    logger.info("workers.running", thread_count=len(threads))

    # Block main thread until stop_event is set
    stop_event.wait()

    logger.info("workers.stopping", timeout_seconds=30)
    for thread in threads:
        thread.join(timeout=30)
        if thread.is_alive():
            logger.warning("thread.did_not_stop", name=thread.name)

    close_pool()
    logger.info("workers.stopped")


if __name__ == "__main__":
    main()
