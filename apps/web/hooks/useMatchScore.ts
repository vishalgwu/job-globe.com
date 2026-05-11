import { useEffect, useState } from "react";

interface MatchScore {
  score: number; // 0–100
  breakdown: {
    strengths: Array<{ label: string; status: string }>;
    gaps: Array<{ label: string; status: string }>;
  };
  summary: string;
  cached: boolean;
}

interface UseMatchScoreReturn {
  matchScore: MatchScore | null;
  loading: boolean;
  error: string | null;
}

interface JobDetailApiResponse {
  job?: {
    matchBreakdown?: {
      score?: number;
      summary?: string;
      strengths?: Array<{ label: string; status: string }>;
      gaps?: Array<{ label: string; status: string }>;
    };
    [key: string]: unknown;
  };
  error?: { message?: string } | string;
  [key: string]: unknown;
}

export function useMatchScore(jobId: string | null): UseMatchScoreReturn {
  const [matchScore, setMatchScore] = useState<MatchScore | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setMatchScore(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchMatchScore() {
      setLoading(true);
      setError(null);
      setMatchScore(null);

      try {
        const res = await fetch(
          `/api/jobs?mode=detail&id=${encodeURIComponent(jobId as string)}`,
        );
        const json = (await res.json()) as JobDetailApiResponse;

        if (!res.ok) {
          const message =
            typeof json.error === "string"
              ? json.error
              : (json.error as { message?: string } | undefined)?.message ?? "Failed to load match score.";
          if (!cancelled) setError(message);
          return;
        }

        const breakdown = json.job?.matchBreakdown;

        if (!breakdown) {
          if (!cancelled) setMatchScore(null);
          return;
        }

        const score = typeof breakdown.score === "number" ? Math.round(breakdown.score * 100) : 0;

        if (!cancelled) {
          setMatchScore({
            score,
            breakdown: {
              strengths: breakdown.strengths ?? [],
              gaps: breakdown.gaps ?? [],
            },
            summary: breakdown.summary ?? "",
            cached: false,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load match score.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchMatchScore();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return { matchScore, loading, error };
}
