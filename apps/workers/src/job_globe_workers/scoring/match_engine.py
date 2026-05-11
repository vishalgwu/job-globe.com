"""Job-profile match scoring engine.

Computes a 0-100 integer match score from seven weighted signals.

Component weights (sum = 1.00):
  skill_overlap        0.30
  seniority_fit        0.15
  location_fit         0.15
  remote_fit           0.15
  employment_type_fit  0.10
  role_family_fit      0.10
  salary_fit           0.05

If must_have_missing is True the final score is capped at 85.

Backward compatibility:
  The legacy 3-field MatchInputs signature is preserved -- the four new
  fields default to 1.0 (neutral/full score) so existing callers see
  no change in behaviour.
"""

from __future__ import annotations

from dataclasses import dataclass

_W_SKILL: float = 0.30
_W_SENIORITY: float = 0.15
_W_LOCATION: float = 0.15
_W_REMOTE: float = 0.15
_W_EMPLOYMENT: float = 0.10
_W_ROLE_FAMILY: float = 0.10
_W_SALARY: float = 0.05

_MUST_HAVE_CAP: float = 85.0


@dataclass(frozen=True)
class MatchInputs:
    """All inputs required to compute a match score.

    Legacy callers that only supply skill_overlap, seniority_fit, and
    location_fit will receive the four new fields defaulted to 1.0,
    preserving backward-compatible behaviour while adjusting the weight
    distribution.
    """

    # Core fields (no default -- keep backward compat positional order)
    skill_overlap: float         # intersection / len(required_skills)    weight 0.30
    seniority_fit: float         # 1.0 exact, 0.5 adjacent, 0.0 mismatch weight 0.15
    location_fit: float          # city/country match, remote wildcard    weight 0.15

    # Extended fields (default 1.0 = no penalty for legacy callers)
    remote_fit: float = 1.0              # preferred_remote vs job.remote_type  weight 0.15
    employment_type_fit: float = 1.0     # full-time/part-time/contract         weight 0.10
    role_family_fit: float = 1.0         # taxonomy category match              weight 0.10
    salary_fit: float = 1.0              # salary_expectation vs job range      weight 0.05

    must_have_missing: bool = False      # caps final score at 85 if True


def compute_match_score(inputs: MatchInputs) -> int:
    """Return a 0-100 integer match score.

    Each component is clamped to [0.0, 1.0] before weighting to guard
    against caller errors.  The must_have_missing flag caps the result at 85.
    """

    def _clamp(v: float) -> float:
        return max(0.0, min(1.0, v))

    weighted = (
        _clamp(inputs.skill_overlap)          * _W_SKILL
        + _clamp(inputs.seniority_fit)        * _W_SENIORITY
        + _clamp(inputs.location_fit)         * _W_LOCATION
        + _clamp(inputs.remote_fit)           * _W_REMOTE
        + _clamp(inputs.employment_type_fit)  * _W_EMPLOYMENT
        + _clamp(inputs.role_family_fit)      * _W_ROLE_FAMILY
        + _clamp(inputs.salary_fit)           * _W_SALARY
    )

    raw_score = weighted * 100.0

    if inputs.must_have_missing:
        raw_score = min(raw_score, _MUST_HAVE_CAP)

    return max(0, min(100, round(raw_score)))


def score_from_legacy(
    skill_overlap: float,
    seniority_fit: float,
    location_fit: float,
    must_have_missing: bool = False,
) -> int:
    """Compute a score using only the original three signals.

    Provided for callers that have not yet been updated to supply all seven
    signals.  Extended fields default to 1.0 (no penalty).
    """
    return compute_match_score(
        MatchInputs(
            skill_overlap=skill_overlap,
            seniority_fit=seniority_fit,
            location_fit=location_fit,
            must_have_missing=must_have_missing,
        )
    )
