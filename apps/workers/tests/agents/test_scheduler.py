"""Tests for the discovery scheduler freshness rules."""

from __future__ import annotations

from datetime import timedelta

from job_globe_workers.agents.discovery.scheduler import DEFAULT_FRESHNESS_RULES


class TestFreshnessRules:
    def test_all_expected_sources_present(self) -> None:
        sources = {rule.source for rule in DEFAULT_FRESHNESS_RULES}
        expected = {
            "greenhouse", "lever", "smartrecruiters", "workable", "usajobs", "eures", "adzuna"
        }
        assert sources == expected

    def test_greenhouse_lever_support_webhooks(self) -> None:
        rule_map = {r.source: r for r in DEFAULT_FRESHNESS_RULES}
        assert rule_map["greenhouse"].supports_webhook is True
        assert rule_map["lever"].supports_webhook is True

    def test_polled_sources_do_not_support_webhook(self) -> None:
        rule_map = {r.source: r for r in DEFAULT_FRESHNESS_RULES}
        for source in ("adzuna", "usajobs", "eures"):
            assert rule_map[source].supports_webhook is False

    def test_webhook_sources_have_shorter_interval(self) -> None:
        rule_map = {r.source: r for r in DEFAULT_FRESHNESS_RULES}
        assert rule_map["greenhouse"].interval <= timedelta(minutes=20)
        assert rule_map["lever"].interval <= timedelta(minutes=20)

    def test_polled_sources_have_at_least_30_min_interval(self) -> None:
        rule_map = {r.source: r for r in DEFAULT_FRESHNESS_RULES}
        for source in ("adzuna", "usajobs", "eures"):
            assert rule_map[source].interval >= timedelta(minutes=30)
