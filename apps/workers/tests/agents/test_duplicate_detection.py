"""Tests for duplicate detection and skill extraction."""

from __future__ import annotations

from job_globe_workers.agents.duplicate_detection.detector import (
    compute_fingerprint,
    extract_skills,
)


class TestExtractSkills:
    def test_extracts_python_and_aws(self) -> None:
        text = "We need a Python developer with AWS experience and PostgreSQL knowledge."
        skills = extract_skills(text)
        assert "python" in skills
        assert "aws" in skills
        assert "postgresql" in skills

    def test_deduplicates(self) -> None:
        text = "python Python PYTHON"
        skills = extract_skills(text)
        assert skills.count("python") == 1

    def test_returns_sorted_list(self) -> None:
        text = "typescript react python go"
        skills = extract_skills(text)
        assert skills == sorted(skills)

    def test_empty_text(self) -> None:
        assert extract_skills("") == []

    def test_extracts_docker_kubernetes(self) -> None:
        text = "Experience with Docker and Kubernetes required. CI/CD pipeline knowledge a plus."
        skills = extract_skills(text)
        assert "docker" in skills
        assert "kubernetes" in skills

    def test_multi_word_skill(self) -> None:
        text = "Build machine learning models using scikit-learn and TensorFlow."
        skills = extract_skills(text)
        assert "scikit-learn" in skills
        assert "tensorflow" in skills


class TestComputeFingerprint:
    def test_same_inputs_same_fingerprint(self) -> None:
        fp1 = compute_fingerprint(title="Engineer", company_name="Acme", city="London")
        fp2 = compute_fingerprint(title="Engineer", company_name="Acme", city="London")
        assert fp1 == fp2

    def test_different_titles_different_fingerprints(self) -> None:
        fp1 = compute_fingerprint(title="Backend Engineer", company_name="Acme", city="London")
        fp2 = compute_fingerprint(title="Frontend Engineer", company_name="Acme", city="London")
        assert fp1 != fp2

    def test_case_insensitive(self) -> None:
        fp1 = compute_fingerprint(title="SENIOR ENGINEER", company_name="ACME", city="LONDON")
        fp2 = compute_fingerprint(title="senior engineer", company_name="acme", city="london")
        assert fp1 == fp2

    def test_fingerprint_is_16_chars(self) -> None:
        fp = compute_fingerprint(title="X", company_name="Y", city="Z")
        assert len(fp) == 16

    def test_different_companies_different_fingerprints(self) -> None:
        fp1 = compute_fingerprint(title="Engineer", company_name="Acme", city="London")
        fp2 = compute_fingerprint(title="Engineer", company_name="Beta", city="London")
        assert fp1 != fp2
