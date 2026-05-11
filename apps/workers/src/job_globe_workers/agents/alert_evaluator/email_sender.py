"""Resend email delivery for alert digests.

Uses httpx to POST to https://api.resend.com/emails.
Builds a clean HTML email listing matched jobs.
Enforces the daily cap (alert_daily_max_per_user) by counting today's
deliveries in alert_deliveries before sending.
"""

from __future__ import annotations

import html
from typing import Any

import httpx
import structlog
from psycopg_pool import ConnectionPool

from job_globe_workers.settings import settings

logger = structlog.get_logger(__name__)

_RESEND_API_URL = "https://api.resend.com/emails"


# ---------------------------------------------------------------------------
# HTML builder
# ---------------------------------------------------------------------------


def build_email_html(
    user_email: str,
    alert_name: str,
    matches: list[dict[str, Any]],
) -> str:
    """Build a clean HTML email body listing matched jobs."""
    escaped_alert = html.escape(alert_name)
    escaped_email = html.escape(user_email)

    job_rows: list[str] = []
    for match in matches:
        title = html.escape(str(match.get("title") or "Untitled"))
        company = html.escape(str(match.get("company") or match.get("company_id") or ""))
        location = html.escape(str(match.get("location") or match.get("location_id") or ""))
        score_pct = int(float(match.get("_match_score", 0.0)) * 100)
        apply_url = str(match.get("apply_url") or match.get("source_url") or "#")
        safe_url = html.escape(apply_url)

        salary_min = match.get("salary_min")
        salary_max = match.get("salary_max")
        currency = html.escape(str(match.get("currency") or ""))
        salary_str = ""
        if salary_min or salary_max:
            lo = f"{salary_min:,}" if salary_min else "?"
            hi = f"{salary_max:,}" if salary_max else "?"
            salary_str = (
                "<p style='margin:4px 0;color:#555;font-size:13px;'>"
                f"Salary: {currency} {lo}&ndash;{hi}</p>"
            )

        company_html = (
            f"<p style='margin:4px 0;color:#666;font-size:13px;'>{company}</p>"
            if company
            else ""
        )
        location_html = (
            f"<p style='margin:4px 0;color:#666;font-size:13px;'>&#128205; {location}</p>"
            if location
            else ""
        )

        job_rows.append(
            f"""
            <div style='border:1px solid #e0e0e0;border-radius:8px;
                        padding:16px;margin-bottom:16px;'>
              <h3 style='margin:0 0 4px 0;font-size:16px;color:#1a1a1a;'>{title}</h3>
              {company_html}
              {location_html}
              {salary_str}
              <p style='margin:4px 0;color:#888;font-size:12px;'>Match score: {score_pct}%</p>
              <a href='{safe_url}'
                 style='display:inline-block;margin-top:10px;padding:8px 16px;
                        background:#2563eb;color:#fff;text-decoration:none;
                        border-radius:4px;font-size:14px;font-weight:600;'>
                Apply Now
              </a>
            </div>
            """
        )

    jobs_html = "\n".join(job_rows)
    count = len(matches)
    plural = "job" if count == 1 else "jobs"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>{escaped_alert}</title>
</head>
<body style='font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
             background:#f9f9f9;margin:0;padding:24px;'>
  <div style='max-width:600px;margin:0 auto;background:#fff;border-radius:12px;
              padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08);'>

    <h1 style='font-size:22px;color:#1a1a1a;margin:0 0 8px 0;'>
      Job Globe — Alert Digest
    </h1>
    <p style='color:#555;font-size:14px;margin:0 0 24px 0;'>
      Hi {escaped_email}, we found <strong>{count} new {plural}</strong>
      matching your alert <em>"{escaped_alert}"</em>.
    </p>

    {jobs_html}

    <hr style='border:none;border-top:1px solid #eee;margin:24px 0;' />
    <p style='font-size:12px;color:#999;margin:0;'>
      You are receiving this because you set up a job alert on
      <a href="https://job-globe.com" style='color:#2563eb;'>job-globe.com</a>.
      To manage your alerts, visit your
      <a href="https://job-globe.com/dashboard/alerts" style='color:#2563eb;'>dashboard</a>.
    </p>
  </div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Daily cap check
# ---------------------------------------------------------------------------


def count_today_deliveries(user_id: str, pool: ConnectionPool) -> int:
    """Count alert_deliveries for *user_id* where delivered_at::date = CURRENT_DATE."""
    with pool.connection() as conn:
        row = conn.execute(
            """
            SELECT COUNT(*)
            FROM alert_deliveries
            WHERE user_id = %s
              AND delivered_at::date = CURRENT_DATE
            """,
            (user_id,),
        ).fetchone()
    return int(row[0]) if row else 0


# ---------------------------------------------------------------------------
# Sending
# ---------------------------------------------------------------------------


def send_alert_digest(
    user_email: str,
    alert_name: str,
    matches: list[dict[str, Any]],
) -> bool:
    """Send an alert digest email via the Resend API.

    Returns True on success, False on failure.
    """
    if not settings.resend_api_key:
        logger.warning("email_sender.no_resend_key")
        return False

    subject = f"[Job Globe] {len(matches)} new job{'s' if len(matches) != 1 else ''} — {alert_name}"
    html_body = build_email_html(user_email, alert_name, matches)

    payload: dict[str, Any] = {
        "from": settings.alert_from_email,
        "to": [user_email],
        "subject": subject,
        "html": html_body,
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(
                _RESEND_API_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()

        logger.info(
            "email_sender.sent",
            to=user_email,
            alert_name=alert_name,
            match_count=len(matches),
        )
        return True

    except httpx.HTTPStatusError as exc:
        logger.error(
            "email_sender.http_error",
            status=exc.response.status_code,
            body=exc.response.text[:200],
        )
        return False
    except Exception as exc:  # noqa: BLE001
        logger.error("email_sender.unexpected_error", error=str(exc))
        return False
