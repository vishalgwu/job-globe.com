"""Greenhouse Jobs API connector.

Greenhouse exposes a public board API — no authentication is required.
Each company has a unique board token.  We poll every configured token.

Endpoint:
    GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true

Response shape (abbreviated):
    {
      "jobs": [
        {
          "id": 12345,
          "title": "Senior Engineer",
          "location": {"name": "London, UK"},
          "absolute_url": "https://boards.greenhouse.io/company/jobs/12345",
          "content": "<html>…</html>",
          "departments": [{"name": "Engineering"}],
          "offices": [{"name": "London"}]
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

_BASE_URL = "https://boards-api.greenhouse.io/v1/boards"


class _HtmlStripper(HTMLParser):
    """Minimal HTML-to-text converter used for job descriptions."""

    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self._parts.append(data)

    def get_text(self) -> str:
        return " ".join(self._parts).strip()


def _strip_html(raw: str) -> str:
    parser = _HtmlStripper()
    parser.feed(raw)
    text = parser.get_text()
    # Collapse excessive whitespace
    return re.sub(r"\s+", " ", text).strip()


class GreenhouseConnector(AbstractConnector):
    """Poll one or more Greenhouse board tokens."""

    name = "greenhouse"

    def is_configured(self) -> bool:
        return bool(self._cfg.greenhouse_board_token_list)

    def fetch(self) -> Iterator[dict]:
        for token in self._cfg.greenhouse_board_token_list:
            yield from self._fetch_board(token)

    def _fetch_board(self, board_token: str) -> Iterator[dict]:
        url = f"{_BASE_URL}/{board_token}/jobs"
        logger.info("greenhouse.fetch_board", board_token=board_token)
        resp = self._get(url, params={"content": "true"})
        data = resp.json()
        jobs = data.get("jobs", [])
        logger.info(
            "greenhouse.fetched",
            board_token=board_token,
            count=len(jobs),
        )
        for job in jobs:
            yield self._normalise(job, board_token)

    def _normalise(self, job: dict, board_token: str) -> dict:
        location = job.get("location") or {}
        description_raw = job.get("content", "")
        description = _strip_html(description_raw) if description_raw else ""

        departments = [d.get("name", "") for d in job.get("departments", [])]
        offices = [o.get("name", "") for o in job.get("offices", [])]

        apply_url = job.get("absolute_url", "")
        source_url = f"{_BASE_URL}/{board_token}/jobs/{job['id']}"

        return {
            "source_job_id": str(job["id"]),
            "source_url": source_url,
            "apply_url": apply_url,
            "title": job.get("title", "").strip(),
            "company_name": board_token,       # board token as company proxy
            "location_raw": location.get("name", ""),
            "description": description[:5000],  # Guard against huge HTML blobs
            "employment_type": "full-time",
            "required_skills": [],
            "metadata": {
                "board_token": board_token,
                "departments": departments,
                "offices": offices,
            },
        }
