"""Tests for the URL liveness checker.

These tests mock httpx to avoid real HTTP requests.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from job_globe_workers.agents.verification.url_checker import (
    _compute_trust_score,
    check_url,
)


class TestComputeTrustScore:
    def test_dead_url_zero_score(self) -> None:
        score = _compute_trust_score(
            is_live=False,
            is_https=True,
            final_domain="greenhouse.io",
            redirect_count=0,
            status_code=404,
        )
        assert score == 0.0

    def test_https_ats_domain_high_score(self) -> None:
        score = _compute_trust_score(
            is_live=True,
            is_https=True,
            final_domain="boards.greenhouse.io",
            redirect_count=0,
            status_code=200,
        )
        assert score >= 0.9

    def test_http_non_ats_lower_score(self) -> None:
        score = _compute_trust_score(
            is_live=True,
            is_https=False,
            final_domain="randomjobsite.com",
            redirect_count=0,
            status_code=200,
        )
        assert score < 0.7

    def test_excessive_redirects_reduce_score(self) -> None:
        score_low_redirects = _compute_trust_score(
            is_live=True,
            is_https=True,
            final_domain="example.com",
            redirect_count=1,
            status_code=200,
        )
        score_high_redirects = _compute_trust_score(
            is_live=True,
            is_https=True,
            final_domain="example.com",
            redirect_count=6,
            status_code=200,
        )
        assert score_high_redirects < score_low_redirects

    def test_score_capped_at_one(self) -> None:
        score = _compute_trust_score(
            is_live=True,
            is_https=True,
            final_domain="greenhouse.io",
            redirect_count=0,
            status_code=200,
        )
        assert score <= 1.0

    def test_score_at_least_zero(self) -> None:
        score = _compute_trust_score(
            is_live=True,
            is_https=False,
            final_domain="unknown.tld",
            redirect_count=10,
            status_code=200,
        )
        assert score >= 0.0


class TestCheckUrl:
    def test_invalid_url_returns_not_live(self) -> None:
        result = check_url("")
        assert result.is_live is False
        assert result.trust_score == 0.0

    def test_non_http_url_returns_not_live(self) -> None:
        result = check_url("ftp://example.com/jobs")
        assert result.is_live is False

    def test_404_returns_not_live(self) -> None:
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.url = "https://example.com/404"
        mock_resp.history = []

        with patch("job_globe_workers.agents.verification.url_checker.httpx.Client") as mock_client:
            instance = mock_client.return_value.__enter__.return_value
            instance.head.return_value = mock_resp
            result = check_url("https://example.com/expired-job")

        assert result.is_live is False

    def test_200_returns_live(self) -> None:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.url = "https://boards.greenhouse.io/acme/jobs/123"
        mock_resp.history = []

        with patch("job_globe_workers.agents.verification.url_checker.httpx.Client") as mock_client:
            instance = mock_client.return_value.__enter__.return_value
            instance.head.return_value = mock_resp
            result = check_url("https://boards.greenhouse.io/acme/jobs/123")

        assert result.is_live is True
        assert result.trust_score > 0.0
