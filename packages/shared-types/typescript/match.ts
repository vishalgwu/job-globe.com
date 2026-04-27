export interface MatchSignal {
  label: string;
  status: "strong" | "partial" | "missing" | "unknown";
}

export interface MatchBreakdown {
  score: number | null;
  summary: string;
  strengths: MatchSignal[];
  gaps: MatchSignal[];
}
