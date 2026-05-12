"""Duplicate detection + canonical merge.

Duplicate detection strategy:
  1. Primary:  apply_url exact match — the DB UNIQUE constraint on
               jobs_canonical.apply_url handles this at write time via
               ON CONFLICT DO UPDATE.  No special logic needed.

  2. Secondary: fingerprint = hash(normalised_title + company_name + city)
               If two jobs share a fingerprint but different apply_urls,
               the later one is marked as a duplicate of the earlier one.

Canonical merge:
  After dedup the job is enriched with:
    - company_id (from company identity resolver)
    - location_id (from geo mapper)
    - taxonomy links (from tagger)
    - seniority + remote_type inferred from title/description
    - skills extracted from description

This module is the final stage of the pipeline: it reads from the
canonical stream (written by company_identity worker after enrichment)
and produces the finished jobs_canonical row plus taxonomy links.
"""

from __future__ import annotations

import hashlib
import re
import threading
import uuid
from typing import Any

import structlog

from job_globe_workers.agents.categorisation.tagger import (
    classify,
    infer_remote_type_from_text,
    infer_seniority_from_title,
    write_taxonomy_links,
)
from job_globe_workers.observability.health import mark_thread_processed
from job_globe_workers.observability.tracing import trace_span
from job_globe_workers.utils import deserialise_stream_payload

# DB, geo, event-bus imports are deferred to function bodies so that
# extract_skills() and compute_fingerprint() are importable in tests
# without a live DB or Redis connection.

logger = structlog.get_logger(__name__)

# ── Skill extraction ───────────────────────────────────────────────────────
# A lightweight keyword-based skill extractor.
# A full NLP-based extractor can replace this in Phase 4.

_KNOWN_SKILLS = [
    "python", "javascript", "typescript", "java", "go", "golang", "rust",
    "ruby", "php", "swift", "kotlin", "scala", "c++", "c#", "r",
    "react", "vue", "angular", "next.js", "nextjs", "node.js", "nodejs",
    "django", "fastapi", "flask", "spring", "rails",
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible",
    "spark", "kafka", "airflow", "dbt", "snowflake", "bigquery",
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy",
    "graphql", "rest api", "grpc", "microservices",
    "git", "ci/cd", "github actions", "jenkins",
    "sql", "nosql", "data warehousing",
    "figma", "sketch", "adobe xd",
    "agile", "scrum", "jira",
    "linux", "bash", "shell scripting",
]


def extract_skills(text: str) -> list[str]:
    """Extract well-known skills mentioned in the text.

    Returns a deduplicated, sorted list of skill names (lowercase).
    """
    lower = text.lower()
    found: set[str] = set()
    for skill in _KNOWN_SKILLS:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, lower):
            found.add(skill)
    return sorted(found)


# ── Fingerprinting ─────────────────────────────────────────────────────────

def _normalise_for_fingerprint(text: str) -> str:
    """Aggressively normalise text for fingerprint comparison."""
    text = text.lower()
    # Remove punctuation, extra spaces, common noise words
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\b(the|a|an|and|or|in|at|of|for|to|with|is|be|as)\b", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def compute_fingerprint(*, title: str, company_name: str, city: str) -> str:
    """Compute a short hex fingerprint for dedup comparison."""
    normalized = _normalise_for_fingerprint(
        f"{title} {company_name} {city}"
    )
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


# ── Main pipeline stage ────────────────────────────────────────────────────

def process_canonical_event(
    event: dict[str, Any], taxonomy_index: dict[str, dict[str, uuid.UUID]]
) -> bool:
    title = str(event.get("title", ""))
    apply_url = str(event.get("verified_apply_url") or event.get("apply_url") or "")
    with trace_span("pipeline.canonicalize", title=title, apply_url=apply_url):
        return _process_canonical_event(event, taxonomy_index)


def _process_canonical_event(
    event: dict[str, Any], taxonomy_index: dict[str, dict[str, uuid.UUID]]
) -> bool:
    """Process one enriched event from the canonical stream.

    Upserts jobs_canonical and writes taxonomy links.
    Returns True on success.
    """
    from job_globe_workers.agents.geo_mapping.geocoder import resolve_location
    from job_globe_workers.db.connection import get_pool
    from job_globe_workers.db.repositories.jobs import upsert_canonical_job

    pool = get_pool()

    apply_url = event.get("verified_apply_url") or event.get("apply_url") or ""
    if not apply_url:
        logger.warning("dedupe.no_apply_url", event_keys=list(event.keys()))
        return False

    title = event.get("title", "")
    description = event.get("description", "")
    _company_name = event.get("company_name") or "Unknown"
    location_raw = event.get("location_raw") or ""

    # Try to parse numeric IDs
    raw_job_id: uuid.UUID | None = None
    company_id: uuid.UUID | None = None
    try:
        if event.get("raw_job_id"):
            raw_job_id = uuid.UUID(str(event["raw_job_id"]))
    except ValueError:
        pass
    try:
        if event.get("company_id"):
            company_id = uuid.UUID(str(event["company_id"]))
    except ValueError:
        pass

    # Resolve location
    location_id = resolve_location(location_raw, pool)

    # Infer taxonomy from text
    seniority = infer_seniority_from_title(title)
    remote_type = infer_remote_type_from_text(title, description)

    # Salary parsing
    salary_min: int | None = None
    salary_max: int | None = None
    try:
        if event.get("salary_min"):
            salary_min = int(float(str(event["salary_min"])))
    except (ValueError, TypeError):
        pass
    try:
        if event.get("salary_max"):
            salary_max = int(float(str(event["salary_max"])))
    except (ValueError, TypeError):
        pass

    currency = event.get("currency") or "USD"
    employment_type = event.get("employment_type") or "full-time"

    # Extract skills from description
    skills_from_event: list[str] = []
    raw_skills = event.get("required_skills")
    if isinstance(raw_skills, list):
        skills_from_event = [str(s) for s in raw_skills]
    extracted_skills = extract_skills(description)
    required_skills = sorted(set(skills_from_event) | set(extracted_skills))

    with pool.connection() as conn:
        canonical_id = upsert_canonical_job(
            conn,
            raw_job_id=raw_job_id,
            company_id=company_id,
            location_id=location_id,
            title=title,
            description=description,
            employment_type=employment_type,
            remote_type=remote_type,
            seniority=seniority,
            apply_url=apply_url,
            salary_min=salary_min,
            salary_max=salary_max,
            currency=currency,
            required_skills=required_skills,
        )

        # Taxonomy classification + link writing
        matches = classify(title, description)
        written = write_taxonomy_links(
            conn,
            job_id=canonical_id,
            matches=matches,
            taxonomy_index=taxonomy_index,
        )
        conn.commit()

    logger.info(
        "dedupe.canonical_upserted",
        canonical_id=str(canonical_id),
        title=title,
        seniority=seniority,
        remote_type=remote_type,
        taxonomy_links=written,
        skills=len(required_skills),
    )
    mark_thread_processed("duplicate_detection")
    return True


def run_duplicate_detection_loop(stop_event: threading.Event) -> None:
    """Consume the canonical stream using consumer groups and write jobs_canonical rows."""
    from job_globe_workers.db.connection import get_pool
    from job_globe_workers.db.repositories.agent_runs import finish_agent_run, start_agent_run
    from job_globe_workers.db.repositories.audit import record_worker_failure
    from job_globe_workers.db.repositories.taxonomy import load_taxonomy_synonyms
    from job_globe_workers.event_bus.consumer import (
        ack_event,
        ensure_consumer_group,
        publish_to_dlq,
        read_group_events,
        read_pending_events,
    )
    from job_globe_workers.settings import settings

    pool = get_pool()
    stream = settings.canonical_stream
    group = settings.redis_consumer_group
    consumer = settings.redis_consumer_name
    processed = 0
    failed = 0
    logger.info("dedupe.loop.started", group=group, consumer=consumer)

    ensure_consumer_group(stream, group)

    with pool.connection() as conn:
        run_id = start_agent_run(conn, agent_name="duplicate_detection")
        taxonomy_index = load_taxonomy_synonyms(conn)
        conn.commit()

    logger.info("dedupe.taxonomy_loaded", categories=list(taxonomy_index.keys()))

    def _handle_event(msg_id: str, payload: dict[str, str]) -> bool:
        event = deserialise_stream_payload(payload)
        ok = process_canonical_event(event, taxonomy_index)
        return ok

    try:
        while not stop_event.is_set():
            batch_processed = 0

            # 1. Reclaim stale pending messages
            for msg_id, payload, delivery_count in read_pending_events(
                stream, group, consumer, min_idle_ms=60_000
            ):
                if stop_event.is_set():
                    break
                if delivery_count > settings.redis_max_retries:
                    logger.error("dedupe.dlq", msg_id=msg_id, delivery_count=delivery_count)
                    publish_to_dlq(stream, msg_id, payload, "max_retries_exceeded")
                    ack_event(stream, group, msg_id)
                    failed += 1
                    continue
                try:
                    ok = _handle_event(msg_id, payload)
                    processed += 1 if ok else 0
                    failed += 0 if ok else 1
                    ack_event(stream, group, msg_id)
                    batch_processed += 1
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    logger.error("dedupe.pending_event_error", msg_id=msg_id, error=str(exc))
                    record_worker_failure(
                        pool,
                        agent_name="duplicate_detection",
                        error=exc,
                        metadata={"messageId": msg_id},
                    )

            # 2. Read new messages
            for msg_id, payload in read_group_events(stream, group, consumer):
                if stop_event.is_set():
                    break
                try:
                    ok = _handle_event(msg_id, payload)
                    processed += 1 if ok else 0
                    failed += 0 if ok else 1
                    ack_event(stream, group, msg_id)
                    batch_processed += 1
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    logger.error("dedupe.event_error", msg_id=msg_id, error=str(exc))
                    record_worker_failure(
                        pool,
                        agent_name="duplicate_detection",
                        error=exc,
                        metadata={"messageId": msg_id},
                    )

            if batch_processed == 0:
                stop_event.wait(timeout=settings.worker_poll_interval_seconds)
    finally:
        with pool.connection() as conn:
            finish_agent_run(
                conn,
                run_id=run_id,
                processed_count=processed,
                failed_count=failed,
            )
            conn.commit()
        logger.info("dedupe.loop.stopped", processed=processed, failed=failed)
