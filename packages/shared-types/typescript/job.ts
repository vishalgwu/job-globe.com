import type { MatchBreakdown } from "./match";

export type GlobeZoomLayer = "global" | "country" | "city" | "neighbourhood";

export type RemoteMode = "remote" | "hybrid" | "on-site";

export type JobType = "internship" | "new-grad" | "full-time" | "contract";

export type PostedWithin = "1hr" | "6hr" | "1day" | "7day" | "past-month" | "any-time";

export interface SalaryRange {
  min: number | null;
  max: number | null;
  currency: string;
}

export interface GlobeMetricBreakdown {
  label: string;
  count: number;
}

export interface JobLocationLabel {
  countryCode: string;
  countryName: string;
  region: string | null;
  city: string;
  neighbourhood: string | null;
  latitude: number;
  longitude: number;
}

export interface SearchFilters {
  category: string | null;
  countryCode: string | null;
  city: string | null;
  remoteMode: RemoteMode | null;
  jobType: JobType | null;
  postedWithin: PostedWithin;
  query: string | null;
}

export interface GlobeCountryDatum {
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
  jobCount: number;
  topCategories: GlobeMetricBreakdown[];
  topMetroAreas: GlobeMetricBreakdown[];
}

export interface GlobeCityDatum {
  city: string;
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
  jobCount: number;
  topCategories: GlobeMetricBreakdown[];
}

export interface GlobeCompanyBubble {
  id: string;
  companyName: string;
  logoUrl: string | null;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  jobCount: number;
  topCategory: string;
  size: "sm" | "md" | "lg";
}

export interface GlobeMarker {
  id: string;
  jobId: string;
  companyId: string;
  label: string;
  latitude: number;
  longitude: number;
  roleSnippet: string;
  salaryHint: string | null;
  remoteMode: RemoteMode;
}

export interface JobSummary {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  companyLogoUrl: string | null;
  location: JobLocationLabel;
  category: string;
  employmentType: JobType;
  remoteMode: RemoteMode;
  salaryRange: SalaryRange | null;
  postedAt: string;
  postedDate: string;
  freshness: "fresh" | "active" | "stale";
  summary: string;
  applyUrl: string;
  requiredSkills: string[];
}

export interface QuickPrepPlaceholder {
  roleSummary: string;
  skillsIHave: string[];
  skillsMissing: string[];
  interviewQuestions: string[];
  companyBrief: string;
  resumeTailoringNote: string;
}

export interface JobDetail extends JobSummary {
  description: string;
  trustLine: "Redirects to the official application portal";
  matchBreakdown: MatchBreakdown;
  quickPrep: QuickPrepPlaceholder;
}

export type JobsApiMode = "global" | "country" | "city" | "jobs" | "detail";

export type JobsApiResponse =
  | {
      mode: "global";
      source: "demo";
      filters: SearchFilters;
      countries: GlobeCountryDatum[];
    }
  | {
      mode: "country";
      source: "demo";
      filters: SearchFilters;
      country: GlobeCountryDatum | null;
      cities: GlobeCityDatum[];
    }
  | {
      mode: "city";
      source: "demo";
      filters: SearchFilters;
      bubbles: GlobeCompanyBubble[];
      markers: GlobeMarker[];
    }
  | {
      mode: "jobs";
      source: "demo";
      filters: SearchFilters;
      jobs: JobSummary[];
    }
  | {
      mode: "detail";
      source: "demo";
      job: JobDetail;
    };
