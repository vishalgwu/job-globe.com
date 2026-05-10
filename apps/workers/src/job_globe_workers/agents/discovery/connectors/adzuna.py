"""Adzuna Jobs API connector.

Adzuna provides a free-tier search API requiring app_id + app_key.
We sweep configured countries and a set of broad keywords to build a
representative global dataset.

Endpoint:
    GET https://api.adzuna.com/v1/api/jobs/{country}/search/{page}
        ?app_id={id}&app_key={key}
        &results_per_page=50
        &content-type=application/json

Response shape (abbreviated):
    {
      "results": [
        {
          "id": "4567890",
          "title": "Software Engineer",
          "company": {"display_name": "Acme Corp"},
          "location": {"display_name": "London", "area": ["UK", "London"]},
          "description": "We are looking for…",
          "redirect_url": "https://www.adzuna.co.uk/jobs/…",
          "salary_min": 60000,
          "salary_max": 90000,
          "contract_type": "permanent",
          "created": "2026-05-01T09:00:00Z"
        }
      ],
      "count": 12345
    }
"""

from __future__ import annotations

from collections.abc import Iterator

import structlog

from job_globe_workers.agents.discovery.connectors.base import AbstractConnector

logger = structlog.get_logger(__name__)

_BASE_URL = "https://api.adzuna.com/v1/api/jobs"
_RESULTS_PER_PAGE = 50
_MAX_PAGES = 5  # 250 jobs per country per run — keeps within free tier

# Broad search terms that collectively cover most professional job categories
_SEARCH_TERMS = [
    "software engineer",
    "data scientist",
    "product manager",
    "designer",
    "marketing",
    "operations",
    "finance",
    "sales",
]


class AdzunaConnector(AbstractConnector):
    """Fetch jobs from Adzuna across configured countries and search terms."""

    name = "adzuna"

    def is_configured(self) -> bool:
        return bool(self._cfg.adzuna_app_id and self._cfg.adzuna_app_key)

    def fetch(self) -> Iterator[dict]:
        for country in self._cfg.adzuna_country_list:
            for term in _SEARCH_TERMS:
                yield from self._fetch_country_term(country, term)

    def _fetch_country_term(self, country: str, term: str) -> Iterator[dict]:
        seen_ids: set[str] = set()
        for page in range(1, _MAX_PAGES + 1):
            url = f"{_BASE_URL}/{country}/search/{page}"
            params = {
                "app_id": self._cfg.adzuna_app_id,
                "app_key": self._cfg.adzuna_app_key,
                "results_per_page": _RESULTS_PER_PAGE,
                "what": term,
                "content-type": "application/json",
            }
            resp = self._get(url, params=params)
            data = resp.json()
            results = data.get("results", [])
            if not results:
                break
            for job in results:
                job_id = str(job.get("id", ""))
                if job_id in seen_ids:
                    continue
                seen_ids.add(job_id)
                yield self._normalise(job, country)
        logger.info(
            "adzuna.fetched",
            country=country,
            term=term,
            count=len(seen_ids),
        )

    def _normalise(self, job: dict, country: str) -> dict:
        location = job.get("location") or {}
        company = job.get("company") or {}

        location_raw = location.get("display_name", "")
        if not location_raw:
            area = location.get("area", [])
            location_raw = ", ".join(area[-2:]) if area else ""

        contract = job.get("contract_type", "permanent").lower()
        if "part" in contract:
            employment_type = "part-time"
        elif "contract" in contract or "temp" in contract:
            employment_type = "contract"
        else:
            employment_type = "full-time"

        redirect_url = job.get("redirect_url", "")

        return {
            "source_job_id": str(job.get("id", "")),
            "source_url": redirect_url,
            "apply_url": redirect_url,
            "title": job.get("title", "").strip(),
            "company_name": company.get("display_name", "Unknown"),
            "location_raw": location_raw,
            "description": job.get("description", "")[:5000],
            "employment_type": employment_type,
            "salary_min": job.get("salary_min"),
            "salary_max": job.get("salary_max"),
            "currency": "GBP" if country == "gb" else "USD",
            "required_skills": [],
            "metadata": {
                "country": country,
                "category": job.get("category", {}).get("label"),
                "created": job.get("created"),
            },
        }
