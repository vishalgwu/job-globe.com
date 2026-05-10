"""Workable Jobs API connector.

Workable provides a public SPI endpoint per company subdomain.
Fetching a specific company's jobs requires their subdomain slug but
no auth on the public endpoint.

Endpoint:
    GET https://www.workable.com/spi/v3/jobs
        ?details=true
        &state=published
    OR per-company:
    GET https://{company}.workable.com/spi/v3/jobs

When an API token is provided we use the authenticated endpoint to get
richer detail and avoid rate limits.

Response shape:
    {
      "jobs": [
        {
          "shortcode": "ABC123",
          "title": "Backend Engineer",
          "department": "Engineering",
          "url": "https://apply.workable.com/company/j/ABC123",
          "application_url": "https://apply.workable.com/company/j/ABC123/apply",
          "location": {"location_str": "London, UK"},
          "employment_type": "full-time",
          "description": {"body": "We are looking for…"}
        }
      ]
    }
"""

from __future__ import annotations

from collections.abc import Iterator

import structlog

from job_globe_workers.agents.discovery.connectors.base import AbstractConnector

logger = structlog.get_logger(__name__)


class WorkableConnector(AbstractConnector):
    """Poll configured Workable company subdomains for published jobs."""

    name = "workable"

    def is_configured(self) -> bool:
        return bool(self._cfg.workable_company_slug_list)

    def fetch(self) -> Iterator[dict]:
        for slug in self._cfg.workable_company_slug_list:
            yield from self._fetch_company(slug)

    def _fetch_company(self, slug: str) -> Iterator[dict]:
        base = f"https://apply.workable.com/api/v3/accounts/{slug}/jobs"
        headers: dict[str, str] = {}
        if self._cfg.workable_api_token:
            headers["Authorization"] = f"Bearer {self._cfg.workable_api_token}"

        next_page: str | None = None
        total = 0
        while True:
            params: dict[str, str | int] = {
                "details": "true",
                "state": "published",
                "limit": 50,
            }
            if next_page:
                params["next_page"] = next_page

            resp = self._get(base, params=params, headers=headers)
            data = resp.json()
            jobs = data.get("results", [])
            for job in jobs:
                total += 1
                yield self._normalise(job, slug)
            next_page = data.get("next_page")
            if not next_page or not jobs:
                break

        logger.info("workable.fetched", slug=slug, count=total)

    def _normalise(self, job: dict, company_slug: str) -> dict:
        location = job.get("location") or {}
        location_raw = (
            location.get("location_str")
            or location.get("city", "")
        )
        description_obj = job.get("description") or {}
        if isinstance(description_obj, dict):
            description = description_obj.get("body", "")
        else:
            description = str(description_obj)

        shortcode = job.get("shortcode", "")
        apply_url = (
            job.get("application_url")
            or job.get("url", "")
        )
        source_url = job.get("url", apply_url)

        emp_type = job.get("employment_type", "full-time").lower()

        return {
            "source_job_id": shortcode,
            "source_url": source_url,
            "apply_url": apply_url,
            "title": job.get("title", "").strip(),
            "company_name": company_slug,
            "location_raw": str(location_raw),
            "description": str(description)[:5000],
            "employment_type": (
                emp_type if emp_type in ("full-time", "part-time", "contract") else "full-time"
            ),
            "required_skills": [],
            "metadata": {
                "company_slug": company_slug,
                "department": job.get("department"),
                "shortcode": shortcode,
            },
        }
