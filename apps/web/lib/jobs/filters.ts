import type { JobType, JobsApiMode, PostedWithin, RemoteMode, SearchFilters } from "@job-globe/shared-types";

const remoteModes: RemoteMode[] = ["remote", "hybrid", "on-site"];
const jobTypes: JobType[] = ["internship", "new-grad", "full-time", "contract"];
const apiModes: JobsApiMode[] = ["global", "country", "city", "jobs", "detail"];
const postedWithinOptions: PostedWithin[] = [
  "1hr",
  "6hr",
  "1day",
  "7day",
  "past-month",
  "any-time",
];

export function parseJobsApiMode(searchParams: URLSearchParams): JobsApiMode {
  const value = searchParams.get("mode");
  return apiModes.includes(value as JobsApiMode) ? (value as JobsApiMode) : "global";
}

export function parseSearchFilters(searchParams: URLSearchParams): SearchFilters {
  return {
    category: emptyToNull(searchParams.get("category")),
    countryCode: emptyToNull(searchParams.get("country"))?.toUpperCase() ?? null,
    city: emptyToNull(searchParams.get("city")),
    remoteMode: parseRemoteMode(searchParams.get("remote")),
    jobType: parseJobType(searchParams.get("jobType")),
    postedWithin: parsePostedWithin(searchParams.get("postedWithin")),
    query: emptyToNull(searchParams.get("q") ?? searchParams.get("query")),
  };
}

export function postedWindowStart(postedWithin: PostedWithin, now = Date.now()): string | null {
  if (postedWithin === "any-time") {
    return null;
  }

  return new Date(now - postedWindowMs(postedWithin)).toISOString();
}

export function isValidExternalApplyUrl(applyUrl: string): boolean {
  try {
    const url = new URL(applyUrl);

    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname !== "localhost";
  } catch {
    return false;
  }
}

function emptyToNull(value: string | null): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function parseRemoteMode(value: string | null): RemoteMode | null {
  return remoteModes.includes(value as RemoteMode) ? (value as RemoteMode) : null;
}

function parseJobType(value: string | null): JobType | null {
  return jobTypes.includes(value as JobType) ? (value as JobType) : null;
}

function parsePostedWithin(value: string | null): PostedWithin {
  const normalizedValue = emptyToNull(value)?.toLowerCase().replace(/\s+/g, "-") ?? "any-time";

  if (normalizedValue === "month" || normalizedValue === "30day" || normalizedValue === "30days") {
    return "past-month";
  }

  return postedWithinOptions.includes(normalizedValue as PostedWithin)
    ? (normalizedValue as PostedWithin)
    : "any-time";
}

function postedWindowMs(postedWithin: Exclude<PostedWithin, "any-time">): number {
  if (postedWithin === "1hr") {
    return 60 * 60 * 1000;
  }

  if (postedWithin === "6hr") {
    return 6 * 60 * 60 * 1000;
  }

  if (postedWithin === "1day") {
    return 24 * 60 * 60 * 1000;
  }

  if (postedWithin === "7day") {
    return 7 * 24 * 60 * 60 * 1000;
  }

  return 30 * 24 * 60 * 60 * 1000;
}
