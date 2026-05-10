"""Pydantic contracts for location records.

Mirrors packages/database/migrations/004_locations.sql.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class Location(BaseModel):
    """Row in the locations table."""

    id: uuid.UUID
    country_code: str        # ISO 3166-1 alpha-2
    country_name: str
    region: str | None = None
    city: str
    latitude: Decimal
    longitude: Decimal
    hierarchy: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LocationInput(BaseModel):
    """Value object used by the geo mapper before a DB row exists."""

    country_code: str
    country_name: str
    region: str | None = None
    city: str
    latitude: Decimal
    longitude: Decimal
    hierarchy: dict[str, Any] = Field(default_factory=dict)
