"""Shared pytest fixtures for the worker test suite."""

from __future__ import annotations

import sys
import types

import pytest

# ---------------------------------------------------------------------------
# Lightweight stubs for optional heavy dependencies (pymupdf, unstructured).
#
# These packages live under [parsers] in pyproject.toml and are NOT installed
# in CI to avoid heavy native library builds.  The resume_extractor module
# imports them lazily inside if-branches, so tests that patch fitz.open or
# unstructured.partition.docx.partition_docx need the top-level module objects
# to exist in sys.modules before the patch runs.
#
# Production deployments install the real packages via:
#   pip install -e "apps/workers[parsers]"
# ---------------------------------------------------------------------------


def _make_fitz_stub() -> types.ModuleType:
    """Return a minimal fitz stub when PyMuPDF is not installed."""
    mod = types.ModuleType("fitz")

    def _open(*_args: object, **_kwargs: object) -> object:  # pragma: no cover
        raise RuntimeError("Real fitz.open called in test -- use patch('fitz.open')")

    mod.open = _open  # type: ignore[attr-defined]
    return mod


def _make_unstructured_stub() -> None:
    """Inject minimal unstructured namespace stubs when the package is absent."""
    for name in (
        "unstructured",
        "unstructured.partition",
        "unstructured.partition.docx",
    ):
        if name not in sys.modules:
            sys.modules[name] = types.ModuleType(name)

    # Wire child modules as attributes on their parents so that
    # patch("unstructured.partition.docx.partition_docx") can resolve
    # via getattr traversal (unittest.mock._dot_lookup).
    unstructured_mod = sys.modules["unstructured"]
    partition_mod = sys.modules["unstructured.partition"]
    docx_mod = sys.modules["unstructured.partition.docx"]
    if not hasattr(unstructured_mod, "partition"):
        unstructured_mod.partition = partition_mod  # type: ignore[attr-defined]
    if not hasattr(partition_mod, "docx"):
        partition_mod.docx = docx_mod  # type: ignore[attr-defined]

    def _partition_docx(*_args: object, **_kwargs: object) -> list:  # pragma: no cover
        raise RuntimeError(
            "Real partition_docx called in test -- "
            "use patch('unstructured.partition.docx.partition_docx')"
        )

    docx_mod.partition_docx = _partition_docx  # type: ignore[attr-defined]


# Register stubs only when the real packages are absent.
try:
    import fitz  # noqa: F401
except ModuleNotFoundError:
    sys.modules.setdefault("fitz", _make_fitz_stub())

try:
    import unstructured.partition.docx as _unstructured_docx  # noqa: F401
except (AttributeError, ImportError, ModuleNotFoundError):
    _make_unstructured_stub()


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def sample_raw_job() -> dict:
    """A minimal valid raw job dict as produced by a connector."""
    return {
        "source_job_id": "test-123",
        "source_url": "https://boards.greenhouse.io/acme/jobs/123",
        "apply_url": "https://boards.greenhouse.io/acme/jobs/123",
        "title": "Senior Software Engineer",
        "company_name": "Acme Corp",
        "location_raw": "London, UK",
        "description": (
            "We are looking for a senior Python and AWS engineer "
            "to join our backend team. Requirements: 5+ years of "
            "experience, strong Python, AWS, PostgreSQL skills."
        ),
        "employment_type": "full-time",
        "salary_min": 80000,
        "salary_max": 120000,
        "currency": "GBP",
        "required_skills": [],
        "metadata": {},
    }
