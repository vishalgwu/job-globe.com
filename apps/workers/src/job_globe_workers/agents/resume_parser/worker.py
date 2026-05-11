"""Resume parser worker.

Polls resume_extractions for rows where parsed_text IS NULL and
raw_object_key IS NOT NULL.  Downloads the raw file from Supabase Storage,
extracts text, calls the OpenAI structured-profile extractor, and persists
the results back to the same row.
"""

from __future__ import annotations

import json
import os
import tempfile
import threading
import time
from pathlib import Path
from typing import Any

import httpx
import structlog

from job_globe_workers.db.connection import get_pool
from job_globe_workers.parsers.resume_extractor import (
    extract_resume_text,
    extract_structured_profile,
)
from job_globe_workers.settings import settings

logger = structlog.get_logger(__name__)

_PARSER_VERSION = "1.0.0"

# ---------------------------------------------------------------------------
# Supabase Storage download
# ---------------------------------------------------------------------------


def _supabase_url() -> str:
    return os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")


def _supabase_service_key() -> str:
    return os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _download_object(object_key: str) -> bytes:
    """Download a file from Supabase Storage and return its raw bytes.

    The object_key is expected to be in the form  <bucket>/<path>.
    Falls back to treating the whole string as a path under 'resumes'.
    """
    base_url = _supabase_url().rstrip("/")
    service_key = _supabase_service_key()

    if "/" in object_key:
        bucket, _, path = object_key.partition("/")
    else:
        bucket = "resumes"
        path = object_key

    url = f"{base_url}/storage/v1/object/{bucket}/{path}"
    headers: dict[str, str] = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.get(url, headers=headers)
        response.raise_for_status()
        return response.content


# ---------------------------------------------------------------------------
# Row processing
# ---------------------------------------------------------------------------


def _extension_from_key(object_key: str) -> str:
    """Derive the file extension from the Supabase object key."""
    # e.g. "resumes/user-123/resume_abc.pdf" -> ".pdf"
    parts = object_key.split("/")
    filename = parts[-1]
    dot_idx = filename.rfind(".")
    if dot_idx == -1:
        return ".pdf"  # sensible default
    return filename[dot_idx:].lower()


def _process_row(row: dict[str, Any]) -> None:
    """Download, parse, and update a single resume_extractions row."""
    row_id: str = str(row["id"])
    user_id: str = str(row["user_id"])
    object_key: str = row["raw_object_key"]

    log = logger.bind(row_id=row_id, user_id=user_id, object_key=object_key)
    log.info("resume_parser.processing")

    # Download file
    try:
        file_bytes = _download_object(object_key)
    except Exception as exc:  # noqa: BLE001
        log.error("resume_parser.download_failed", error=str(exc))
        return

    extension = _extension_from_key(object_key)

    # Write to a temp file for the extractor
    with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = Path(tmp.name)

    try:
        parsed_text = extract_resume_text(tmp_path)
    except Exception as exc:  # noqa: BLE001
        log.error("resume_parser.text_extraction_failed", error=str(exc))
        tmp_path.unlink(missing_ok=True)
        return
    finally:
        tmp_path.unlink(missing_ok=True)

    if not parsed_text.strip():
        log.warning("resume_parser.empty_text")
        return

    # Structured extraction via OpenAI
    try:
        profile = extract_structured_profile(
            parsed_text,
            openai_api_key=settings.openai_api_key,
            model=settings.quick_prep_model,
        )
    except Exception as exc:  # noqa: BLE001
        log.error("resume_parser.structured_extraction_failed", error=str(exc))
        # Still persist the raw text even if structured extraction failed
        profile = None

    confidence: dict[str, Any] = profile.pop("confidence", {}) if profile else {}

    pool = get_pool()
    with pool.connection() as conn:
        if profile is not None:
            conn.execute(
                """
                UPDATE resume_extractions
                SET
                    parsed_text = %s,
                    parsed_profile = %s::jsonb,
                    confidence = %s::jsonb,
                    parser_version = %s
                WHERE id = %s
                """,
                (
                    parsed_text,
                    json.dumps(profile),
                    json.dumps(confidence),
                    _PARSER_VERSION,
                    row_id,
                ),
            )
        else:
            conn.execute(
                """
                UPDATE resume_extractions
                SET parsed_text = %s, parser_version = %s
                WHERE id = %s
                """,
                (parsed_text, _PARSER_VERSION, row_id),
            )
        conn.commit()

    log.info(
        "resume_parser.complete",
        text_chars=len(parsed_text),
        skills_count=len((profile or {}).get("skills", [])),
    )


# ---------------------------------------------------------------------------
# Worker loop
# ---------------------------------------------------------------------------


def _fetch_pending_rows(limit: int = 10) -> list[dict[str, Any]]:
    """Return up to `limit` resume_extractions rows pending parsing."""
    pool = get_pool()
    with pool.connection() as conn:
        rows = conn.execute(
            """
            SELECT id, user_id, raw_object_key
            FROM resume_extractions
            WHERE parsed_text IS NULL
              AND raw_object_key IS NOT NULL
            ORDER BY created_at
            LIMIT %s
            """,
            (limit,),
        ).fetchall()
    return [{"id": r[0], "user_id": r[1], "raw_object_key": r[2]} for r in rows]


def run_resume_parser_loop(stop_event: threading.Event) -> None:
    """Poll for unprocessed resumes and parse them until stop_event is set."""
    logger.info("resume_parser.loop.started")

    while not stop_event.is_set():
        try:
            pending = _fetch_pending_rows(limit=10)
        except Exception as exc:  # noqa: BLE001
            logger.error("resume_parser.fetch_failed", error=str(exc))
            stop_event.wait(settings.worker_poll_interval_seconds)
            continue

        if not pending:
            stop_event.wait(settings.worker_poll_interval_seconds)
            continue

        for row in pending:
            if stop_event.is_set():
                break
            try:
                _process_row(row)
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "resume_parser.row_error",
                    row_id=str(row.get("id")),
                    error=str(exc),
                )

        # Brief pause before next poll even if rows were found
        time.sleep(1.0)

    logger.info("resume_parser.loop.stopped")
