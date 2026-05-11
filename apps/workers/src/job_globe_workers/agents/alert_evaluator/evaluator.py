"""Background alert evaluator.

Every alert_evaluator_interval_seconds:
1. Load all active alerts.
2. For each alert, query jobs_canonical for new jobs since alert.last_evaluated_at
   that match the alert query criteria (category, remote_type, location keywords
   from query JSONB).
3. Score each job against the alert's minimum_match_score using a simple rule check.
4. For matches: insert into alert_deliveries (status='pending'), insert into
   notifications, update alert.last_evaluated_at.
5. Dispatch email for 'email' delivery channel (delegate to email_sender).
"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import UTC, datetime
from typing import Any

import structlog
from psycopg_pool import ConnectionPool

from job_globe_workers.db.connection import get_pool
from job_globe_workers.settings import settings

logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Alert query matching helpers
# ---------------------------------------------------------------------------


def _match_job_to_query(job: dict[str, Any], query: dict[str, Any]) -> float:
    """Score a job against an alert query dict.

    Returns a float 0.0-1.0 representing the match strength.
    Query shape: {category, remote_type, country, city, keywords}
    """
    score = 0.0
    checks = 0

    # Category / employment_type
    category = (query.get("category") or "").lower().strip()
    if category:
        checks += 1
        job_title = (job.get("title") or "").lower()
        job_emp = (job.get("employment_type") or "").lower()
        if category in job_title or category in job_emp:
            score += 1.0

    # Remote type
    remote_type = (query.get("remote_type") or "").lower().strip()
    if remote_type:
        checks += 1
        job_remote = (job.get("remote_type") or "").lower()
        if remote_type == job_remote or remote_type == "any":
            score += 1.0

    # Country / city — look in the location JSONB or text representation
    country = (query.get("country") or "").lower().strip()
    city = (query.get("city") or "").lower().strip()
    location_text = json.dumps(job.get("location") or {}).lower()

    if country:
        checks += 1
        if country in location_text:
            score += 1.0

    if city:
        checks += 1
        if city in location_text:
            score += 1.0

    # Keywords — match against title + description
    keywords_raw = query.get("keywords") or ""
    keywords: list[str] = (
        [k.strip().lower() for k in keywords_raw.split(",") if k.strip()]
        if isinstance(keywords_raw, str)
        else [str(k).lower() for k in keywords_raw if k]
    )

    if keywords:
        job_text = (
            (job.get("title") or "")
            + " "
            + (job.get("description") or "")
        ).lower()
        matched_kw = sum(1 for kw in keywords if kw in job_text)
        checks += len(keywords)
        score += matched_kw

    if checks == 0:
        return 1.0  # no constraints → matches everything

    return min(1.0, score / checks)


# ---------------------------------------------------------------------------
# Core evaluator
# ---------------------------------------------------------------------------


def evaluate_alert(alert_row: dict[str, Any], pool: ConnectionPool) -> int:
    """Evaluate a single alert and create deliveries for matching jobs.

    Returns the number of new matches created.
    """
    alert_id: str = str(alert_row["id"])
    user_id: str = str(alert_row["user_id"])
    alert_name: str = alert_row.get("name") or "Job Alert"
    minimum_score: float = float(alert_row.get("minimum_match_score") or 0.5)
    delivery_channels: list[str] = alert_row.get("delivery_channels") or []
    last_evaluated: datetime | None = alert_row.get("last_evaluated_at")

    query_raw = alert_row.get("query") or {}
    query: dict[str, Any] = (
        json.loads(query_raw) if isinstance(query_raw, str) else query_raw
    )

    log = logger.bind(alert_id=alert_id, user_id=user_id)

    # Fetch new active jobs since last evaluation
    with pool.connection() as conn:
        if last_evaluated:
            rows: list[Any] = conn.execute(
                """
                SELECT j.id, j.title, j.description, j.employment_type,
                       j.remote_type, j.required_skills, j.salary_min, j.salary_max,
                       j.currency, j.company_id, j.location_id
                FROM jobs_canonical j
                WHERE j.status = 'active'
                  AND j.created_at > %s
                ORDER BY j.created_at DESC
                LIMIT 500
                """,
                (last_evaluated,),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT j.id, j.title, j.description, j.employment_type,
                       j.remote_type, j.required_skills, j.salary_min, j.salary_max,
                       j.currency, j.company_id, j.location_id
                FROM jobs_canonical j
                WHERE j.status = 'active'
                ORDER BY j.created_at DESC
                LIMIT 500
                """,
            ).fetchall()

    col_names = [
        "id", "title", "description", "employment_type", "remote_type",
        "required_skills", "salary_min", "salary_max", "currency",
        "company_id", "location_id",
    ]
    jobs = [dict(zip(col_names, r, strict=True)) for r in rows]

    # Score and filter
    matches: list[dict[str, Any]] = []
    for job in jobs:
        score_float = _match_job_to_query(job, query)
        if score_float >= minimum_score:
            matches.append({**job, "_match_score": score_float})

    if not matches:
        log.debug("alert_evaluator.no_matches", alert_id=alert_id)
        _update_last_evaluated(pool, alert_id)
        return 0

    # Check which jobs were already delivered for this alert
    job_ids = [str(m["id"]) for m in matches]
    with pool.connection() as conn:
        existing_rows: list[Any] = conn.execute(
            """
            SELECT job_id FROM alert_deliveries
            WHERE alert_id = %s AND job_id = ANY(%s::uuid[])
            """,
            (alert_id, job_ids),
        ).fetchall()
    already_delivered: set[str] = {str(r[0]) for r in existing_rows}

    new_matches = [m for m in matches if str(m["id"]) not in already_delivered]
    if not new_matches:
        _update_last_evaluated(pool, alert_id)
        return 0

    # Insert deliveries + notifications
    now = datetime.now(tz=UTC)
    for match in new_matches:
        job_id = str(match["id"])
        match_score = match["_match_score"]

        for channel in delivery_channels:
            delivery_id = str(uuid.uuid4())
            with pool.connection() as conn:
                conn.execute(
                    """
                    INSERT INTO alert_deliveries
                        (id, alert_id, user_id, job_id, channel, status,
                         match_score, delivered_at, metadata)
                    VALUES (%s, %s, %s, %s, %s, 'pending', %s, %s, '{}'::jsonb)
                    ON CONFLICT DO NOTHING
                    """,
                    (
                        delivery_id, alert_id, user_id, job_id,
                        channel, match_score, now,
                    ),
                )
                conn.commit()

        # Insert notification
        with pool.connection() as conn:
            conn.execute(
                """
                INSERT INTO notifications
                    (id, user_id, type, title, body, job_id, alert_id, read, created_at)
                VALUES (gen_random_uuid(), %s, 'alert_match', %s, %s, %s, %s, false, %s)
                """,
                (
                    user_id,
                    f"New match: {match.get('title', 'Job')}",
                    f"A new job matching your alert '{alert_name}' was found.",
                    job_id,
                    alert_id,
                    now,
                ),
            )
            conn.commit()

    # Dispatch email if channel includes 'email'
    if "email" in delivery_channels:
        try:
            _dispatch_email(user_id, alert_id, alert_name, new_matches, pool)
        except Exception as exc:  # noqa: BLE001
            log.error("alert_evaluator.email_dispatch_failed", error=str(exc))

    _update_last_evaluated(pool, alert_id)
    log.info("alert_evaluator.evaluated", matches=len(new_matches))
    return len(new_matches)


def _update_last_evaluated(pool: ConnectionPool, alert_id: str) -> None:
    with pool.connection() as conn:
        conn.execute(
            "UPDATE alerts SET last_evaluated_at = NOW() WHERE id = %s",
            (alert_id,),
        )
        conn.commit()


def _dispatch_email(
    user_id: str,
    alert_id: str,
    alert_name: str,
    matches: list[dict[str, Any]],
    pool: ConnectionPool,
) -> None:
    """Look up the user's email and dispatch an alert digest."""
    from job_globe_workers.agents.alert_evaluator.email_sender import (
        count_today_deliveries,
        send_alert_digest,
    )

    today_count = count_today_deliveries(user_id, pool)
    if today_count >= settings.alert_daily_max_per_user:
        logger.info(
            "alert_evaluator.daily_cap_reached",
            user_id=user_id,
            today_count=today_count,
        )
        return

    # Look up user email from auth.users via a service-role Supabase call,
    # or fall back to a profiles.email column if present.
    user_email = _get_user_email(user_id, pool)
    if not user_email:
        logger.warning("alert_evaluator.no_user_email", user_id=user_id)
        return

    send_alert_digest(user_email, alert_name, matches)


def _get_user_email(user_id: str, pool: ConnectionPool) -> str | None:
    """Retrieve email from auth.users (Supabase internal schema)."""
    try:
        with pool.connection() as conn:
            row = conn.execute(
                "SELECT email FROM auth.users WHERE id = %s",
                (user_id,),
            ).fetchone()
        return str(row[0]) if row else None
    except Exception as exc:  # noqa: BLE001
        logger.warning("alert_evaluator.email_lookup_failed", error=str(exc))
        return None


# ---------------------------------------------------------------------------
# Worker loop
# ---------------------------------------------------------------------------


def run_alert_evaluator_loop(stop_event: threading.Event) -> None:
    """Evaluate all active alerts periodically until *stop_event* is set."""
    logger.info("alert_evaluator.loop.started")
    pool = get_pool()

    while not stop_event.is_set():
        try:
            with pool.connection() as conn:
                alert_rows: list[Any] = conn.execute(
                    """
                    SELECT id, user_id, name, query, minimum_match_score,
                           delivery_channels, last_evaluated_at
                    FROM alerts
                    WHERE active = true
                    ORDER BY COALESCE(last_evaluated_at, '1970-01-01') ASC
                    """
                ).fetchall()

            col_names = [
                "id", "user_id", "name", "query", "minimum_match_score",
                "delivery_channels", "last_evaluated_at",
            ]
            alerts = [dict(zip(col_names, r, strict=True)) for r in alert_rows]

            total_matches = 0
            for alert in alerts:
                if stop_event.is_set():
                    break
                try:
                    total_matches += evaluate_alert(alert, pool)
                except Exception as exc:  # noqa: BLE001
                    logger.error(
                        "alert_evaluator.alert_error",
                        alert_id=str(alert.get("id")),
                        error=str(exc),
                    )

            if total_matches:
                logger.info(
                    "alert_evaluator.cycle_complete",
                    alerts_evaluated=len(alerts),
                    total_matches=total_matches,
                )

        except Exception as exc:  # noqa: BLE001
            logger.error("alert_evaluator.loop.error", error=str(exc))

        stop_event.wait(settings.alert_evaluator_interval_seconds)

    logger.info("alert_evaluator.loop.stopped")
