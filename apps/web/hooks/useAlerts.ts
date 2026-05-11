import { useEffect, useState, useCallback } from "react";

interface Alert {
  id: string;
  name: string;
  query: Record<string, unknown>;
  minimum_match_score: number;
  delivery_channels: string[];
  active: boolean;
  created_at: string;
}

interface UseAlertsReturn {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  createAlert: (data: Omit<Alert, "id" | "created_at">) => Promise<boolean>;
  deleteAlert: (id: string) => Promise<boolean>;
  toggleAlert: (id: string, active: boolean) => Promise<boolean>;
  refresh: () => void;
}

interface AlertsApiResponse {
  ok?: boolean;
  alerts?: Alert[];
  alert?: Alert;
  error?: string;
}

export function useAlerts(): UseAlertsReturn {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchAlerts() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/alerts");
        const json = (await res.json()) as AlertsApiResponse;

        if (!res.ok) {
          if (!cancelled) setError(json.error ?? "Failed to load alerts.");
          return;
        }

        if (!cancelled) {
          setAlerts(json.alerts ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load alerts.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchAlerts();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const createAlert = useCallback(
    async (data: Omit<Alert, "id" | "created_at">): Promise<boolean> => {
      try {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = (await res.json()) as AlertsApiResponse;

        if (!res.ok) {
          setError(json.error ?? "Failed to create alert.");
          return false;
        }

        if (json.alert) {
          setAlerts((prev) => [json.alert as Alert, ...prev]);
        } else {
          refresh();
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create alert.");
        return false;
      }
    },
    [refresh],
  );

  const deleteAlert = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/alerts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as AlertsApiResponse;

      if (!res.ok) {
        setError(json.error ?? "Failed to delete alert.");
        return false;
      }

      setAlerts((prev) => prev.filter((a) => a.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete alert.");
      return false;
    }
  }, []);

  const toggleAlert = useCallback(async (id: string, active: boolean): Promise<boolean> => {
    try {
      const res = await fetch(`/api/alerts?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const json = (await res.json()) as AlertsApiResponse;

      if (!res.ok) {
        setError(json.error ?? "Failed to update alert.");
        return false;
      }

      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, active: json.alert?.active ?? active } : a,
        ),
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update alert.");
      return false;
    }
  }, []);

  return {
    alerts,
    loading,
    error,
    createAlert,
    deleteAlert,
    toggleAlert,
    refresh,
  };
}
