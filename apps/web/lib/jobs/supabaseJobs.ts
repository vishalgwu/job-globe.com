import type {
  GlobeCityDatum,
  GlobeCompanyBubble,
  GlobeCountryDatum,
  GlobeMarker,
  GlobeMetricBreakdown,
  JobDetail,
  JobSummary,
  JobType,
  RemoteMode,
  SalaryRange,
  SearchFilters,
} from "@job-globe/shared-types";

import { createServerSupabaseClient } from "../supabase/server";
import { isValidExternalApplyUrl, postedWindowStart } from "./filters";

interface CompanyRow {
  id: string;
  name: string;
  logo_url: string | null;
}

interface LocationRow {
  id: string;
  country_code: string;
  country_name: string;
  region: string | null;
  city: string;
  latitude: string | number;
  longitude: string | number;
}

interface TaxonomyLinkRow {
  job_taxonomy: {
    category: string;
    value: string;
  } | null;
}

interface JobRow {
  id: string;
  title: string;
  description: string;
  employment_type: string;
  remote_type: string;
  apply_url: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  required_skills: string[] | null;
  status: string;
  first_seen_at: string;
  companies: CompanyRow | null;
  locations: LocationRow | null;
  job_taxonomy_links: TaxonomyLinkRow[] | null;
}

export async function getSupabaseJobs(filters: SearchFilters): Promise<JobDetail[]> {
  const supabase = createServerSupabaseClient();
  const postedAfter = postedWindowStart(filters.postedWithin);

  let query = supabase
    .from("jobs_canonical")
    .select(
      `
        id,
        title,
        description,
        employment_type,
        remote_type,
        apply_url,
        salary_min,
        salary_max,
        currency,
        required_skills,
        status,
        first_seen_at,
        companies!inner(id, name, logo_url),
        locations!inner(id, country_code, country_name, region, city, latitude, longitude),
        job_taxonomy_links(job_taxonomy(category, value))
      `,
    )
    .eq("status", "active")
    .order("first_seen_at", { ascending: false })
    .limit(500);

  if (postedAfter) {
    query = query.gte("first_seen_at", postedAfter);
  }

  if (filters.countryCode) {
    query = query.eq("locations.country_code", filters.countryCode);
  }

  if (filters.city) {
    query = query.ilike("locations.city", filters.city);
  }

  if (filters.remoteMode) {
    query = query.eq("remote_type", toDatabaseRemoteMode(filters.remoteMode));
  }

  if (filters.jobType) {
    query = query.eq("employment_type", filters.jobType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Supabase jobs query failed: ${error.message}`);
  }

  return ((data ?? []) as unknown as JobRow[])
    .map(toJobDetail)
    .filter((job): job is JobDetail => Boolean(job))
    .filter((job) => matchesInMemoryFilters(job, filters))
    .filter((job) => isValidExternalApplyUrl(job.applyUrl));
}

export function getCountryData(jobs: JobDetail[]): GlobeCountryDatum[] {
  return groupBy(jobs, (job) => job.location.countryCode)
    .map((countryJobs) => {
      const first = countryJobs[0];

      return {
        countryCode: first.location.countryCode,
        countryName: first.location.countryName,
        latitude: average(countryJobs.map((job) => job.location.latitude)),
        longitude: average(countryJobs.map((job) => job.location.longitude)),
        jobCount: countryJobs.length,
        topCategories: topBreakdown(
          countryJobs.map((job) => job.category),
          3,
        ),
        topMetroAreas: topBreakdown(
          countryJobs.map((job) => job.location.city),
          5,
        ),
      };
    })
    .sort((a, b) => b.jobCount - a.jobCount);
}

export function getCityData(jobs: JobDetail[]): GlobeCityDatum[] {
  return groupBy(jobs, (job) => `${job.location.countryCode}:${job.location.city}`)
    .map((cityJobs) => {
      const first = cityJobs[0];

      return {
        city: first.location.city,
        countryCode: first.location.countryCode,
        countryName: first.location.countryName,
        latitude: average(cityJobs.map((job) => job.location.latitude)),
        longitude: average(cityJobs.map((job) => job.location.longitude)),
        jobCount: cityJobs.length,
        topCategories: topBreakdown(
          cityJobs.map((job) => job.category),
          3,
        ),
      };
    })
    .sort((a, b) => b.jobCount - a.jobCount);
}

export function getCompanyBubbles(jobs: JobDetail[]): GlobeCompanyBubble[] {
  return groupBy(jobs, (job) => job.companyId)
    .map((companyJobs) => {
      const first = companyJobs[0];
      const size: GlobeCompanyBubble["size"] =
        companyJobs.length > 2 ? "lg" : companyJobs.length > 1 ? "md" : "sm";

      return {
        id: first.companyId,
        companyName: first.companyName,
        logoUrl: first.companyLogoUrl,
        city: first.location.city,
        countryCode: first.location.countryCode,
        latitude: average(companyJobs.map((job) => job.location.latitude)),
        longitude: average(companyJobs.map((job) => job.location.longitude)),
        jobCount: companyJobs.length,
        topCategory:
          topBreakdown(
            companyJobs.map((job) => job.category),
            1,
          )[0]?.label ?? first.category,
        size,
      };
    })
    .sort((a, b) => b.jobCount - a.jobCount);
}

export function getGlobeMarkers(jobs: JobDetail[]): GlobeMarker[] {
  return jobs.map((job) => ({
    id: `marker-${job.id}`,
    jobId: job.id,
    companyId: job.companyId,
    label: job.title,
    latitude: job.location.latitude,
    longitude: job.location.longitude,
    roleSnippet: job.summary,
    salaryHint: formatSalaryRange(job.salaryRange),
    remoteMode: job.remoteMode,
  }));
}

export function getJobList(jobs: JobDetail[]): JobSummary[] {
  return jobs.map(toJobSummary);
}

export async function getJobDetail(jobId: string): Promise<JobDetail | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("jobs_canonical")
    .select(
      `
        id,
        title,
        description,
        employment_type,
        remote_type,
        apply_url,
        salary_min,
        salary_max,
        currency,
        required_skills,
        status,
        first_seen_at,
        companies!inner(id, name, logo_url),
        locations!inner(id, country_code, country_name, region, city, latitude, longitude),
        job_taxonomy_links(job_taxonomy(category, value))
      `,
    )
    .eq("id", jobId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase job detail query failed: ${error.message}`);
  }

  return data ? toJobDetail(data as unknown as JobRow) : null;
}

function toJobDetail(row: JobRow): JobDetail | null {
  if (!row.companies || !row.locations) {
    return null;
  }

  const category = getCategory(row);
  const salaryRange = toSalaryRange(row);
  const postedAt = row.first_seen_at;

  return {
    id: row.id,
    title: row.title,
    companyId: row.companies.id,
    companyName: row.companies.name,
    companyLogoUrl: row.companies.logo_url,
    location: {
      countryCode: row.locations.country_code.trim(),
      countryName: row.locations.country_name,
      region: row.locations.region,
      city: row.locations.city,
      neighbourhood: null,
      latitude: Number(row.locations.latitude),
      longitude: Number(row.locations.longitude),
    },
    category,
    employmentType: toJobType(row.employment_type),
    remoteMode: toRemoteMode(row.remote_type),
    salaryRange,
    postedAt,
    postedDate: postedAt.slice(0, 10),
    freshness: toFreshness(postedAt),
    summary: summarize(row.description),
    applyUrl: row.apply_url,
    requiredSkills: row.required_skills ?? [],
    description: row.description,
    trustLine: "Redirects to the official application portal",
    matchBreakdown: {
      score: null,
      summary: "Match scoring will use the authenticated profile once Step 4 is connected.",
      strengths: [{ label: "Live Supabase job record", status: "strong" }],
      gaps: [{ label: "Profile-specific fit analysis", status: "unknown" }],
    },
    quickPrep: {
      roleSummary: summarize(row.description),
      skillsIHave: (row.required_skills ?? []).slice(0, 2),
      skillsMissing: ["Profile-specific gap analysis"],
      interviewQuestions: [
        `How have you used ${row.required_skills?.[0] ?? "the required skills"} in production?`,
        `What interests you about ${row.companies.name}?`,
        "Which part of the role would you want to ramp on first?",
      ],
      companyBrief: `${row.companies.name} is hiring for ${row.title}.`,
      resumeTailoringNote: "Prioritize concrete outcomes that match the required skills and role scope.",
    },
  };
}

function matchesInMemoryFilters(job: JobDetail, filters: SearchFilters): boolean {
  if (filters.category && job.category !== filters.category) {
    return false;
  }

  if (filters.query) {
    const haystack = [
      job.title,
      job.companyName,
      job.category,
      job.summary,
      job.description,
      job.location.city,
      ...job.requiredSkills,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(filters.query.toLowerCase());
  }

  return true;
}

function getCategory(row: JobRow): string {
  return (
    row.job_taxonomy_links
      ?.map((link) => link.job_taxonomy)
      .find((taxonomy) => taxonomy?.category === "function")?.value ??
    inferCategory(row.title)
  );
}

function inferCategory(title: string): string {
  const normalized = title.toLowerCase();

  if (normalized.includes("machine learning")) return "machine-learning";
  if (normalized.includes("data")) return "data-analytics";
  if (normalized.includes("design")) return "design";
  if (normalized.includes("security")) return "security";
  if (normalized.includes("operation")) return "operations";
  if (normalized.includes("product")) return "product-management";
  if (normalized.includes("sales")) return "sales";

  return "software-engineering";
}

function toDatabaseRemoteMode(remoteMode: RemoteMode): string {
  return remoteMode === "on-site" ? "onsite" : remoteMode;
}

function toRemoteMode(remoteType: string): RemoteMode {
  if (remoteType === "remote" || remoteType === "hybrid") {
    return remoteType;
  }

  return "on-site";
}

function toJobType(employmentType: string): JobType {
  if (
    employmentType === "internship" ||
    employmentType === "new-grad" ||
    employmentType === "contract"
  ) {
    return employmentType;
  }

  return "full-time";
}

function toSalaryRange(row: JobRow): SalaryRange | null {
  if (row.salary_min === null && row.salary_max === null) {
    return null;
  }

  return {
    min: row.salary_min,
    max: row.salary_max,
    currency: row.currency ?? "USD",
  };
}

function toFreshness(postedAt: string): JobSummary["freshness"] {
  const ageMs = Date.now() - Date.parse(postedAt);

  if (ageMs <= 24 * 60 * 60 * 1000) {
    return "fresh";
  }

  if (ageMs <= 30 * 24 * 60 * 60 * 1000) {
    return "active";
  }

  return "stale";
}

function summarize(description: string): string {
  const firstSentence = description.split(".")[0]?.trim();
  const summary = firstSentence && firstSentence.length > 0 ? firstSentence : description.trim();

  return summary.length > 180 ? `${summary.slice(0, 177)}...` : summary;
}

function toJobSummary(job: JobDetail): JobSummary {
  const { description, trustLine, matchBreakdown, quickPrep, ...summary } = job;
  void description;
  void trustLine;
  void matchBreakdown;
  void quickPrep;

  return summary;
}

function topBreakdown(values: string[], limit: number): GlobeMetricBreakdown[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts, ([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function groupBy<T>(items: T[], getKey: (item: T) => string): T[][] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return Array.from(groups.values());
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function formatSalaryRange(salaryRange: JobDetail["salaryRange"]): string | null {
  if (!salaryRange || salaryRange.min === null || salaryRange.max === null) {
    return null;
  }

  return `${salaryRange.currency} ${salaryRange.min.toLocaleString()}-${salaryRange.max.toLocaleString()}`;
}
