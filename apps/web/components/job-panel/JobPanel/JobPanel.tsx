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
  onSave: (jobId: string) => void;
}

export function JobPanel({ job, isOpen, isSaved, isLoading, onClose, onSave }: JobPanelProps) {
  return (
    <aside className={`job-panel ${isOpen ? "is-open" : ""}`} aria-label="Selected job panel">
      <div className="job-panel-inner">
        <div className="panel-topline">
          <div>
            <p className="eyebrow">Verified Opening</p>
            <p className="trust-line">Redirects to the official application portal</p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close job panel"
            onClick={onClose}
          >
            X
          </button>
        </div>
        {isLoading ? <p className="muted">Loading job detail...</p> : null}
        {!job && !isLoading ? (
          <div className="empty-panel">
            <h2>Select a job</h2>
            <p>
              Open a marker or list item to review the role, save it, and jump to the official
              portal.
            </p>
          </div>
        ) : null}
        {job ? (
          <div className="panel-content">
            <div>
              <h2>{job.title}</h2>
              <p className="company-line">
                {job.companyName} - {job.location.city}, {job.location.countryName}
              </p>
            </div>
            <div className="meta-grid">
              <span>{formatLabel(job.employmentType)}</span>
              <span>{formatLabel(job.remoteMode)}</span>
              <span>{formatSalary(job)}</span>
              <span>{job.freshness}</span>
            </div>
            <p>{job.summary}</p>
            <div className="panel-actions">
              <ApplyCTA applyUrl={job.applyUrl} />
              <button type="button" onClick={() => onSave(job.id)} aria-pressed={isSaved}>
                {isSaved ? "Saved" : "Save Job"}
              </button>
            </div>
            <MatchBreakdown breakdown={job.matchBreakdown} />
            <QuickPrepToolkit quickPrep={job.quickPrep} />
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function formatSalary(job: JobDetail): string {
  if (!job.salaryRange || job.salaryRange.min === null || job.salaryRange.max === null) {
    return "Salary not listed";
  }

  return `${job.salaryRange.currency} ${job.salaryRange.min.toLocaleString()}-${job.salaryRange.max.toLocaleString()}`;
}

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
