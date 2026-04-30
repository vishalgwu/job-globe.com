import type { MatchBreakdown as MatchBreakdownData } from "@job-globe/shared-types";

interface MatchBreakdownProps {
  breakdown: MatchBreakdownData;
}

export function MatchBreakdown({ breakdown }: MatchBreakdownProps) {
  return (
    <section className="match-block" aria-labelledby="match-breakdown-title">
      <h3 id="match-breakdown-title">Why This Matches You</h3>
      <p className="muted">{breakdown.summary}</p>
      <div className="signal-grid">
        {[...breakdown.strengths, ...breakdown.gaps].map((signal) => (
          <span
            key={`${signal.status}-${signal.label}`}
            className={`signal signal--${signal.status}`}
          >
            {signal.label}
          </span>
        ))}
      </div>
    </section>
  );
}
