"""Tests for resume parser worker storage key handling."""

from __future__ import annotations

import pytest

from job_globe_workers.agents.resume_parser.worker import (
    _storage_bucket_and_path,
)


def test_storage_key_uses_resumes_bucket_for_current_upload_path() -> None:
    bucket, path = _storage_bucket_and_path("11111111-1111-1111-1111-111111111111/resume.pdf")

    assert bucket == "resumes"
    assert path == "11111111-1111-1111-1111-111111111111/resume.pdf"


def test_storage_key_tolerates_legacy_bucket_prefixed_path() -> None:
    bucket, path = _storage_bucket_and_path(
        "resumes/11111111-1111-1111-1111-111111111111/resume.docx"
    )

    assert bucket == "resumes"
    assert path == "11111111-1111-1111-1111-111111111111/resume.docx"


def test_storage_key_rejects_empty_path() -> None:
    with pytest.raises(ValueError, match="empty"):
        _storage_bucket_and_path(" ")
