"""Repository for the locations table."""

from __future__ import annotations

import json
import uuid
from decimal import Decimal
from typing import Any

import structlog
from psycopg import Connection

logger = structlog.get_logger(__name__)


def upsert_location(
    conn: Connection[Any],
    *,
    country_code: str,
    country_name: str,
    city: str,
    latitude: Decimal,
    longitude: Decimal,
    region: str | None = None,
    hierarchy: dict[str, Any] | None = None,
) -> uuid.UUID:
    """Upsert a location by (country_code, region, city).

    The UNIQUE constraint in the DB is on (country_code, region, city).
    We normalise None region to the empty string for consistent matching.
    Returns the row UUID.
    """
    hier = hierarchy or {}
    norm_region = region or ""

    row = conn.execute(
        """
        INSERT INTO locations
            (country_code, country_name, region, city, latitude, longitude, hierarchy)
        VALUES (%s, %s, NULLIF(%s, ''), %s, %s, %s, %s::jsonb)
        ON CONFLICT (country_code, region, city) DO UPDATE SET
            country_name = EXCLUDED.country_name,
            latitude     = EXCLUDED.latitude,
            longitude    = EXCLUDED.longitude,
            hierarchy    = EXCLUDED.hierarchy
        RETURNING id
        """,
        (
            country_code.upper(),
            country_name,
            norm_region,
            city,
            latitude,
            longitude,
            json.dumps(hier),
        ),
    ).fetchone()

    location_id: uuid.UUID = row[0]  # type: ignore[index]
    logger.debug(
        "locations.upserted",
        city=city,
        country_code=country_code,
        id=str(location_id),
    )
    return location_id


def find_location_by_city(
    conn: Connection[Any], *, city: str, country_code: str
) -> uuid.UUID | None:
    """Return the UUID of a location row matching city + country, or None."""
    row = conn.execute(
        "SELECT id FROM locations WHERE city = %s AND country_code = %s LIMIT 1",
        (city, country_code.upper()),
    ).fetchone()
    return uuid.UUID(str(row[0])) if row else None
