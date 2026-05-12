import type { JobDetail } from "@job-globe/shared-types";

export interface CompareJobResult {
  id: string;
  job: JobDetail | null;
  error?: string;
}

interface JobComparePanelProps {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  jobs: CompareJobResult[];
  topMatchId: string | null;
  onClose: () => void;
  onOpenJob: (jobId: string) => void;
}

export function JobComparePanel({
  isOpen,
  isLoading,
  error,
  jobs,
  topMatchId,
  onClose,
  onOpenJob,
}: JobComparePanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <aside className="compare-panel" role="dialog" aria-labelledby="compare-title">
      <div className="compare-panel-head">
        <div>
          <p className="eyebrow">Side by side</p>
          <h2 id="compare-title">Job comparison</h2>
        </div>
        <button type="button" aria-label="Close comparison" onClick={onClose}>
          <span aria-hidden="true">x</span>
        </button>
      </div>
      {isLoading ? (
        <p className="detail-company" aria-live="polite">
          Loading comparison...
        </p>
      ) : null}
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      <div className="compare-grid">
        {jobs.map(({ id, job, error: jobError }) =>
          job ? (
            <article
              className={`compare-card${topMatchId === id ? " is-top" : ""}`}
              key={id}
            >
              <p className="eyebrow">{topMatchId === id ? "Top match" : "Role"}</p>
              <h3>{job.title}</h3>
              <p className="detail-company">
                {job.companyName} | {job.location.city}, {job.location.countryName}
              </p>
              <div className="compare-score">{formatScore(job.matchBreakdown.score)}</div>
              <dl className="compare-meta">
                <div>
                  <dt>Mode</dt>
                  <dd>{formatLabel(job.remoteMode)}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{formatLabel(job.employmentType)}</dd>
                </div>
                <div>
                  <dt>Salary</dt>
                  <dd>{formatSalary(job)}</dd>
                </div>
                <div>
                  <dt>Freshness</dt>
                  <dd>{formatLabel(job.freshness)}</dd>
                </div>
              </dl>
              <p>{job.matchBreakdown.summary}</p>
              <div className="compare-skills">
                {job.requiredSkills.slice(0, 5).map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
              <button type="button" onClick={() => onOpenJob(id)}>
                Open
              </button>
            </article>
          ) : (
            <article className="compare-card" key={id}>
              <p className="eyebrow">Unavailable</p>
              <h3>Job not loaded</h3>
              <p className="error-text">{jobError ?? "Failed to load this job."}</p>
            </article>
          ),
        )}
      </div>
    </aside>
  );
}

function formatScore(score: number | null): string {
  return score === null ? "No match score" : `${Math.round(score * 100)}% match`;
}

function formatSalary(job: JobDetail): string {
  if (!job.salaryRange || job.salaryRange.min === null || job.salaryRange.max === null) {
    return "Not listed";
  }

  return `${job.salaryRange.currency} ${job.salaryRange.min.toLocaleString()}-${job.salaryRange.max.toLocaleString()}`;
}

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
