"""URL liveness checker for apply links.

Uses HTTP HEAD requests (falling back to GET on 405) with a short timeout.
We check apply_url, not source_url, because the apply link is what users
actually click — a dead apply link is worthless even if the listing page
is still up.

Trust signals returned alongside liveness:
  - is_live:      bool
  - final_url:    str    (after redirects)
  - status_code:  int
  - trust_score:  float  (0.0–1.0)  based on redirect depth, HTTPS, TLD
"""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse

import httpx
import structlog

from job_globe_workers.settings import settings

logger = structlog.get_logger(__name__)

# ATSes that redirect all applications through their own domains
_TRUSTED_DOMAINS = frozenset(
    [
        "greenhouse.io",
        "lever.co",
        "workable.com",
        "smartrecruiters.com",
        "boards.greenhouse.io",
        "apply.workable.com",
        "jobs.lever.co",
        "jobs.smartrecruiters.com",
        "usajobs.gov",
        "ec.europa.eu",
        "adzuna.co.uk",
        "adzuna.com",
    ]
)

# HTTP status codes that indicate a live posting
_LIVE_STATUSES = frozenset([200, 201, 301, 302, 303, 307, 308])

# Statuses that definitively indicate a dead/expired posting
_DEAD_STATUSES = frozenset([404, 410])


@dataclass
class UrlCheckResult:
    is_live: bool
    final_url: str
    status_code: int
    trust_score: float
    redirect_count: int
    is_https: bool


def _compute_trust_score(
    *,
    is_live: bool,
    is_https: bool,
    final_domain: str,
    redirect_count: int,
    status_code: int,
) -> float:
    """Compute a 0.0–1.0 trust score for a job application URL."""
    if not is_live:
        return 0.0

    score = 0.5  # baseline for live URL

    if is_https:
        score += 0.2

    # Known ATS domain — high confidence the posting is real
    for trusted in _TRUSTED_DOMAINS:
        if final_domain.endswith(trusted):
            score += 0.25
            break

    # Excessive redirects reduce trust slightly
    if redirect_count > 3:
        score -= 0.1 * min(redirect_count - 3, 2)

    # 200 OK is better than a redirect chain ending in 200
    if status_code == 200:
        score += 0.05

    return round(min(max(score, 0.0), 1.0), 4)


def check_url(apply_url: str) -> UrlCheckResult:
    """Perform a HEAD (or GET fallback) request to verify URL liveness."""
    if not apply_url or not apply_url.startswith(("http://", "https://")):
        return UrlCheckResult(
            is_live=False,
            final_url=apply_url,
            status_code=0,
            trust_score=0.0,
            redirect_count=0,
            is_https=False,
        )

    try:
        with httpx.Client(
            timeout=settings.http_timeout_seconds,
            follow_redirects=True,
            headers={
                "User-Agent": "job-globe-verifier/1.0 (+https://job-globe.com)",
            },
        ) as client:
            resp = client.head(apply_url)
            if resp.status_code == 405:
                # Server doesn't allow HEAD -- fall back to GET with streaming
                resp = client.get(apply_url)
    except httpx.RequestError as exc:
        logger.debug("url_check.request_error", url=apply_url, error=str(exc))
        return UrlCheckResult(
            is_live=False,
            final_url=apply_url,
            status_code=0,
            trust_score=0.0,
            redirect_count=0,
            is_https=apply_url.startswith("https://"),
        )

    final_url = str(resp.url)
    parsed = urlparse(final_url)
    final_domain = parsed.netloc.lower().lstrip("www.")
    is_https = parsed.scheme == "https"
    redirect_count = len(resp.history)
    status_code = resp.status_code
    is_live = status_code not in _DEAD_STATUSES and status_code < 500

    trust_score = _compute_trust_score(
        is_live=is_live,
        is_https=is_https,
        final_domain=final_domain,
        redirect_count=redirect_count,
        status_code=status_code,
    )

    logger.debug(
        "url_check.result",
        url=apply_url,
        status=status_code,
        is_live=is_live,
        trust_score=trust_score,
        redirects=redirect_count,
    )
    return UrlCheckResult(
        is_live=is_live,
        final_url=final_url,
        status_code=status_code,
        trust_score=trust_score,
        redirect_count=redirect_count,
        is_https=is_https,
    )
