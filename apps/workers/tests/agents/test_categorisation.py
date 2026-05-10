"""Tests for the taxonomy tagger."""

from __future__ import annotations

from job_globe_workers.agents.categorisation.tagger import (
    classify,
    infer_remote_type_from_text,
    infer_seniority_from_title,
)


class TestClassify:
    def test_software_engineering_function(self) -> None:
        matches = classify("Senior Software Engineer", "We need a backend Python developer.")
        functions = {m.value for m in matches if m.category == "function"}
        assert "software-engineering" in functions

    def test_machine_learning_function(self) -> None:
        matches = classify(
            "Machine Learning Engineer", "Deep learning and PyTorch experience required."
        )
        functions = {m.value for m in matches if m.category == "function"}
        assert "machine-learning" in functions

    def test_product_manager_function(self) -> None:
        matches = classify("Product Manager", "Drive roadmap and work with engineering.")
        functions = {m.value for m in matches if m.category == "function"}
        assert "product-management" in functions

    def test_design_function(self) -> None:
        matches = classify("UX Designer", "Create user flows in Figma.")
        functions = {m.value for m in matches if m.category == "function"}
        assert "design" in functions

    def test_senior_seniority(self) -> None:
        matches = classify("Senior Backend Engineer", "")
        seniority = {m.value for m in matches if m.category == "seniority"}
        assert "senior" in seniority

    def test_intern_seniority(self) -> None:
        matches = classify("Software Engineering Intern", "Summer internship programme.")
        seniority = {m.value for m in matches if m.category == "seniority"}
        assert "intern" in seniority

    def test_entry_seniority(self) -> None:
        matches = classify("Junior Data Analyst", "")
        seniority = {m.value for m in matches if m.category == "seniority"}
        assert "entry" in seniority

    def test_remote_detection(self) -> None:
        matches = classify(
            "Software Engineer", "This is a fully remote role. Work from home anywhere."
        )
        remote = {m.value for m in matches if m.category == "remote_type"}
        assert "remote" in remote

    def test_hybrid_detection(self) -> None:
        matches = classify("Data Scientist (Hybrid)", "3 days in office, 2 days remote.")
        remote = {m.value for m in matches if m.category == "remote_type"}
        assert "hybrid" in remote

    def test_contract_employment_type(self) -> None:
        matches = classify("Freelance Designer", "Contract position, 6 months.")
        emp = {m.value for m in matches if m.category == "employment_type"}
        assert "contract" in emp

    def test_confidence_is_in_range(self) -> None:
        matches = classify("Senior Software Engineer", "Python, AWS, backend team.")
        for match in matches:
            assert 0.0 <= match.confidence <= 1.0


class TestInferSeniority:
    def test_senior(self) -> None:
        assert infer_seniority_from_title("Senior Product Manager") == "senior"

    def test_intern(self) -> None:
        assert infer_seniority_from_title("Engineering Intern") == "intern"

    def test_entry(self) -> None:
        assert infer_seniority_from_title("Junior Developer") == "entry"

    def test_unknown(self) -> None:
        assert infer_seniority_from_title("Marketing Associate") == "unknown"

    def test_lead_is_senior(self) -> None:
        assert infer_seniority_from_title("Lead Engineer") == "senior"


class TestInferRemoteType:
    def test_fully_remote(self) -> None:
        result = infer_remote_type_from_text(
            "Software Engineer (Remote)", "Fully remote role, work from home."
        )
        assert result == "remote"

    def test_hybrid(self) -> None:
        result = infer_remote_type_from_text("Data Analyst", "Hybrid — 3 days in office.")
        assert result == "hybrid"

    def test_onsite(self) -> None:
        result = infer_remote_type_from_text("Operations Manager", "On-site position in London.")
        assert result == "onsite"

    def test_unknown_when_no_signal(self) -> None:
        result = infer_remote_type_from_text("Accountant", "Join our finance team.")
        assert result == "unknown"
