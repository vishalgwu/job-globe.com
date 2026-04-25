from job_globe_workers.scoring.match_engine import MatchInputs, compute_match_score


def test_match_score_caps_missing_must_have_skill() -> None:
    score = compute_match_score(MatchInputs(1.0, 1.0, 1.0, must_have_missing=True))
    assert score == 85
