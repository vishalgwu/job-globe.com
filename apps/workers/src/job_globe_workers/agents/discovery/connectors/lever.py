"""Lever Jobs API connector.

Lever exposes a public posting API — no authentication required.
Each company has a unique slug.

Endpoint:
    GET https://api.lever.co/v0/postings/{company}?mode=json

Response shape (abbreviated):
    [
      {
        "id": "abc-123",
        "text": "Senior Engineer",
        "categories": {
          "location": "London, UK",
          "commitment": "Full-time",
          "team": "Engineering",
          "department": "Product"
        },
        "description": "<p>We are…</p>",
        "descriptionPlain": "We are…",
        "hostedUrl": "https://jobs.lever.co/company/abc-123",
        "applyUrl": "https://jobs.lever.co/company/abc-123/apply",
        "salaryRange": {"min": 80000, "max": 120000, "currency": "USD"}
      }
    ]
"""

from __future__ import annotations

from collections.abc import Iterator

import structlog

from job_globe_workers.agents.discovery.connectors.base import AbstractConnector

logger = structlog.get_logger(__name__)

_BASE_URL = "https://api.lever.co/v0/postings"


class LeverConnector(AbstractConnector):
    """Poll one or more Lever company slugs."""

    name = "lever"

    def is_configured(self) -> bool:
        return bool(self._cfg.lever_company_slug_list)

    def fetch(self) -> Iterator[dict]:
        for slug in self._cfg.lever_company_slug_list:
            yield from self._fetch_company(slug)

    def _fetch_company(self, slug: str) -> Iterator[dict]:
        url = f"{_BASE_URL}/{slug}"
        logger.info("lever.fetch_company", slug=slug)
        resp = self._get(url, params={"mode": "json"})
        postings = resp.json()
        if not isinstance(postings, list):
            logger.warning("lever.unexpected_response", slug=slug, type=type(postings).__name__)
            return
        logger.info("lever.fetched", slug=slug, count=len(postings))
        for posting in postings:
            yield self._normalise(posting, slug)

    def _normalise(self, posting: dict, company_slug: str) -> dict:
        categories = posting.get("categories") or {}
        salary = posting.get("salaryRange") or {}

        location_raw = (
            categories.get("location")
            or categories.get("allLocations", [""])[0]
            if isinstance(categories.get("allLocations"), list)
            else ""
        )

        commitment = categories.get("commitment", "full-time").lower()
        if "part" in commitment:
            employment_type = "part-time"
        elif "contract" in commitment or "freelance" in commitment:
            employment_type = "contract"
        else:
            employment_type = "full-time"

        description = (
            posting.get("descriptionPlain")
            or posting.get("description", "")
        )

        return {
            "source_job_id": posting.get("id", ""),
            "source_url": posting.get("hostedUrl", ""),
            "apply_url": posting.get("applyUrl", posting.get("hostedUrl", "")),
            "title": posting.get("text", "").strip(),
            "company_name": company_slug,
            "location_raw": str(location_raw),
            "description": str(description)[:5000],
            "employment_type": employment_type,
            "salary_min": salary.get("min"),
            "salary_max": salary.get("max"),
            "currency": salary.get("currency", "USD"),
            "required_skills": [],
            "metadata": {
                "company_slug": company_slug,
                "team": categories.get("team"),
                "department": categories.get("department"),
                "commitment": categories.get("commitment"),
            },
        }
