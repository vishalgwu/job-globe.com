"""Tests for resume_extractor — offline, no real files or API calls."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from job_globe_workers.parsers.resume_extractor import (
    _score_confidence,
    extract_resume_text,
    extract_structured_profile,
)

# ── extract_resume_text ────────────────────────────────────────────────────

class TestExtractResumeText:
    def test_txt_returns_content(self, tmp_path: Path) -> None:
        p = tmp_path / "cv.txt"
        p.write_text("Alice Smith\nPython Developer", encoding="utf-8")
        assert extract_resume_text(p) == "Alice Smith\nPython Developer"

    def test_unsupported_extension_raises(self, tmp_path: Path) -> None:
        p = tmp_path / "cv.rtf"
        p.write_text("irrelevant", encoding="utf-8")
        with pytest.raises(ValueError, match="Unsupported"):
            extract_resume_text(p)

    def test_pdf_calls_fitz(self, tmp_path: Path) -> None:
        p = tmp_path / "cv.pdf"
        p.write_bytes(b"%PDF-1.4 fake")
        mock_page = MagicMock()
        mock_page.get_text.return_value = "page text"
        mock_doc = MagicMock()
        mock_doc.__iter__ = MagicMock(return_value=iter([mock_page]))

        with patch("fitz.open", return_value=mock_doc):
            text = extract_resume_text(p)

        assert "page text" in text

    def test_docx_calls_unstructured(self, tmp_path: Path) -> None:
        p = tmp_path / "cv.docx"
        p.write_bytes(b"PK fake docx")
        mock_element = MagicMock()
        mock_element.__str__ = MagicMock(return_value="Name: Bob")

        with patch(
            "unstructured.partition.docx.partition_docx",
            return_value=[mock_element],
        ):
            text = extract_resume_text(p)

        assert "Name: Bob" in text


# ── _score_confidence ──────────────────────────────────────────────────────

class TestScoreConfidence:
    def test_full_profile_has_high_scores(self) -> None:
        profile = {
            "name": "Alice Smith",
            "email": "alice@example.com",
            "skills": ["python", "django", "postgres", "docker", "redis"],
            "years_experience": 5,
            "desired_role": "Backend Engineer",
            "seniority": "senior",
            "locations": ["London, UK", "Berlin, DE"],
            "education": [{"degree": "BSc", "field": "CS", "institution": "MIT"}],
            "summary": "Experienced backend engineer with 5 years building distributed systems.",
        }
        scores = _score_confidence(profile)
        for key, score in scores.items():
            assert 0.0 <= score <= 1.0, f"{key} score out of range: {score}"
        assert scores["name"] == 1.0
        assert scores["email"] == 1.0
        assert scores["seniority"] == 1.0

    def test_empty_profile_has_low_scores(self) -> None:
        profile = {
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
        scores = _score_confidence(profile)
        assert scores["name"] == 0.0
        assert scores["email"] == 0.0
        assert scores["skills"] == 0.0

    def test_invalid_email_scores_zero(self) -> None:
        profile = {
            "name": "Bob", "email": "not-an-email", "skills": [],
            "years_experience": None, "desired_role": None, "seniority": "unknown",
            "locations": [], "education": [], "summary": None,
        }
        scores = _score_confidence(profile)
        assert scores["email"] == 0.0


# ── extract_structured_profile ─────────────────────────────────────────────

class TestExtractStructuredProfile:
    def _make_response(self, content: str) -> MagicMock:
        choice = MagicMock()
        choice.message.content = content
        resp = MagicMock()
        resp.choices = [choice]
        return resp

    def test_valid_json_response_parsed(self) -> None:
        payload = {
            "name": "Alice", "email": "alice@example.com",
            "skills": ["python"], "years_experience": 3,
            "desired_role": "Engineer", "seniority": "mid",
            "locations": ["NYC"], "education": [], "summary": "A summary.",
        }
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = self._make_response(
            json.dumps(payload)
        )

        with patch("job_globe_workers.parsers.resume_extractor.OpenAI", return_value=mock_client):
            result = extract_structured_profile("resume text", "fake-key")

        assert result["name"] == "Alice"
        assert result["seniority"] == "mid"
        assert "confidence" in result

    def test_markdown_fences_stripped(self) -> None:
        payload = {"name": "Bob", "email": None, "skills": [], "years_experience": None,
                   "desired_role": None, "seniority": "unknown", "locations": [],
                   "education": [], "summary": None}
        fenced = f"```json\n{json.dumps(payload)}\n```"
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = self._make_response(fenced)

        with patch("job_globe_workers.parsers.resume_extractor.OpenAI", return_value=mock_client):
            result = extract_structured_profile("text", "key")

        assert result["name"] == "Bob"

    def test_invalid_json_returns_empty_profile(self) -> None:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = self._make_response(
            "not json at all"
        )

        with patch("job_globe_workers.parsers.resume_extractor.OpenAI", return_value=mock_client):
            result = extract_structured_profile("text", "key")

        assert result["skills"] == []
        assert result["seniority"] == "unknown"
        assert "confidence" in result

    def test_openai_failure_returns_empty_profile(self) -> None:
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = RuntimeError("API down")

        with patch("job_globe_workers.parsers.resume_extractor.OpenAI", return_value=mock_client):
            result = extract_structured_profile("text", "key")

        assert result["name"] is None
        assert result["confidence"]["name"] == 0.0
