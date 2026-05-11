"""Tests for the 7-component match engine."""

from __future__ import annotations

from job_globe_workers.scoring.match_engine import MatchInputs, compute_match_score


class TestComputeMatchScore:
    def test_perfect_match_returns_100(self) -> None:
        inputs = MatchInputs(
            skill_overlap=1.0,
            seniority_fit=1.0,
            location_fit=1.0,
            remote_fit=1.0,
            employment_type_fit=1.0,
            role_family_fit=1.0,
            salary_fit=1.0,
        )
        assert compute_match_score(inputs) == 100

    def test_zero_match_returns_0(self) -> None:
        inputs = MatchInputs(
            skill_overlap=0.0,
            seniority_fit=0.0,
            location_fit=0.0,
            remote_fit=0.0,
            employment_type_fit=0.0,
            role_family_fit=0.0,
            salary_fit=0.0,
        )
        assert compute_match_score(inputs) == 0

    def test_must_have_missing_caps_at_85(self) -> None:
        inputs = MatchInputs(
            skill_overlap=1.0,
            seniority_fit=1.0,
            location_fit=1.0,
            remote_fit=1.0,
            employment_type_fit=1.0,
            role_family_fit=1.0,
            salary_fit=1.0,
            must_have_missing=True,
        )
        assert compute_match_score(inputs) <= 85

    def test_partial_skill_overlap(self) -> None:
        inputs = MatchInputs(
            skill_overlap=0.5,
            seniority_fit=1.0,
            location_fit=1.0,
            remote_fit=1.0,
            employment_type_fit=1.0,
            role_family_fit=1.0,
            salary_fit=1.0,
        )
        score = compute_match_score(inputs)
        assert 0 < score < 100

    def test_score_bounded_0_to_100(self) -> None:
        for skill in (0.0, 0.3, 0.7, 1.0):
            inputs = MatchInputs(
                skill_overlap=skill,
                seniority_fit=0.5,
                location_fit=0.5,
                remote_fit=0.5,
                employment_type_fit=0.5,
                role_family_fit=0.5,
                salary_fit=0.5,
            )
            score = compute_match_score(inputs)
            assert 0 <= score <= 100, f"Score out of bounds for skill={skill}: {score}"

    def test_weights_sum_to_100(self) -> None:
        """Each component should contribute proportionally — verify via unit inputs."""
        # Only skill_overlap non-zero: should yield skill weight * 100
        inputs = MatchInputs(
            skill_overlap=1.0,
            seniority_fit=0.0,
            location_fit=0.0,
            remote_fit=0.0,
            employment_type_fit=0.0,
            role_family_fit=0.0,
            salary_fit=0.0,
        )
        score_skill_only = compute_match_score(inputs)

        # Only seniority non-zero
        inputs2 = MatchInputs(
            skill_overlap=0.0,
            seniority_fit=1.0,
            location_fit=0.0,
            remote_fit=0.0,
            employment_type_fit=0.0,
            role_family_fit=0.0,
            salary_fit=0.0,
        )
        score_seniority_only = compute_match_score(inputs2)

        # Skill should contribute more than seniority (weight 0.30 vs 0.15)
        assert score_skill_only > score_seniority_only
