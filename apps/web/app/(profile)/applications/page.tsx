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
        <div style={{
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
          {applications.map((app) => (
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
                <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0 }}>
                  Applied {formatDate(app.applied_at)} · {app.status}
                </p>
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
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: "1.5rem" }}>
        This page shows jobs where you clicked the Apply button. Full application status tracking
        (confirmation, interviews, offers) is a future feature.
      </p>
    </main>
  );
}
