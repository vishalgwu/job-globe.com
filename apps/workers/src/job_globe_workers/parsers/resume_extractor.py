"""Resume text extraction and structured profile parsing.

Supports .txt, .pdf (via PyMuPDF/fitz), and .docx (via unstructured).
Structured extraction uses OpenAI chat completions to produce a typed
profile dict with per-key confidence scores.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import structlog
from openai import OpenAI  # type: ignore[import-untyped]

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------


def extract_resume_text(path: Path) -> str:
    """Extract plain text from a resume file.

    Supported extensions: .txt, .pdf, .docx
    Raises ValueError for unsupported extensions.
    """
    suffix = path.suffix.lower()

    if suffix == ".txt":
        return path.read_text(encoding="utf-8")

    if suffix == ".pdf":
        import fitz  # type: ignore[import-not-found, import-untyped]  # PyMuPDF

        doc: Any = fitz.open(str(path))
        pages: list[str] = []
        for page in doc:
            pages.append(page.get_text())
        doc.close()
        return "\n".join(pages)

    if suffix == ".docx":
        from unstructured.partition.docx import (
            partition_docx,  # type: ignore[import-not-found, import-untyped]
        )

        elements = partition_docx(filename=str(path))
        return "\n".join(str(el) for el in elements if str(el).strip())

    raise ValueError(
        f"Unsupported resume file extension '{suffix}'. "
        "Supported formats: .txt, .pdf, .docx"
    )


# ---------------------------------------------------------------------------
# Structured profile extraction
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a resume parsing assistant. Given the text of a resume, extract the
following information and return ONLY a JSON object — no markdown fences, no
extra prose.

Required JSON shape:
{
  "name": "<full name or null>",
  "email": "<email address or null>",
  "skills": ["<skill>", ...],
  "years_experience": <integer or null>,
  "desired_role": "<desired job title or null>",
  "seniority": "<one of: junior | mid | senior | lead | unknown>",
  "locations": ["<city, country>", ...],
  "education": [
    {"degree": "<degree>", "field": "<field of study>", "institution": "<institution name>"}
  ],
  "summary": "<2-3 sentence professional summary or null>"
}

Rules:
- skills: normalise to lowercase, deduplicate, omit generic terms like "microsoft office"
  unless clearly relevant.
- years_experience: infer from work history dates; null if not determinable.
- seniority: infer from titles and years_experience.
- locations: list each distinct location mentioned (current + previous cities/countries).
- education: include all degrees in reverse-chronological order.
- summary: synthesise from the resume; do not copy verbatim.
- If a field cannot be determined, use null (or [] for arrays).
"""


def _score_confidence(profile: dict[str, Any]) -> dict[str, float]:
    """Return per-key confidence scores (0.0-1.0) based on data completeness."""
    scores: dict[str, float] = {}

    # name
    scores["name"] = 1.0 if profile.get("name") else 0.0

    # email — validate format
    email = profile.get("email") or ""
    scores["email"] = (
        1.0 if re.match(r"[^@]+@[^@]+\.[^@]+", email) else 0.0
    )

    # skills — more skills -> higher confidence, cap at 1.0
    skills = profile.get("skills") or []
    scores["skills"] = min(1.0, len(skills) / 5.0) if skills else 0.0

    # years_experience
    yoe = profile.get("years_experience")
    scores["years_experience"] = 1.0 if isinstance(yoe, int) and yoe >= 0 else 0.3

    # desired_role
    scores["desired_role"] = 0.9 if profile.get("desired_role") else 0.1

    # seniority
    seniority = profile.get("seniority", "unknown")
    scores["seniority"] = 0.5 if seniority == "unknown" else 1.0

    # locations
    locations = profile.get("locations") or []
    scores["locations"] = min(1.0, len(locations) / 2.0) if locations else 0.0

    # education
    education = profile.get("education") or []
    scores["education"] = min(1.0, len(education) / 2.0) if education else 0.0

    # summary
    summary = profile.get("summary") or ""
    scores["summary"] = min(1.0, len(summary) / 100.0) if summary else 0.0

    return scores


def extract_structured_profile(
    text: str,
    openai_api_key: str,
    model: str = "gpt-4o-mini",
) -> dict[str, Any]:
    """Call OpenAI to extract a structured profile from resume text.

    Returns the profile dict plus a 'confidence' key with per-field scores.
    Handles JSON parse errors gracefully by returning partial/empty fields.
    """
    client = OpenAI(api_key=openai_api_key)

    # Truncate to avoid token limits (~12k chars ~= ~3k tokens)
    truncated_text = text[:12_000]

    empty_profile: dict[str, Any] = {
        "name": None,
        "email": None,
        "skills": [],
        "years_experience": None,
        "desired_role": None,
        "seniority": "unknown",
        "locations": [],
        "education": [],
        "summary": None,
    }

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": truncated_text},
            ],
            temperature=0.0,
            max_tokens=1024,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("resume_extractor.openai_call_failed", error=str(exc))
        empty_profile["confidence"] = _score_confidence(empty_profile)
        return empty_profile

    raw_content = (response.choices[0].message.content or "").strip()

    # Strip accidental markdown code fences
    raw_content = re.sub(r"^```(?:json)?\s*", "", raw_content)
    raw_content = re.sub(r"\s*```$", "", raw_content)

    profile: dict[str, Any]
    try:
        profile = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        logger.warning(
            "resume_extractor.json_parse_failed",
            error=str(exc),
            raw_snippet=raw_content[:200],
        )
        # Best-effort: look for a JSON object substring
        match = re.search(r"\{.*\}", raw_content, re.DOTALL)
        if match:
            try:
                profile = json.loads(match.group())
            except json.JSONDecodeError:
                profile = dict(empty_profile)
        else:
            profile = dict(empty_profile)

    # Ensure all expected keys exist with sensible defaults
    for key, default in empty_profile.items():
        if key not in profile:
            profile[key] = default

    # Normalise types
    if not isinstance(profile.get("skills"), list):
        profile["skills"] = []
    if not isinstance(profile.get("locations"), list):
        profile["locations"] = []
    if not isinstance(profile.get("education"), list):
        profile["education"] = []
    if profile.get("seniority") not in ("junior", "mid", "senior", "lead", "unknown"):
        profile["seniority"] = "unknown"

    profile["confidence"] = _score_confidence(profile)
    return profile
