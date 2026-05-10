"""Repository for the companies table."""

from __future__ import annotations

import json
import uuid
from decimal import Decimal
from typing import Any

import structlog
from psycopg import Connection

logger = structlog.get_logger(__name__)


def upsert_company(
    conn: Connection[Any],
    *,
    name: str,
    domain: str | None = None,
    logo_url: str | None = None,
    trust_score: Decimal = Decimal("0"),
    source_metadata: dict[str, Any] | None = None,
) -> uuid.UUID:
    """Upsert a company by domain (or by name when domain is absent).

    Returns the row UUID.
    """
    meta = source_metadata or {}

    if domain:
        row = conn.execute(
            """
            INSERT INTO companies (name, domain, logo_url, trust_score, source_metadata)
            VALUES (%s, %s, %s, %s, %s::jsonb)
            ON CONFLICT (domain) DO UPDATE SET
                name             = EXCLUDED.name,
                logo_url         = COALESCE(EXCLUDED.logo_url, companies.logo_url),
                trust_score      = GREATEST(EXCLUDED.trust_score, companies.trust_score),
                source_metadata  = companies.source_metadata || EXCLUDED.source_metadata,
                updated_at       = now()
            RETURNING id
            """,
            (name, domain, logo_url, trust_score, json.dumps(meta)),
        ).fetchone()
    else:
        # No domain — insert-only; avoid clobbering existing companies with
        # the same name from different sources.
        row = conn.execute(
            """
            INSERT INTO companies (name, logo_url, trust_score, source_metadata)
            VALUES (%s, %s, %s, %s::jsonb)
            ON CONFLICT DO NOTHING
            RETURNING id
            """,
            (name, logo_url, trust_score, json.dumps(meta)),
        ).fetchone()
        if row is None:
            # Row already existed (conflict suppressed); fetch its ID
            row = conn.execute(
                "SELECT id FROM companies WHERE name = %s AND domain IS NULL LIMIT 1",
                (name,),
            ).fetchone()

    company_id: uuid.UUID = row[0]  # type: ignore[index]
    logger.debug("companies.upserted", name=name, domain=domain, id=str(company_id))
    return company_id
