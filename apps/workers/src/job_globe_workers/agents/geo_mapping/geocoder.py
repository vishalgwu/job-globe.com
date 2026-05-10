"""Geo mapper -- converts free-text location strings to structured coordinates.

Strategy (in priority order):
  1. Parse the location_raw string into (city, country).
  2. Look up the city in the bundled CITY_CENTROIDS dictionary -- this covers
     ~200 major world cities and is instant with no external API dependency.
  3. Fall back to pycountry country centroid if only a country is found.
  4. If nothing matches, return a None result -- the job is still saved but
     without a location_id.

We deliberately avoid rate-limited geocoding APIs (Nominatim, Google Maps)
in the hot path.  A scheduled enrichment job can backfill unknowns later
using a slower, more accurate API.
"""

from __future__ import annotations

import re
import uuid
from contextlib import AbstractContextManager
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Protocol

import pycountry
import structlog

logger = structlog.get_logger(__name__)

# DB repos imported lazily inside resolve_location() so the geocode()
# function (and tests of it) work without a live DB connection.

# Curated city -> (lat, lon, country_code, country_name)
# Covers ~200 global tech-hiring hubs.  Values are city centroids.
CITY_CENTROIDS: dict[str, tuple[float, float, str, str]] = {
    # North America
    "new york": (40.7128, -74.0060, "US", "United States"),
    "new york city": (40.7128, -74.0060, "US", "United States"),
    "san francisco": (37.7749, -122.4194, "US", "United States"),
    "los angeles": (34.0522, -118.2437, "US", "United States"),
    "chicago": (41.8781, -87.6298, "US", "United States"),
    "seattle": (47.6062, -122.3321, "US", "United States"),
    "austin": (30.2672, -97.7431, "US", "United States"),
    "boston": (42.3601, -71.0589, "US", "United States"),
    "new york, ny": (40.7128, -74.0060, "US", "United States"),
    "denver": (39.7392, -104.9903, "US", "United States"),
    "atlanta": (33.7490, -84.3880, "US", "United States"),
    "miami": (25.7617, -80.1918, "US", "United States"),
    "washington": (38.9072, -77.0369, "US", "United States"),
    "washington dc": (38.9072, -77.0369, "US", "United States"),
    "toronto": (43.6532, -79.3832, "CA", "Canada"),
    "vancouver": (49.2827, -123.1207, "CA", "Canada"),
    "montreal": (45.5017, -73.5673, "CA", "Canada"),
    "calgary": (51.0447, -114.0719, "CA", "Canada"),
    "mexico city": (19.4326, -99.1332, "MX", "Mexico"),
    # Europe
    "london": (51.5074, -0.1278, "GB", "United Kingdom"),
    "manchester": (53.4808, -2.2426, "GB", "United Kingdom"),
    "birmingham": (52.4862, -1.8904, "GB", "United Kingdom"),
    "edinburgh": (55.9533, -3.1883, "GB", "United Kingdom"),
    "glasgow": (55.8642, -4.2518, "GB", "United Kingdom"),
    "dublin": (53.3498, -6.2603, "IE", "Ireland"),
    "paris": (48.8566, 2.3522, "FR", "France"),
    "lyon": (45.7640, 4.8357, "FR", "France"),
    "berlin": (52.5200, 13.4050, "DE", "Germany"),
    "munich": (48.1351, 11.5820, "DE", "Germany"),
    "hamburg": (53.5753, 10.0153, "DE", "Germany"),
    "frankfurt": (50.1109, 8.6821, "DE", "Germany"),
    "cologne": (50.9333, 6.9500, "DE", "Germany"),
    "amsterdam": (52.3676, 4.9041, "NL", "Netherlands"),
    "rotterdam": (51.9244, 4.4777, "NL", "Netherlands"),
    "brussels": (50.8503, 4.3517, "BE", "Belgium"),
    "zurich": (47.3769, 8.5417, "CH", "Switzerland"),
    "geneva": (46.2044, 6.1432, "CH", "Switzerland"),
    "stockholm": (59.3293, 18.0686, "SE", "Sweden"),
    "gothenburg": (57.7089, 11.9746, "SE", "Sweden"),
    "oslo": (59.9139, 10.7522, "NO", "Norway"),
    "copenhagen": (55.6761, 12.5683, "DK", "Denmark"),
    "helsinki": (60.1699, 24.9384, "FI", "Finland"),
    "madrid": (40.4168, -3.7038, "ES", "Spain"),
    "barcelona": (41.3851, 2.1734, "ES", "Spain"),
    "rome": (41.9028, 12.4964, "IT", "Italy"),
    "milan": (45.4654, 9.1859, "IT", "Italy"),
    "vienna": (48.2082, 16.3738, "AT", "Austria"),
    "warsaw": (52.2297, 21.0122, "PL", "Poland"),
    "krakow": (50.0647, 19.9450, "PL", "Poland"),
    "prague": (50.0755, 14.4378, "CZ", "Czech Republic"),
    "budapest": (47.4979, 19.0402, "HU", "Hungary"),
    "bucharest": (44.4268, 26.1025, "RO", "Romania"),
    "sofia": (42.6977, 23.3219, "BG", "Bulgaria"),
    "athens": (37.9838, 23.7275, "GR", "Greece"),
    "lisbon": (38.7223, -9.1393, "PT", "Portugal"),
    "porto": (41.1579, -8.6291, "PT", "Portugal"),
    # Asia Pacific
    "tokyo": (35.6762, 139.6503, "JP", "Japan"),
    "osaka": (34.6937, 135.5023, "JP", "Japan"),
    "beijing": (39.9042, 116.4074, "CN", "China"),
    "shanghai": (31.2304, 121.4737, "CN", "China"),
    "shenzhen": (22.5431, 114.0579, "CN", "China"),
    "guangzhou": (23.1291, 113.2644, "CN", "China"),
    "hong kong": (22.3193, 114.1694, "HK", "Hong Kong"),
    "singapore": (1.3521, 103.8198, "SG", "Singapore"),
    "seoul": (37.5665, 126.9780, "KR", "South Korea"),
    "sydney": (-33.8688, 151.2093, "AU", "Australia"),
    "melbourne": (-37.8136, 144.9631, "AU", "Australia"),
    "brisbane": (-27.4698, 153.0251, "AU", "Australia"),
    "perth": (-31.9505, 115.8605, "AU", "Australia"),
    "auckland": (-36.8485, 174.7633, "NZ", "New Zealand"),
    "mumbai": (19.0760, 72.8777, "IN", "India"),
    "delhi": (28.7041, 77.1025, "IN", "India"),
    "bangalore": (12.9716, 77.5946, "IN", "India"),
    "bengaluru": (12.9716, 77.5946, "IN", "India"),
    "hyderabad": (17.3850, 78.4867, "IN", "India"),
    "chennai": (13.0827, 80.2707, "IN", "India"),
    "pune": (18.5204, 73.8567, "IN", "India"),
    "bangkok": (13.7563, 100.5018, "TH", "Thailand"),
    "jakarta": (-6.2088, 106.8456, "ID", "Indonesia"),
    "kuala lumpur": (3.1390, 101.6869, "MY", "Malaysia"),
    "taipei": (25.0330, 121.5654, "TW", "Taiwan"),
    # Middle East & Africa
    "dubai": (25.2048, 55.2708, "AE", "UAE"),
    "abu dhabi": (24.4539, 54.3773, "AE", "UAE"),
    "riyadh": (24.7136, 46.6753, "SA", "Saudi Arabia"),
    "tel aviv": (32.0853, 34.7818, "IL", "Israel"),
    "cairo": (30.0444, 31.2357, "EG", "Egypt"),
    "nairobi": (-1.2921, 36.8219, "KE", "Kenya"),
    "lagos": (6.5244, 3.3792, "NG", "Nigeria"),
    "johannesburg": (-26.2041, 28.0473, "ZA", "South Africa"),
    "cape town": (-33.9249, 18.4241, "ZA", "South Africa"),
    # Latin America
    "sao paulo": (-23.5505, -46.6333, "BR", "Brazil"),
    "rio de janeiro": (-22.9068, -43.1729, "BR", "Brazil"),
    "buenos aires": (-34.6037, -58.3816, "AR", "Argentina"),
    "bogota": (4.7110, -74.0721, "CO", "Colombia"),
    "santiago": (-33.4489, -70.6693, "CL", "Chile"),
    "lima": (-12.0464, -77.0428, "PE", "Peru"),
    # Remote / global
    "remote": (0.0, 0.0, "ZZ", "Remote"),
    "worldwide": (0.0, 0.0, "ZZ", "Remote"),
    "global": (0.0, 0.0, "ZZ", "Remote"),
}

# Country name -> ISO code lookup for normalisation
_COUNTRY_NAME_TO_CODE: dict[str, str] = {
    c.name.lower(): c.alpha_2 for c in pycountry.countries
}
# Common aliases
_COUNTRY_NAME_TO_CODE.update(
    {
        "usa": "US",
        "united states": "US",
        "us": "US",
        "uk": "GB",
        "u.k.": "GB",
        "england": "GB",
        "uae": "AE",
        "korea": "KR",
        "south korea": "KR",
    }
)

# Country centroids (lat, lon) -- fallback when only country is known
_COUNTRY_CENTROIDS: dict[str, tuple[float, float, str]] = {
    "US": (37.0902, -95.7129, "United States"),
    "GB": (55.3781, -3.4360, "United Kingdom"),
    "DE": (51.1657, 10.4515, "Germany"),
    "FR": (46.2276, 2.2137, "France"),
    "CA": (56.1304, -106.3468, "Canada"),
    "AU": (-25.2744, 133.7751, "Australia"),
    "IN": (20.5937, 78.9629, "India"),
    "SG": (1.3521, 103.8198, "Singapore"),
    "JP": (36.2048, 138.2529, "Japan"),
    "NL": (52.1326, 5.2913, "Netherlands"),
    "SE": (60.1282, 18.6435, "Sweden"),
    "CH": (46.8182, 8.2275, "Switzerland"),
    "IE": (53.4129, -8.2439, "Ireland"),
    "ES": (40.4637, -3.7492, "Spain"),
    "IT": (41.8719, 12.5674, "Italy"),
    "PL": (51.9194, 19.1451, "Poland"),
    "BR": (-14.2350, -51.9253, "Brazil"),
    "MX": (23.6345, -102.5528, "Mexico"),
}


class ConnectionPoolLike(Protocol):
    def connection(self) -> AbstractContextManager[Any]:
        ...


@dataclass
class GeoResult:
    country_code: str
    country_name: str
    city: str
    latitude: Decimal
    longitude: Decimal
    region: str | None = None
    is_remote: bool = False
    confidence: float = 1.0


def _normalise_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().strip())


def _parse_location_string(location_raw: str) -> tuple[str, str]:
    """Split 'City, Country' into (city_part, country_part).

    Handles formats like:
      "London, UK"
      "Berlin, Germany"
      "San Francisco, CA"
      "Remote"
    """
    parts = [p.strip() for p in location_raw.split(",")]
    if len(parts) >= 2:
        return parts[0], parts[-1]
    return parts[0], ""


def geocode(location_raw: str) -> GeoResult | None:
    """Resolve a free-text location string to structured geo data.

    Returns None if the string cannot be resolved to any known location.
    """
    if not location_raw:
        return None

    normalised = _normalise_text(location_raw)

    # Check remote/global first
    for remote_term in ("remote", "worldwide", "global", "anywhere", "distributed"):
        if remote_term in normalised:
            return GeoResult(
                country_code="ZZ",
                country_name="Remote",
                city="Remote",
                latitude=Decimal("0"),
                longitude=Decimal("0"),
                is_remote=True,
                confidence=0.9,
            )

    # Direct city lookup
    if normalised in CITY_CENTROIDS:
        lat, lon, cc, cn = CITY_CENTROIDS[normalised]
        return GeoResult(
            country_code=cc,
            country_name=cn,
            city=_title_case(location_raw.split(",")[0].strip()),
            latitude=Decimal(str(lat)),
            longitude=Decimal(str(lon)),
            confidence=1.0,
        )

    # Try "City, Country" split
    city_part, country_part = _parse_location_string(location_raw)
    city_key = _normalise_text(city_part)

    if city_key in CITY_CENTROIDS:
        lat, lon, cc, cn = CITY_CENTROIDS[city_key]
        return GeoResult(
            country_code=cc,
            country_name=cn,
            city=_title_case(city_part),
            latitude=Decimal(str(lat)),
            longitude=Decimal(str(lon)),
            confidence=0.95,
        )

    # Fall back to country centroid
    country_key = _normalise_text(country_part)
    country_code = _COUNTRY_NAME_TO_CODE.get(country_key)
    if country_code and country_code in _COUNTRY_CENTROIDS:
        lat, lon, cn = _COUNTRY_CENTROIDS[country_code]
        return GeoResult(
            country_code=country_code,
            country_name=cn,
            city=_title_case(city_part) if city_part else cn,
            latitude=Decimal(str(lat)),
            longitude=Decimal(str(lon)),
            confidence=0.6,
        )

    # Try pycountry lookup (only when we have a non-trivial country string)
    if not country_part or len(country_part) < 2:
        logger.debug("geocoder.unresolved", location_raw=location_raw)
        return None
    try:
        country = pycountry.countries.search_fuzzy(country_part)[0]
        cc = country.alpha_2
        cn = country.name
        if cc in _COUNTRY_CENTROIDS:
            lat, lon, _ = _COUNTRY_CENTROIDS[cc]
            return GeoResult(
                country_code=cc,
                country_name=cn,
                city=_title_case(city_part) if city_part else cn,
                latitude=Decimal(str(lat)),
                longitude=Decimal(str(lon)),
                confidence=0.5,
            )
    except (LookupError, Exception):  # noqa: BLE001
        pass

    logger.debug("geocoder.unresolved", location_raw=location_raw)
    return None


def _title_case(text: str) -> str:
    return " ".join(w.capitalize() for w in text.split())


def resolve_location(
    location_raw: str, pool: ConnectionPoolLike | None = None
) -> uuid.UUID | None:
    """Geocode a location string and upsert into the locations table.

    Returns the location UUID, or None if geocoding fails.
    """
    from job_globe_workers.db.repositories.locations import (
        find_location_by_city,
        upsert_location,
    )

    if pool is None:
        from job_globe_workers.db.connection import get_pool as _get_pool

        pool = _get_pool()

    result = geocode(location_raw)
    if result is None:
        return None

    hierarchy = {
        "country": result.country_name,
        "country_code": result.country_code,
        "city": result.city,
        "is_remote": result.is_remote,
        "confidence": result.confidence,
    }
    if result.region:
        hierarchy["region"] = result.region

    with pool.connection() as conn:
        # Check cache first to avoid unnecessary upserts
        existing = find_location_by_city(
            conn, city=result.city, country_code=result.country_code
        )
        if existing:
            return existing

        location_id = upsert_location(
            conn,
            country_code=result.country_code,
            country_name=result.country_name,
            city=result.city,
            latitude=result.latitude,
            longitude=result.longitude,
            region=result.region,
            hierarchy=hierarchy,
        )
        conn.commit()
        return location_id
