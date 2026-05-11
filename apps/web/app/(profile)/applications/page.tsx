"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Application {
  id: string;
  job_id: string;
  apply_url: string;
  status: string;
  applied_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  redirected: "Redirected",
  applied: "Applied",
  assessment: "Assessment",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const STATUS_COLORS: Record<string, string> = {
  redirected: "var(--color-text-tertiary, #6b7280)",
  applied: "var(--color-text-info, #2563eb)",
  assessment: "var(--color-text-info, #2563eb)",
  interviewing: "var(--color-text-warning, #d97706)",
  offer: "var(--color-text-success, #16a34a)",
  rejected: "var(--color-text-danger, #dc2626)",
  withdrawn: "var(--color-text-tertiary, #6b7280)",
};

const NEXT_STATUSES: Record<string, string[]> = {
  redirected: ["applied", "withdrawn"],
  applied: ["assessment", "interviewing", "rejected", "withdrawn"],
  assessment: ["interviewing", "rejected", "withdrawn"],
  interviewing: ["offer", "rejected", "withdrawn"],
  offer: ["withdrawn"],
  rejected: [],
  withdrawn: [],
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push("/login");
          return;
        }
        setAuthed(true);
        return fetch("/api/applications");
      })
      .then((r) => r?.json())
      .then((data) => {
        if (data?.applications) setApplications(data.applications);
      })
      .catch(() => setError("Failed to load applications."))
      .finally(() => setLoading(false));
  }, [router]);

  async function updateStatus(appId: string, newStatus: string) {
    setUpdatingId(appId);
    try {
      const res = await fetch(`/api/applications?id=${encodeURIComponent(appId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setError("Failed to update status.");
        return;
      }
      const data = (await res.json()) as { application: Application };
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: data.application.status } : a)),
      );
    } catch {
      setError("Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <main style={{ padding: "2rem", maxWidth: 680, margin: "0 auto" }}>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Loading…</p>
      </main>
    );
  }

  if (!authed) return null;

  return (
    <main style={{ padding: "2rem", maxWidth: 680, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: "1.5rem" }}>Applications</h1>

      {error && (
        <div role="alert" style={{
          background: "var(--color-background-danger)",
          color: "var(--color-text-danger)",
          border: "0.5px solid var(--color-border-danger)",
          borderRadius: "var(--border-radius-md)",
          padding: "0.75rem 1rem",
          marginBottom: "1rem",
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {applications.length === 0 ? (
        <div style={{
          background: "var(--color-background-secondary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "2rem",
          textAlign: "center",
        }}>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 15, margin: 0 }}>
            No applications tracked yet. When you click Apply on a job, it will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {applications.map((app) => {
            const nextStatuses = NEXT_STATUSES[app.status] ?? [];
            const isUpdating = updatingId === app.id;
            return (
              <div
                key={app.id}
                style={{
                  background: "var(--color-background-primary)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--border-radius-lg)",
                  padding: "0.875rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, fontSize: 14, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {domainOf(app.apply_url)}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 6px" }}>
                    Redirected {formatDate(app.applied_at)}
                  </p>
                  {/* Status badge */}
                  <span style={{
                    display: "inline-block",
                    fontSize: 11,
                    fontWeight: 600,
                    color: STATUS_COLORS[app.status] ?? "inherit",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}>
                    {STATUS_LABELS[app.status] ?? app.status}
                  </span>
                  {/* Status advancement buttons */}
                  {nextStatuses.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {nextStatuses.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={isUpdating}
                          onClick={() => void updateStatus(app.id, s)}
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 4,
                            border: "0.5px solid var(--color-border-secondary)",
                            background: "transparent",
                            cursor: isUpdating ? "not-allowed" : "pointer",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          → {STATUS_LABELS[s] ?? s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <a
                  href={app.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-info)",
                    textDecoration: "none",
                    flexShrink: 0,
                  }}
                >
                  Open ↗
                </a>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: "1.5rem" }}>
        This page shows jobs where you clicked the Apply button. Full application status tracking
        (confirmation, interviews, offers) is a future feature.
      </p>
    </main>
  );
}
