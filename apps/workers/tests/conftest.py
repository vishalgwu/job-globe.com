"""Shared pytest fixtures for the worker test suite."""

from __future__ import annotations

import pytest


@pytest.fixture()
def sample_raw_job() -> dict:
    """A minimal valid raw job dict as produced by a connector."""
    return {
        "source_job_id": "test-123",
        "source_url": "https://boards.greenhouse.io/acme/jobs/123",
        "apply_url": "https://boards.greenhouse.io/acme/jobs/123",
        "title": "Senior Software Engineer",
        "company_name": "Acme Corp",
        "location_raw": "London, UK",
        "description": "We are looking for a senior Python and AWS engineer "
                       "to join our backend team. Requirements: 5+ years of "
                       "experience, strong Python, AWS, PostgreSQL skills.",
        "employment_type": "full-time",
        "salary_min": 80000,
        "salary_max": 120000,
        "currency": "GBP",
        "required_skills": [],
        "metadata": {},
    }
