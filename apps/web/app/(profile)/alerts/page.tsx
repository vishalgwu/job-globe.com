"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Alert {
  id: string;
  name: string;
  query: Record<string, string>;
  minimum_match_score: number;
  delivery_channels: string[];
  active: boolean;
  last_evaluated_at: string | null;
  created_at: string;
}

function filterSummary(query: Record<string, string>): string {
  const parts: string[] = [];
  if (query.category) parts.push(query.category.replace(/-/g, " "));
  if (query.remote) parts.push(query.remote);
  if (query.country) parts.push(`in ${query.country}`);
  if (query.city) parts.push(`in ${query.city}`);
  if (query.jobType) parts.push(query.jobType.replace(/-/g, " "));
  if (query.q) parts.push(`"${query.q}"`);
  return parts.length > 0 ? parts.join(" · ") : "All jobs";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push("/login");
          return;
        }
        setAuthed(true);
        return fetch("/api/alerts");
      })
      .then((r) => r?.json())
      .then((data) => {
        if (data?.alerts) setAlerts(data.alerts);
      })
      .catch(() => setError("Failed to load alerts."))
      .finally(() => setLoading(false));
  }, [router]);

  async function createAlert() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          query: {},
          minimum_match_score: 70,
          delivery_channels: ["in_app"],
        }),
      });
      const data = await res.json();
      if (data.ok && data.alert) {
        setAlerts((prev) => [data.alert, ...prev]);
        setNewName("");
        setShowCreate(false);
      } else {
        setError(data.error ?? "Failed to create alert.");
      }
    } catch {
      setError("Failed to create alert.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    setActionId(id);
    try {
      const res = await fetch(`/api/alerts?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      const data = await res.json();
      if (data.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, active: !active } : a))
        );
      }
    } catch {
      setError("Failed to update alert.");
    } finally {
      setActionId(null);
    }
  }

  async function deleteAlert(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      setError("Failed to delete alert.");
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <main style={{ padding: "2rem", maxWidth: 680, margin: "0 auto" }}>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Loading alerts…</p>
      </main>
    );
  }

  if (!authed) return null;

  return (
    <main style={{ padding: "2rem", maxWidth: 680, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Job alerts</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          style={{ fontSize: 14, padding: "6px 14px", cursor: "pointer" }}
        >
          {showCreate ? "Cancel" : "+ New alert"}
        </button>
      </div>

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

      {showCreate && (
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-secondary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "1rem 1.25rem",
          marginBottom: "1.25rem",
        }}>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0 }}>
            Give this alert a name. You can refine filters from the globe search.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Remote senior SWE in Europe"
              maxLength={120}
              style={{ flex: 1, fontSize: 14, padding: "8px 12px" }}
              onKeyDown={(e) => e.key === "Enter" && createAlert()}
            />
            <button
              onClick={createAlert}
              disabled={creating || !newName.trim()}
              style={{ fontSize: 14, padding: "8px 16px", cursor: "pointer" }}
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      )}

      {alerts.length === 0 ? (
        <div style={{
          background: "var(--color-background-secondary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "2rem",
          textAlign: "center",
        }}>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 15, margin: 0 }}>
            No alerts yet. Create one to get notified when new matching jobs appear.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-lg)",
                padding: "1rem 1.25rem",
                opacity: alert.active ? 1 : 0.6,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, fontSize: 15, margin: "0 0 4px" }}>{alert.name}</p>
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 8px" }}>
                    {filterSummary(alert.query)}
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      background: "var(--color-background-secondary)",
                      borderRadius: "var(--border-radius-md)",
                      color: "var(--color-text-secondary)",
                    }}>
                      {alert.delivery_channels.join(", ")}
                    </span>
                    <span style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      background: "var(--color-background-secondary)",
                      borderRadius: "var(--border-radius-md)",
                      color: "var(--color-text-secondary)",
                    }}>
                      min. {alert.minimum_match_score}% match
                    </span>
                    <span style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      background: alert.active
                        ? "var(--color-background-success)"
                        : "var(--color-background-secondary)",
                      borderRadius: "var(--border-radius-md)",
                      color: alert.active
                        ? "var(--color-text-success)"
                        : "var(--color-text-secondary)",
                    }}>
                      {alert.active ? "active" : "paused"}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "8px 0 0" }}>
                    Created {formatDate(alert.created_at)}
                    {alert.last_evaluated_at
                      ? ` · Last checked ${formatDate(alert.last_evaluated_at)}`
                      : " · Not yet evaluated"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleActive(alert.id, alert.active)}
                    disabled={actionId === alert.id}
                    style={{ fontSize: 12, padding: "4px 10px", cursor: "pointer" }}
                    title={alert.active ? "Pause alert" : "Resume alert"}
                  >
                    {alert.active ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    disabled={actionId === alert.id}
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      cursor: "pointer",
                      color: "var(--color-text-danger)",
                    }}
                    title="Delete alert"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: "1.5rem" }}>
        Alerts are delivered via in-app notification. Email delivery requires sign-off and is coming in a future update.
        Maximum {DAILY_MAX_DISPLAY} active alerts per account.
      </p>
    </main>
  );
}

// Displayed in footer note — must match server-side DAILY_MAX
const DAILY_MAX_DISPLAY = 5;
