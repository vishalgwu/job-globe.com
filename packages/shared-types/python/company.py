"""Pydantic contracts for company records.

Mirrors packages/database/migrations/003_companies.sql.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class Company(BaseModel):
    """Row in the companies table."""

    id: uuid.UUID
    name: str
    domain: str | None = None
    logo_url: str | None = None
    trust_score: Decimal = Decimal("0")
    source_metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CompanyInput(BaseModel):
    """Value object used by the company identity resolver before a DB row exists."""

    name: str
    domain: str | None = None
    logo_url: str | None = None
    trust_score: Decimal = Decimal("0")
    source_metadata: dict[str, Any] = Field(default_factory=dict)
