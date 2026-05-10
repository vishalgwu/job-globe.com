"""Tests for the geo mapping / geocoder module."""

from __future__ import annotations

import pytest

from job_globe_workers.agents.geo_mapping.geocoder import geocode


# ── geocode() ──────────────────────────────────────────────────────────────

class TestGeocode:
    def test_known_city_resolves(self) -> None:
        result = geocode("London, UK")
        assert result is not None
        assert result.country_code == "GB"
        assert result.city == "London"
        assert float(result.latitude) == pytest.approx(51.5074, abs=0.01)

    def test_direct_city_key_resolves(self) -> None:
        result = geocode("Berlin")
        assert result is not None
        assert result.country_code == "DE"

    def test_remote_terms_resolve_to_remote(self) -> None:
        for term in ("Remote", "Worldwide", "global", "anywhere"):
            result = geocode(term)
            assert result is not None, f"Expected result for '{term}'"
            assert result.is_remote is True
            assert result.country_code == "ZZ"

    def test_city_country_split(self) -> None:
        result = geocode("Tokyo, Japan")
        assert result is not None
        assert result.country_code == "JP"
        assert result.city == "Tokyo"

    def test_unknown_city_falls_back_to_country(self) -> None:
        result = geocode("Smallville, Canada")
        assert result is not None
        assert result.country_code == "CA"
        # confidence should be lower for country-level fallback
        assert result.confidence < 0.9

    def test_empty_string_returns_none(self) -> None:
        assert geocode("") is None

    def test_truly_unknown_returns_none(self) -> None:
        result = geocode("xyzzy-notaplace-123")
        assert result is None

    def test_new_york_variations(self) -> None:
        for variant in ("New York", "new york city", "New York, NY"):
            result = geocode(variant)
            assert result is not None, f"Expected result for '{variant}'"
            assert result.country_code == "US"

    def test_singapore_as_city_state(self) -> None:
        result = geocode("Singapore")
        assert result is not None
        assert result.country_code == "SG"
