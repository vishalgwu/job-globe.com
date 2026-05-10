"""EURES (European Jobs Network) connector.

EURES is the EU job mobility portal. Their public job search API requires
no authentication for read access.

Endpoint:
    GET https://jobsearch.api.ec.europa.eu/searchengine/rest/esco/v1/jobs/search

Request (POST with JSON body):
    {
      "keywords": {"filter": [{"must": ["software"]}]},
      "paginationOffset": 0,
      "paginationSize": 25,
      "sortSearch": "BEST_MATCH"
    }

Response shape (abbreviated):
    {
      "data": {
        "items": [
          {
            "header": {
              "id": "eures-job-uuid",
              "dataSourceId": "eures",
              "title": "Software Engineer",
              "employer": {"name": "Acme GmbH"},
              "location": {"city": "Berlin", "countryCode": "DE"}
            },
            "jobVacancy": {
              "hrxml": {
                "positionProfile": {"positionDescription": "We are looking for…"}
              }
            }
          }
        ],
        "totalCount": 5000
      }
    }
"""

from __future__ import annotations

from collections.abc import Iterator

import structlog

from job_globe_workers.agents.discovery.connectors.base import AbstractConnector

logger = structlog.get_logger(__name__)

_SEARCH_PATH = "/jobs/search"
_PAGE_SIZE = 25
_MAX_PAGES = 8

_KEYWORD_BATCHES = [
    ["software", "developer"],
    ["data", "analyst"],
    ["engineer", "technical"],
    ["manager", "project"],
    ["designer", "creative"],
    ["finance", "accounting"],
    ["marketing", "sales"],
    ["operations", "logistics"],
]


class EuresConnector(AbstractConnector):
    """Fetch EU job postings from the EURES job search API."""

    name = "eures"

    def is_configured(self) -> bool:
        # EURES is always configured — it requires no credentials
        return True

    def fetch(self) -> Iterator[dict]:
        for keywords in _KEYWORD_BATCHES:
            yield from self._fetch_keywords(keywords)

    def _fetch_keywords(self, keywords: list[str]) -> Iterator[dict]:
        url = self._cfg.eures_api_url.rstrip("/") + _SEARCH_PATH
        seen_ids: set[str] = set()

        for page in range(_MAX_PAGES):
            body = {
                "keywords": {"filter": [{"must": keywords}]},
                "paginationOffset": page * _PAGE_SIZE,
                "paginationSize": _PAGE_SIZE,
                "sortSearch": "BEST_MATCH",
            }
            resp = self._post(url, json=body)
            data = resp.json()
            items = data.get("data", {}).get("items", [])
            if not items:
                break
            for item in items:
                header = item.get("header") or {}
                job_id = header.get("id", "")
                if not job_id or job_id in seen_ids:
                    continue
                seen_ids.add(job_id)
                yield self._normalise(item)
        logger.info(
            "eures.fetched",
            keywords=keywords,
            count=len(seen_ids),
        )

    def _normalise(self, item: dict) -> dict:
        header = item.get("header") or {}
        vacancy = item.get("jobVacancy") or {}
        hrxml = vacancy.get("hrxml") or {}
        profile = hrxml.get("positionProfile") or {}

        employer = header.get("employer") or {}
        location = header.get("location") or {}

        city = location.get("city", "")
        country_code = location.get("countryCode", "")
        location_raw = ", ".join(filter(None, [city, country_code]))

        description = (
            profile.get("positionDescription")
            or profile.get("positionSummary")
            or ""
        )

        eures_id = header.get("id", "")
        source_url = f"https://eures.ec.europa.eu/eures-jobs/{eures_id}"

        return {
            "source_job_id": eures_id,
            "source_url": source_url,
            "apply_url": header.get("applyUrl", source_url),
            "title": header.get("title", "").strip(),
            "company_name": employer.get("name", "Unknown"),
            "location_raw": location_raw,
            "description": str(description)[:5000],
            "employment_type": "full-time",
            "required_skills": [],
            "metadata": {
                "country_code": country_code,
                "data_source": header.get("dataSourceId"),
                "eures_id": eures_id,
            },
        }
