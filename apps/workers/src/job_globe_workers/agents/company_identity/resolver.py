"""Company identity resolver.

Given a company name and apply_url, this module:
  1. Extracts the root domain from the apply_url.
  2. Builds a logo_url using Clearbit's free logo API (no auth required).
  3. Computes a trust_score based on source confidence signals.
  4. Upserts the result into the companies table.

Clearbit Logo API (free, no auth):
    https://logo.clearbit.com/{domain}
    Returns the company logo as an image/PNG, or 404 if not found.
    We use a HEAD request to confirm existence before storing the URL.

Trust scoring (0-1):
  +0.3  HTTPS apply URL
  +0.3  Domain matches a known ATS domain (greenhouse, lever, etc.)
  +0.2  trust_score passed from verification event
  +0.2  Logo found via Clearbit
"""

from __future__ import annotations

import uuid
from decimal import Decimal
from urllib.parse import urlparse

import httpx
import structlog

# DB imports are lazy (inside resolve_company) so tests don't need a live DB.

logger = structlog.get_logger(__name__)

_CLEARBIT_LOGO_URL = "https://logo.clearbit.com/{domain}"

# ATS root domains -- jobs posted here are inherently trustworthy
_TRUSTED_ATS_DOMAINS = frozenset(
    [
        "greenhouse.io",
        "lever.co",
        "workable.com",
        "smartrecruiters.com",
        "usajobs.gov",
        "ec.europa.eu",
        "adzuna.com",
        "adzuna.co.uk",
        "myworkdayjobs.com",
        "taleo.net",
        "icims.com",
        "jobvite.com",
        "applytojob.com",
    ]
)

_LOGO_TIMEOUT = 5.0


def _extract_domain(apply_url: str) -> str | None:
    """Return the registrable domain from an apply URL, or None."""
    if not apply_url:
        return None
    try:
        parsed = urlparse(apply_url)
        host = parsed.netloc.lower().removeprefix("www.")
        # Strip port if present
        host = host.split(":")[0]
        return host if "." in host else None
    except Exception:  # noqa: BLE001
        return None


def _is_trusted_ats(domain: str) -> bool:
    return any(domain.endswith(ats) for ats in _TRUSTED_ATS_DOMAINS)


def _check_logo(domain: str) -> str | None:
    """HEAD-check the Clearbit logo URL. Returns the URL if logo exists."""
    logo_url = _CLEARBIT_LOGO_URL.format(domain=domain)
    try:
        resp = httpx.head(logo_url, timeout=_LOGO_TIMEOUT, follow_redirects=True)
        if resp.status_code == 200:
            return logo_url
    except Exception:  # noqa: BLE001
        pass
    return None


def compute_trust_score(
    *,
    apply_url: str,
    domain: str | None,
    verification_trust: float = 0.0,
    has_logo: bool = False,
) -> Decimal:
    """Compute a 0.00-1.00 trust score for a company."""
    score = 0.0

    if apply_url.startswith("https://"):
        score += 0.3

    if domain and _is_trusted_ats(domain):
        score += 0.3

    score += verification_trust * 0.2

    if has_logo:
        score += 0.2

    return Decimal(str(round(min(score, 1.0), 4)))


def resolve_company(
    *,
    company_name: str,
    apply_url: str,
    source: str,
    verification_trust: float = 0.0,
) -> uuid.UUID:
    """Resolve company identity and upsert into the companies table.

    Returns the company UUID.
    """
    domain = _extract_domain(apply_url)
    logo_url: str | None = None

    if domain:
        logo_url = _check_logo(domain)

    trust = compute_trust_score(
        apply_url=apply_url,
        domain=domain,
        verification_trust=verification_trust,
        has_logo=logo_url is not None,
    )

    meta = {
        "source": source,
        "apply_url_sample": apply_url[:200],
    }

    from job_globe_workers.db.connection import get_pool
    from job_globe_workers.db.repositories.companies import upsert_company

    pool = get_pool()
    with pool.connection() as conn:
        company_id = upsert_company(
            conn,
            name=company_name,
            domain=domain,
            logo_url=logo_url,
            trust_score=trust,
            source_metadata=meta,
        )
        conn.commit()

    logger.debug(
        "company_identity.resolved",
        company_name=company_name,
        domain=domain,
        trust_score=float(trust),
        company_id=str(company_id),
    )
    return company_id
