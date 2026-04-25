from dataclasses import dataclass


@dataclass(frozen=True)
class MatchInputs:
    skill_overlap: float
    seniority_fit: float
    location_fit: float
    must_have_missing: bool = False


def compute_match_score(inputs: MatchInputs) -> int:
    weighted_score = (
        inputs.skill_overlap * 0.65
        + inputs.seniority_fit * 0.2
        + inputs.location_fit * 0.15
    )
    raw_score = weighted_score * 100
    capped = min(raw_score, 85) if inputs.must_have_missing else raw_score
    return max(0, min(100, round(capped)))
