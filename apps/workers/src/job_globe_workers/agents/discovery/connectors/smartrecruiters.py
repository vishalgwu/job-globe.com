"""SmartRecruiters Jobs API connector.

SmartRecruiters provides a public postings API for companies.
No authentication required to list a company's published postings.

Endpoint:
    GET https://api.smartrecruiters.com/v1/companies/{company-identifier}/postings
        ?limit=100&offset=0&status=PUBLIC

Response shape (abbreviated):
    {
      "totalFound": 45,
      "offset": 0,
      "limit": 100,
      "content": [
        {
          "id": "posting-uuid",
          "name": "Senior Software Engineer",
          "department": {"label": "Engineering"},
          "location": {"city": "Amsterdam", "country": "NL"},
          "jobAd": {
            "sections": {
              "jobDescription": {"text": "<p>We are…</p>"},
              "qualifications": {"text": "<p>You need…</p>"}
            }
          },
          "ref": "https://jobs.smartrecruiters.com/Company/posting-uuid",
          "applyUrl": "https://jobs.smartrecruiters.com/Company/posting-uuid#apply"
        }
      ]
    }
"""

from __future__ import annotations

import re
from collections.abc import Iterator
from html.parser import HTMLParser

import structlog

from job_globe_workers.agents.discovery.connectors.base import AbstractConnector

logger = structlog.get_logger(__name__)

_BASE_URL = "https://api.smartrecruiters.com/v1/companies"
_PAGE_SIZE = 100


class _StripHtml(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self._parts.append(data)

    def get_text(self) -> str:
        return re.sub(r"\s+", " ", " ".join(self._parts)).strip()


def _strip(raw: str) -> str:
    p = _StripHtml()
    p.feed(raw)
    return p.get_text()


class SmartRecruitersConnector(AbstractConnector):
    """Poll configured SmartRecruiters company identifiers."""

    name = "smartrecruiters"

    def is_configured(self) -> bool:
        return bool(self._cfg.smartrecruiters_company_id_list)

    def fetch(self) -> Iterator[dict]:
        for company_id in self._cfg.smartrecruiters_company_id_list:
            yield from self._fetch_company(company_id)

    def _fetch_company(self, company_id: str) -> Iterator[dict]:
        url = f"{_BASE_URL}/{company_id}/postings"
        offset = 0
        total_yielded = 0
        while True:
            params = {
                "limit": _PAGE_SIZE,
                "offset": offset,
                "status": "PUBLIC",
            }
            resp = self._get(url, params=params)
            data = resp.json()
            postings = data.get("content", [])
            if not postings:
                break
            for posting in postings:
                total_yielded += 1
                yield self._normalise(posting, company_id)
            total_found = data.get("totalFound", 0)
            offset += _PAGE_SIZE
            if offset >= total_found:
                break

        logger.info(
            "smartrecruiters.fetched",
            company_id=company_id,
            count=total_yielded,
        )

    def _normalise(self, posting: dict, company_id: str) -> dict:
        location = posting.get("location") or {}
        city = location.get("city", "")
        country = location.get("country", "")
        region = location.get("region", "")
        location_raw = ", ".join(filter(None, [city, region, country]))

        job_ad = posting.get("jobAd") or {}
        sections = job_ad.get("sections") or {}
        desc_raw = sections.get("jobDescription", {}).get("text", "")
        qual_raw = sections.get("qualifications", {}).get("text", "")
        description = _strip(desc_raw + " " + qual_raw)

        posting_id = posting.get("id", "")
        ref_url = posting.get("ref", "")
        apply_url = posting.get("applyUrl", ref_url)

        return {
            "source_job_id": posting_id,
            "source_url": ref_url,
            "apply_url": apply_url,
            "title": posting.get("name", "").strip(),
            "company_name": company_id,
            "location_raw": location_raw,
            "description": description[:5000],
            "employment_type": "full-time",
            "required_skills": [],
            "metadata": {
                "company_id": company_id,
                "department": (posting.get("department") or {}).get("label"),
                "industry": (posting.get("industry") or {}).get("label"),
            },
        }
