"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SavedJob {
  job_id: string;
  notes: string | null;
  saved_at: string;
  jobs_canonical: {
    id: string;
    title: string;
    employment_type: string;
    remote_type: string;
    seniority: string | null;
    apply_url: string;
    companies: { name: string; logo_url: string | null } | null;
    locations: { city: string; country_name: string } | null;
  } | null;
}

export default function SavedPage() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = (await sessionRes.json()) as { authenticated: boolean };
        setIsAuthenticated(session.authenticated);

        if (!session.authenticated) {
          return;
        }

        const res = await fetch("/api/saved-jobs");
        if (res.ok) {
          const data = (await res.json()) as { savedJobs: SavedJob[] };
          setSavedJobs(data.savedJobs ?? []);
        }
      } catch {
        // Non-fatal — show empty state
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  async function removeSaved(jobId: string) {
    try {
      const res = await fetch(`/api/saved-jobs?jobId=${encodeURIComponent(jobId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSavedJobs((prev) => prev.filter((j) => j.job_id !== jobId));
      }
    } catch {
      // Silently ignore — UI stays consistent
    }
  }

  if (isLoading) {
    return (
      <main className="saved-page">
        <p className="muted">Loading saved jobs…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="saved-page">
        <section className="auth-shell">
          <h1>Saved Jobs</h1>
          <p>
            <Link href="/login">Sign in</Link> to see jobs you&apos;ve saved across
            sessions.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="saved-page">
      <section className="saved-shell">
        <header className="app-header">
          <h1>Saved Jobs</h1>
          <Link href="/">Back to globe</Link>
        </header>

        {savedJobs.length === 0 ? (
          <div className="empty-state">
            <p>No saved jobs yet.</p>
            <p className="muted">
              Hit <strong>Save Job</strong> on any job card to bookmark it here.
            </p>
          </div>
        ) : (
          <ul className="saved-job-list">
            {savedJobs.map((saved) => {
              const job = saved.jobs_canonical;
              if (!job) return null;
              return (
                <li key={saved.job_id} className="saved-job-card">
                  <div className="saved-job-meta">
                    <h2>{job.title}</h2>
                    <p className="detail-company">
                      {job.companies?.name ?? "Unknown company"} —{" "}
                      {job.locations
                        ? `${job.locations.city}, ${job.locations.country_name}`
                        : "Location unknown"}
                    </p>
                    <div className="detail-tags">
                      <span>{formatLabel(job.employment_type)}</span>
                      <span>{formatLabel(job.remote_type)}</span>
                      {job.seniority ? <span>{formatLabel(job.seniority)}</span> : null}
                    </div>
                    <p className="muted">
                      Saved {new Date(saved.saved_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="action-row">
                    <a
                      href={job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="primary-action"
                    >
                      Apply
                    </a>
                    <button
                      type="button"
                      className="secondary-cta"
                      onClick={() => removeSaved(saved.job_id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
