import type { LocationSummary } from "./location";

export interface CompanySummary {
  id: string;
  name: string;
  domain: string;
  logoUrl: string | null;
  trustScore: number;
  headquarters: LocationSummary | null;
}
