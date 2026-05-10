"""Tests for source connector normalisation logic.

These tests run entirely offline — they validate the _normalise() methods
using fixture data, without making real HTTP requests.
"""

from __future__ import annotations

from job_globe_workers.agents.discovery.connectors.adzuna import AdzunaConnector
from job_globe_workers.agents.discovery.connectors.eures import EuresConnector
from job_globe_workers.agents.discovery.connectors.greenhouse import (
    GreenhouseConnector,
    _strip_html,
)
from job_globe_workers.agents.discovery.connectors.lever import LeverConnector
from job_globe_workers.agents.discovery.connectors.smartrecruiters import SmartRecruitersConnector
from job_globe_workers.agents.discovery.connectors.usajobs import UsaJobsConnector
from job_globe_workers.agents.discovery.connectors.workable import WorkableConnector

# ── Greenhouse ─────────────────────────────────────────────────────────────

class TestGreenhouseConnector:
    def test_strip_html_removes_tags(self) -> None:
        raw = "<p>We are looking for a <strong>senior engineer</strong>.</p>"
        result = _strip_html(raw)
        assert "<" not in result
        assert "senior engineer" in result

    def test_normalise_produces_required_keys(self) -> None:
        connector = GreenhouseConnector()
        job = {
            "id": 12345,
            "title": "Backend Engineer",
            "location": {"name": "London, UK"},
            "absolute_url": "https://boards.greenhouse.io/acme/jobs/12345",
            "content": "<p>Description here</p>",
            "departments": [{"name": "Engineering"}],
            "offices": [{"name": "London"}],
        }
        result = connector._normalise(job, "acme")
        assert result["source_job_id"] == "12345"
        assert result["title"] == "Backend Engineer"
        assert result["location_raw"] == "London, UK"
        assert result["apply_url"] == "https://boards.greenhouse.io/acme/jobs/12345"
        assert "Description here" in result["description"]
        assert result["employment_type"] == "full-time"

    def test_is_configured_false_when_no_tokens(self) -> None:
        connector = GreenhouseConnector()
        # Default settings have no tokens
        assert connector.is_configured() is False


# ── Lever ──────────────────────────────────────────────────────────────────

class TestLeverConnector:
    def test_normalise_full_time(self) -> None:
        connector = LeverConnector()
        posting = {
            "id": "abc-123",
            "text": "Product Manager",
            "categories": {
                "location": "Amsterdam, NL",
                "commitment": "Full-time",
                "team": "Product",
            },
            "descriptionPlain": "We are hiring a PM.",
            "hostedUrl": "https://jobs.lever.co/company/abc-123",
            "applyUrl": "https://jobs.lever.co/company/abc-123/apply",
            "salaryRange": {"min": 90000, "max": 130000, "currency": "EUR"},
        }
        result = connector._normalise(posting, "company")
        assert result["source_job_id"] == "abc-123"
        assert result["title"] == "Product Manager"
        assert result["employment_type"] == "full-time"
        assert result["salary_min"] == 90000
        assert result["salary_max"] == 130000
        assert result["currency"] == "EUR"

    def test_normalise_contract(self) -> None:
        connector = LeverConnector()
        posting = {
            "id": "xyz-456",
            "text": "Freelance Designer",
            "categories": {"commitment": "Contract", "location": "Remote"},
            "descriptionPlain": "Freelance role.",
            "hostedUrl": "https://jobs.lever.co/co/xyz-456",
            "applyUrl": "https://jobs.lever.co/co/xyz-456/apply",
        }
        result = connector._normalise(posting, "co")
        assert result["employment_type"] == "contract"

    def test_is_configured_false_by_default(self) -> None:
        assert LeverConnector().is_configured() is False


# ── Adzuna ─────────────────────────────────────────────────────────────────

class TestAdzunaConnector:
    def test_normalise_uses_area_fallback(self) -> None:
        connector = AdzunaConnector()
        job = {
            "id": "999",
            "title": "Data Scientist",
            "company": {"display_name": "DataCo"},
            "location": {"display_name": "", "area": ["UK", "London"]},
            "description": "Join our data team.",
            "redirect_url": "https://www.adzuna.co.uk/jobs/999",
            "contract_type": "permanent",
        }
        result = connector._normalise(job, "gb")
        assert result["location_raw"] == "UK, London"
        assert result["employment_type"] == "full-time"
        assert result["currency"] == "GBP"

    def test_normalise_part_time(self) -> None:
        connector = AdzunaConnector()
        job = {
            "id": "1",
            "title": "Part-time Analyst",
            "company": {"display_name": "Acme"},
            "location": {"display_name": "Paris"},
            "description": "Flexible hours.",
            "redirect_url": "https://www.adzuna.fr/jobs/1",
            "contract_type": "part_time",
        }
        result = connector._normalise(job, "fr")
        assert result["employment_type"] == "part-time"

    def test_is_configured_false_by_default(self) -> None:
        assert AdzunaConnector().is_configured() is False


# ── USA Jobs ───────────────────────────────────────────────────────────────

class TestUsaJobsConnector:
    def test_normalise_extracts_salary_and_location(self) -> None:
        connector = UsaJobsConnector()
        item = {
            "MatchedObjectId": "756234500",
            "MatchedObjectDescriptor": {
                "PositionTitle": "IT Specialist",
                "OrganizationName": "Dept of Defense",
                "PositionLocation": [
                    {
                        "CityName": "Washington",
                        "CountrySubDivisionCode": "DC",
                        "CountryCode": "United States",
                    }
                ],
                "UserArea": {
                    "Details": {"JobSummary": "Critical IT role supporting national security."}
                },
                "PositionRemuneration": [
                    {"MinimumRange": "80000", "MaximumRange": "120000", "CurrencyCode": "USD"}
                ],
                "ApplyURI": ["https://www.usajobs.gov/job/756234500"],
                "PositionURI": "https://www.usajobs.gov/job/756234500",
            },
        }
        result = connector._normalise(item)
        assert result["source_job_id"] == "756234500"
        assert result["title"] == "IT Specialist"
        assert result["salary_min"] == 80000
        assert result["salary_max"] == 120000
        assert "Washington" in result["location_raw"]

    def test_normalise_handles_missing_salary(self) -> None:
        connector = UsaJobsConnector()
        item = {
            "MatchedObjectId": "1",
            "MatchedObjectDescriptor": {
                "PositionTitle": "Analyst",
                "OrganizationName": "FDA",
                "PositionLocation": [],
                "UserArea": {"Details": {}},
                "PositionRemuneration": [],
                "ApplyURI": [],
                "PositionURI": "https://usajobs.gov/job/1",
            },
        }
        result = connector._normalise(item)
        assert result["salary_min"] is None
        assert result["salary_max"] is None

    def test_is_configured_false_by_default(self) -> None:
        assert UsaJobsConnector().is_configured() is False


# ── EURES ──────────────────────────────────────────────────────────────────

class TestEuresConnector:
    def test_always_configured(self) -> None:
        assert EuresConnector().is_configured() is True

    def test_normalise_builds_location_from_parts(self) -> None:
        connector = EuresConnector()
        item = {
            "header": {
                "id": "eures-abc",
                "title": "Cloud Architect",
                "employer": {"name": "EU Agency"},
                "location": {"city": "Brussels", "countryCode": "BE"},
                "applyUrl": "https://eures.ec.europa.eu/apply/eures-abc",
            },
            "jobVacancy": {
                "hrxml": {
                    "positionProfile": {
                        "positionDescription": "Lead cloud infrastructure projects."
                    }
                }
            },
        }
        result = connector._normalise(item)
        assert result["location_raw"] == "Brussels, BE"
        assert result["title"] == "Cloud Architect"
        assert "cloud infrastructure" in result["description"]


# ── SmartRecruiters ────────────────────────────────────────────────────────

class TestSmartRecruitersConnector:
    def test_normalise_strips_html_description(self) -> None:
        connector = SmartRecruitersConnector()
        posting = {
            "id": "sr-posting-1",
            "name": "Marketing Manager",
            "location": {"city": "Amsterdam", "region": "NH", "country": "NL"},
            "jobAd": {
                "sections": {
                    "jobDescription": {"text": "<p>Lead our marketing team.</p>"},
                    "qualifications": {"text": "<p>5+ years experience.</p>"},
                }
            },
            "ref": "https://jobs.smartrecruiters.com/Co/sr-posting-1",
            "applyUrl": "https://jobs.smartrecruiters.com/Co/sr-posting-1#apply",
        }
        result = connector._normalise(posting, "Co")
        assert "<p>" not in result["description"]
        assert "Lead our marketing team" in result["description"]
        assert result["location_raw"] == "Amsterdam, NH, NL"

    def test_is_configured_false_by_default(self) -> None:
        assert SmartRecruitersConnector().is_configured() is False


# ── Workable ───────────────────────────────────────────────────────────────

class TestWorkableConnector:
    def test_normalise_basic(self) -> None:
        connector = WorkableConnector()
        job = {
            "shortcode": "WRK001",
            "title": "DevOps Engineer",
            "location": {"location_str": "Berlin, DE"},
            "employment_type": "full-time",
            "description": {"body": "Build our CI/CD pipelines using Kubernetes and Docker."},
            "url": "https://apply.workable.com/co/j/WRK001",
            "application_url": "https://apply.workable.com/co/j/WRK001/apply",
        }
        result = connector._normalise(job, "co")
        assert result["source_job_id"] == "WRK001"
        assert result["title"] == "DevOps Engineer"
        assert result["location_raw"] == "Berlin, DE"
        assert result["employment_type"] == "full-time"

    def test_is_configured_false_by_default(self) -> None:
        assert WorkableConnector().is_configured() is False
