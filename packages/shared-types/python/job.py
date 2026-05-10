"""Pydantic contracts for raw and canonical job records.

These mirror the DB schema in packages/database/migrations/005_jobs_raw_and_canonical.sql
and are the authoritative Python types shared between the worker plane modules.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class RemoteType(str, Enum):
    onsite = "onsite"
    hybrid = "hybrid"
    remote = "remote"
    unknown = "unknown"


class JobStatus(str, Enum):
    active = "active"
    expired = "expired"
    duplicate = "duplicate"


class RawJobEvent(BaseModel):
    """Event payload published to the discovery Redis stream.

    Every connector produces one RawJobEvent per job posting.
    The payload field carries the full, unmodified source response so
    downstream workers can re-parse without re-fetching.
    """

    source: str
    source_job_id: str
    source_url: str
    apply_url: str
    title: str
    company_name: str
    location_raw: str          # free-text from source e.g. "London, UK"
    description: str
    salary_min: int | None = None
    salary_max: int | None = None
    currency: str = "USD"
    employment_type: str = "full-time"
    remote_type: RemoteType = RemoteType.unknown
    required_skills: list[str] = Field(default_factory=list)
    payload: dict[str, Any] = Field(default_factory=dict)
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


class RawJobRecord(BaseModel):
    """Row in the jobs_raw table after persistence."""

    id: uuid.UUID
    source: str
    source_job_id: str
    source_url: str
    payload: dict[str, Any]
    fetched_at: datetime
    verified_live_at: datetime | None = None


class CanonicalJob(BaseModel):
    """Row in the jobs_canonical table."""

    id: uuid.UUID
    raw_job_id: uuid.UUID | None = None
    company_id: uuid.UUID | None = None
    location_id: uuid.UUID | None = None
    title: str
    description: str
    employment_type: str = "full-time"
    remote_type: RemoteType = RemoteType.unknown
    seniority: str = "unknown"
    apply_url: str
    salary_min: int | None = None
    salary_max: int | None = None
    currency: str = "USD"
    required_skills: list[str] = Field(default_factory=list)
    status: JobStatus = JobStatus.active
    first_seen_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime | None = None
