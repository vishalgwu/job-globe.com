"""USA Jobs (USAJOBS.gov) connector.

USAJOBS provides a free REST API for US federal government job listings.
Authentication via Authorization-Key header (free API account).

Endpoint:
    GET https://data.usajobs.gov/api/search

Headers:
    Host: data.usajobs.gov
    User-Agent: {email}
    Authorization-Key: {api_key}

Response shape (abbreviated):
    {
      "SearchResult": {
        "SearchResultItems": [
          {
            "MatchedObjectId": "756234500",
            "MatchedObjectDescriptor": {
              "PositionTitle": "IT Specialist",
              "OrganizationName": "Dept of Defense",
              "PositionLocation": [{"CityName": "Washington", "CountryCode": "United States"}],
              "PublicationStartDate": "2026-04-01",
              "ApplicationCloseDate": "2026-06-01",
              "UserArea": {"Details": {"JobSummary": "We are looking for…"}},
              "PositionRemuneration": [{"MinimumRange": "80000", "MaximumRange": "120000", "CurrencyCode": "USD"}],
              "ApplyURI": ["https://www.usajobs.gov/job/…"],
              "PositionURI": "https://www.usajobs.gov/job/…"
            }
          }
        ]
      }
    }
"""

from __future__ import annotations

from collections.abc import Iterator

import structlog

from job_globe_workers.agents.discovery.connectors.base import AbstractConnector

logger = structlog.get_logger(__name__)

_BASE_URL = "https://data.usajobs.gov/api/search"
_PAGE_SIZE = 25
_MAX_PAGES = 10

_SEARCH_KEYWORDS = [
    "software",
    "data",
    "cybersecurity",
    "engineering",
    "analyst",
    "management",
]


class UsaJobsConnector(AbstractConnector):
    """Fetch US federal government job postings."""

    name = "usajobs"

    def is_configured(self) -> bool:
        return bool(self._cfg.usajobs_api_key)

    def fetch(self) -> Iterator[dict]:
        for keyword in _SEARCH_KEYWORDS:
            yield from self._fetch_keyword(keyword)

    def _fetch_keyword(self, keyword: str) -> Iterator[dict]:
        seen_ids: set[str] = set()
        headers = {
            "Host": "data.usajobs.gov",
            "User-Agent": self._cfg.usajobs_user_agent,
            "Authorization-Key": self._cfg.usajobs_api_key,
        }
        for page in range(1, _MAX_PAGES + 1):
            params = {
                "Keyword": keyword,
                "ResultsPerPage": _PAGE_SIZE,
                "Page": page,
            }
            resp = self._get(_BASE_URL, params=params, headers=headers)
            data = resp.json()
            items = (
                data.get("SearchResult", {})
                .get("SearchResultItems", [])
            )
            if not items:
                break
            for item in items:
                job_id = item.get("MatchedObjectId", "")
                if job_id in seen_ids:
                    continue
                seen_ids.add(job_id)
                yield self._normalise(item)
        logger.info("usajobs.fetched", keyword=keyword, count=len(seen_ids))

    def _normalise(self, item: dict) -> dict:
        desc = item.get("MatchedObjectDescriptor") or {}
        details = desc.get("UserArea", {}).get("Details", {})
        locations = desc.get("PositionLocation", [{}])
        loc0 = locations[0] if locations else {}

        city = loc0.get("CityName", "")
        state = loc0.get("CountrySubDivisionCode", "")
        country = loc0.get("CountryCode", "United States")
        location_raw = ", ".join(filter(None, [city, state, country]))

        remunerations = desc.get("PositionRemuneration", [{}])
        rem = remunerations[0] if remunerations else {}
        try:
            salary_min = int(float(rem.get("MinimumRange", 0) or 0))
        except (ValueError, TypeError):
            salary_min = None
        try:
            salary_max = int(float(rem.get("MaximumRange", 0) or 0))
        except (ValueError, TypeError):
            salary_max = None

        apply_uris = desc.get("ApplyURI", [])
        apply_url = apply_uris[0] if apply_uris else desc.get("PositionURI", "")
        source_url = desc.get("PositionURI", apply_url)

        job_id = item.get("MatchedObjectId", "")
        summary = details.get("JobSummary", "") or details.get("MajorDuties", "")

        return {
            "source_job_id": job_id,
            "source_url": source_url,
            "apply_url": apply_url,
            "title": desc.get("PositionTitle", "").strip(),
            "company_name": desc.get("OrganizationName", "US Federal Government"),
            "location_raw": location_raw,
            "description": str(summary)[:5000],
            "employment_type": "full-time",
            "salary_min": salary_min if salary_min else None,
            "salary_max": salary_max if salary_max else None,
            "currency": rem.get("CurrencyCode", "USD"),
            "required_skills": [],
            "metadata": {
                "close_date": desc.get("ApplicationCloseDate"),
                "publication_date": desc.get("PublicationStartDate"),
                "pay_plan": details.get("PayPlan"),
            },
        }
