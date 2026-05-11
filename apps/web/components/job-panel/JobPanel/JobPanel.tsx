import type { JobDetail } from "@job-globe/shared-types";

import { ApplyCTA } from "../ApplyCTA/ApplyCTA";
import { MatchBreakdown } from "../MatchBreakdown/MatchBreakdown";
import { QuickPrepToolkit } from "../QuickPrepToolkit/QuickPrepToolkit";

interface JobPanelProps {
  job: JobDetail | null;
  isOpen: boolean;
  isSaved: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSave: (jobId: string) => void | Promise<void>;
}

export function JobPanel({ job, isOpen, isSaved, isLoading, onClose, onSave }: JobPanelProps) {
  return (
    <aside
      className={`job-panel ${isOpen ? "is-open" : ""}`}
      aria-label="Selected job details"
      aria-expanded={isOpen}
    >
      {isLoading ? <p className="detail-company" aria-live="polite" aria-busy={isLoading}>Loading job detail…</p> : null}
      {!job && !isLoading ? (
        <div className="empty-state">
          <p className="eyebrow">No marker selected</p>
          <h2>Select a job or company signal</h2>
          <p>
            Openings, companies, and city bubbles reveal role context and prep intelligence here.
          </p>
        </div>
      ) : null}
      {job ? (
        <article className="job-detail">
          <button
            className="close-panel"
            type="button"
            aria-label="Close job panel"
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
          <p className="eyebrow">Verified Opening</p>
          <h2>{job.title}</h2>
          <p className="detail-company">
            {job.companyName} | {job.location.city}, {job.location.countryName}
          </p>
          <div className="detail-tags">
            <span>{formatLabel(job.employmentType)}</span>
            <span>{formatLabel(job.remoteMode)}</span>
            <span>{formatSalary(job)}</span>
            <span>{formatDate(job.postedDate)}</span>
            <span>{formatLabel(job.freshness)}</span>
          </div>
          <p className="trust-line">{job.trustLine}</p>
          <p className="detail-summary">{job.summary}</p>
          <div className="action-row">
            <ApplyCTA applyUrl={job.applyUrl} jobId={job.id} />
            <button
              className="secondary-cta"
              type="button"
              aria-pressed={isSaved}
              onClick={() => onSave(job.id)}
            >
              {isSaved ? "Saved" : "Save Job"}
            </button>
          </div>
          <MatchBreakdown breakdown={job.matchBreakdown} />
          <QuickPrepToolkit quickPrep={job.quickPrep} />
        </article>
      ) : null}
    </aside>
  );
}

function formatSalary(job: JobDetail): string {
  if (!job.salaryRange || job.salaryRange.min === null || job.salaryRange.max === null) {
    return "Salary not listed";
  }

  return `${job.salaryRange.currency} ${job.salaryRange.min.toLocaleString()}-${job.salaryRange.max.toLocaleString()}`;
}

function formatDate(value: string): string {
  return `Posted ${value}`;
}

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
