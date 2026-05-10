"""Taxonomy tagger — classifies jobs by function, seniority, remote_type, employment_type.

Rule-based classification using keyword matching against:
  1. The job title (higher weight).
  2. The job description (lower weight, used to disambiguate).

Matches are scored by how specifically the keyword identifies the category.
The tagger returns a list of (category, value, confidence) tuples.

A separate function writes the taxonomy links to the DB.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass

import structlog

logger = structlog.get_logger(__name__)


@dataclass(frozen=True)
class TaxonomyMatch:
    category: str
    value: str
    confidence: float


# ── Rule tables ────────────────────────────────────────────────────────────
# Structure: {taxonomy_value: [patterns]}
# Patterns are matched case-insensitively against title (then description).

_FUNCTION_RULES: dict[str, list[str]] = {
    "software-engineering": [
        r"\bsoftware engineer",
        r"\bbackend\b",
        r"\bfrontend\b",
        r"\bfull[ -]stack\b",
        r"\bweb developer",
        r"\bmobile developer",
        r"\bios developer",
        r"\bandroid developer",
        r"\bpython developer",
        r"\bjava developer",
        r"\bdevops\b",
        r"\bplatform engineer",
        r"\bsite reliability",
        r"\bsre\b",
        r"\bcloud engineer",
        r"\binfrastructure engineer",
    ],
    "data-analytics": [
        r"\bdata analyst",
        r"\bbusiness analyst",
        r"\bdata engineer",
        r"\banalytic",
        r"\bbusiness intelligence",
        r"\b\bpower bi\b",
        r"\btableau\b",
        r"\bsql analyst",
    ],
    "machine-learning": [
        r"\bmachine learning",
        r"\bml engineer",
        r"\bai engineer",
        r"\bdeep learning",
        r"\bdata scientist",
        r"\bllm\b",
        r"\bnatural language",
        r"\bcomputer vision",
        r"\bapplied scientist",
    ],
    "product-management": [
        r"\bproduct manager",
        r"\bproduct owner",
        r"\b\bpm\b",
        r"\bgroup product",
        r"\bvp of product",
        r"\bhead of product",
        r"\bproduct lead",
    ],
    "design": [
        r"\bux\b",
        r"\bui\b",
        r"\bux/ui\b",
        r"\bdesigner\b",
        r"\bproduct designer",
        r"\bvisual designer",
        r"\bgraphic designer",
        r"\bcreative director",
        r"\binteraction designer",
    ],
    "security": [
        r"\bsecurity engineer",
        r"\bcybersecurity",
        r"\bappsec\b",
        r"\bpenetration test",
        r"\bsoc analyst",
        r"\binformation security",
        r"\bdevsecops",
    ],
    "operations": [
        r"\boperations manager",
        r"\boperations analyst",
        r"\bops manager",
        r"\bsupply chain",
        r"\blogistics\b",
        r"\bprocurement\b",
        r"\bscrum master",
        r"\bagile coach",
    ],
    "sales": [
        r"\bsales\b",
        r"\baccount executive",
        r"\baccount manager",
        r"\bbusiness development",
        r"\bsdr\b",
        r"\bbdr\b",
        r"\bsales engineer",
    ],
}

_SENIORITY_RULES: dict[str, list[str]] = {
    "intern": [
        r"\bintern\b",
        r"\bplacement\b",
        r"\bco-?op\b",
        r"\btrainee\b",
        r"\bapprentice\b",
    ],
    "entry": [
        r"\bjunior\b",
        r"\bentry[ -]level",
        r"\bnew grad",
        r"\bgraduate\b",
        r"\brecent grad",
    ],
    "mid": [
        r"\bmid[ -]level",
        r"\bexperienced\b",
        r"\b2[\+ ]years",
        r"\b3[\+ ]years",
    ],
    "senior": [
        r"\bsenior\b",
        r"\bstaff\b",
        r"\bprincipal\b",
        r"\blead\b",
        r"\barchitect\b",
        r"\bhead of\b",
        r"\bdirector\b",
        r"\bvp\b",
        r"\bvice president",
        r"\b5[\+ ]years",
        r"\b8[\+ ]years",
        r"\b10[\+ ]years",
    ],
}

_REMOTE_TYPE_RULES: dict[str, list[str]] = {
    "remote": [
        r"\bfully remote\b",
        r"\b100%\s*remote\b",
        r"\bwork from home\b",
        r"\bwfh\b",
        r"\banywhere\b",
        r"\bremote[ -]first\b",
        r"\bremote only\b",
    ],
    "hybrid": [
        r"\bhybrid\b",
        r"\bpartially remote\b",
        r"\bflexible location\b",
        r"\bin[ -]office.*remote",
        r"\bremote.*in[ -]office",
    ],
    "onsite": [
        r"\bon[ -]?site\b",
        r"\bin[ -]office\b",
        r"\bin person\b",
        r"\bon[ -]?premise",
    ],
}

_EMPLOYMENT_TYPE_RULES: dict[str, list[str]] = {
    "contract": [
        r"\bcontract\b",
        r"\bfreelance\b",
        r"\bconsulting\b",
        r"\b1099\b",
        r"\bindependent contractor",
    ],
    "part-time": [
        r"\bpart[ -]time\b",
        r"\bpart time\b",
    ],
    "full-time": [
        r"\bfull[ -]time\b",
        r"\bpermanent\b",
        r"\brendered\b",
    ],
}


def _match(text: str, rules: dict[str, list[str]]) -> list[tuple[str, float]]:
    """Return (value, confidence) pairs for all rules that match text."""
    results: list[tuple[str, float]] = []
    lower = text.lower()
    for value, patterns in rules.items():
        for pattern in patterns:
            if re.search(pattern, lower):
                # More specific patterns get higher base confidence
                specificity = min(len(pattern) / 30, 1.0)
                results.append((value, round(0.7 + specificity * 0.3, 4)))
                break  # first matching pattern wins; stop checking this value
    return results


def classify(title: str, description: str) -> list[TaxonomyMatch]:
    """Return taxonomy matches for a job.

    Title matches are given 1.0× confidence; description-only matches 0.7×.
    """
    matches: list[TaxonomyMatch] = []

    for category, rules in [
        ("function", _FUNCTION_RULES),
        ("seniority", _SENIORITY_RULES),
        ("remote_type", _REMOTE_TYPE_RULES),
        ("employment_type", _EMPLOYMENT_TYPE_RULES),
    ]:
        seen: dict[str, float] = {}

        # Title matches — high confidence
        for value, conf in _match(title, rules):
            seen[value] = conf

        # Description matches — only if title gave no signal
        if not seen:
            for value, conf in _match(description[:2000], rules):
                if value not in seen:
                    seen[value] = round(conf * 0.7, 4)

        for value, conf in seen.items():
            matches.append(TaxonomyMatch(category=category, value=value, confidence=conf))

    return matches


def infer_seniority_from_title(title: str) -> str:
    """Return a seniority string for direct use in jobs_canonical.seniority.

    Uses the same rules as classify() but returns a single string.
    """
    title_lower = title.lower()
    if any(re.search(p, title_lower) for p in _SENIORITY_RULES["intern"]):
        return "intern"
    if any(re.search(p, title_lower) for p in _SENIORITY_RULES["entry"]):
        return "entry"
    if any(re.search(p, title_lower) for p in _SENIORITY_RULES["senior"]):
        return "senior"
    if any(re.search(p, title_lower) for p in _SENIORITY_RULES["mid"]):
        return "mid"
    return "unknown"


def infer_remote_type_from_text(title: str, description: str) -> str:
    """Return a remote_type string for direct use in jobs_canonical."""
    combined = title + " " + description[:500]
    lower = combined.lower()
    for remote_type, patterns in _REMOTE_TYPE_RULES.items():
        if any(re.search(p, lower) for p in patterns):
            return remote_type
    return "unknown"


def write_taxonomy_links(
    conn: object,  # type: ignore[type-arg]
    *,
    job_id: uuid.UUID,
    matches: list[TaxonomyMatch],
    taxonomy_index: dict[str, dict[str, uuid.UUID]],
) -> int:
    """Write job_taxonomy_links for all matched taxonomy entries.

    taxonomy_index is {category: {value/synonym: taxonomy_uuid}}.
    Returns the count of links written.
    """
    from job_globe_workers.db.repositories.taxonomy import link_taxonomy

    written = 0
    for match in matches:
        cat_index = taxonomy_index.get(match.category, {})
        taxonomy_id = cat_index.get(match.value)
        if taxonomy_id is None:
            logger.debug(
                "tagger.taxonomy_not_found",
                category=match.category,
                value=match.value,
            )
            continue
        link_taxonomy(conn, job_id=job_id, taxonomy_id=taxonomy_id, confidence=match.confidence)  # type: ignore[arg-type]
        written += 1
    return written
