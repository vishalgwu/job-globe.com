from dataclasses import dataclass
from datetime import timedelta


@dataclass(frozen=True)
class SourceFreshnessRule:
    source: str
    interval: timedelta
    supports_webhook: bool = False


DEFAULT_FRESHNESS_RULES: tuple[SourceFreshnessRule, ...] = (
    SourceFreshnessRule("greenhouse", timedelta(minutes=15), True),
    SourceFreshnessRule("lever", timedelta(minutes=15), True),
    SourceFreshnessRule("smartrecruiters", timedelta(minutes=30)),
    SourceFreshnessRule("workable", timedelta(minutes=30)),
    SourceFreshnessRule("usajobs", timedelta(hours=1)),
    SourceFreshnessRule("eures", timedelta(hours=1)),
    SourceFreshnessRule("adzuna", timedelta(hours=1)),
)
