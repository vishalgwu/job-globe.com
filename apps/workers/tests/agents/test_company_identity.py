"""Tests for the company identity resolver."""

from __future__ import annotations

from decimal import Decimal

from job_globe_workers.agents.company_identity.resolver import (
    _extract_domain,
    _is_trusted_ats,
    compute_trust_score,
)


class TestExtractDomain:
    def test_greenhouse_url(self) -> None:
        assert (
            _extract_domain("https://boards.greenhouse.io/acme/jobs/123") == "boards.greenhouse.io"
        )

    def test_strips_www(self) -> None:
        assert _extract_domain("https://www.lever.co/company/jobs") == "lever.co"

    def test_empty_url_returns_none(self) -> None:
        assert _extract_domain("") is None

    def test_plain_string_returns_none(self) -> None:
        assert _extract_domain("not-a-url") is None

    def test_strips_port(self) -> None:
        domain = _extract_domain("http://example.com:8080/jobs/1")
        assert domain == "example.com"


class TestIsTrustedAts:
    def test_greenhouse_is_trusted(self) -> None:
        assert _is_trusted_ats("boards.greenhouse.io") is True

    def test_lever_is_trusted(self) -> None:
        assert _is_trusted_ats("jobs.lever.co") is True

    def test_random_domain_not_trusted(self) -> None:
        assert _is_trusted_ats("randomboard.com") is False

    def test_usajobs_trusted(self) -> None:
        assert _is_trusted_ats("www.usajobs.gov") is True


class TestComputeTrustScore:
    def test_https_ats_gets_high_score(self) -> None:
        score = compute_trust_score(
            apply_url="https://boards.greenhouse.io/co/jobs/1",
            domain="boards.greenhouse.io",
            verification_trust=0.9,
            has_logo=True,
        )
        assert score >= Decimal("0.9")

    def test_http_unknown_domain_low_score(self) -> None:
        score = compute_trust_score(
            apply_url="http://smallboard.io/jobs/1",
            domain="smallboard.io",
            verification_trust=0.0,
            has_logo=False,
        )
        assert score < Decimal("0.5")

    def test_score_between_zero_and_one(self) -> None:
        for apply_url, domain, trust, logo in [
            ("https://greenhouse.io/job/1", "greenhouse.io", 1.0, True),
            ("http://example.com/job", "example.com", 0.0, False),
            ("https://lever.co/co/123", "lever.co", 0.5, False),
        ]:
            score = compute_trust_score(
                apply_url=apply_url,
                domain=domain,
                verification_trust=trust,
                has_logo=logo,
            )
            assert Decimal("0") <= score <= Decimal("1"), f"Score out of range for {apply_url}"
