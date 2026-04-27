import type {
  GlobeCityDatum,
  GlobeCompanyBubble,
  GlobeCountryDatum,
  GlobeMarker,
  GlobeMetricBreakdown,
  JobDetail,
  JobSummary,
  JobType,
  JobsApiMode,
  PostedWithin,
  RemoteMode,
  SearchFilters,
} from "@job-globe/shared-types";

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

export const demoJobs: JobDetail[] = [
  {
    id: "demo-job-001",
    title: "Frontend Platform Engineer",
    companyId: "demo-company-aster",
    companyName: "Aster Labs",
    companyLogoUrl: null,
    location: {
      countryCode: "US",
      countryName: "United States",
      region: "New York",
      city: "New York",
      neighbourhood: "Flatiron",
      latitude: 40.7411,
      longitude: -73.9897,
    },
    category: "software-engineering",
    employmentType: "full-time",
    remoteMode: "hybrid",
    salaryRange: { min: 118000, max: 154000, currency: "USD" },
    postedAt: isoHoursAgo(0.5),
    postedDate: dateHoursAgo(0.5),
    freshness: "fresh",
    summary: "Build fast product surfaces for the globe search experience and shared UI systems.",
    applyUrl: "https://careers.example.com/aster-labs/frontend-platform-engineer",
    requiredSkills: ["TypeScript", "React", "Accessibility"],
    description:
      "Demo role for Step 2. This opening represents frontend platform work on a global job discovery product.",
    trustLine: "Redirects to the official application portal",
    matchBreakdown: {
      score: null,
      summary: "Step 2 placeholder. Real match scoring starts in Step 4.",
      strengths: [{ label: "React product UI", status: "strong" }],
      gaps: [{ label: "Production globe rendering", status: "unknown" }],
    },
    quickPrep: {
      roleSummary: "Prepare to discuss accessible React systems and fast product iteration.",
      skillsIHave: ["TypeScript", "React"],
      skillsMissing: ["Globe performance tuning"],
      interviewQuestions: [
        "How would you keep a complex map interface keyboard accessible?",
        "How do you profile a slow React interaction?",
        "What belongs in a shared component contract?",
      ],
      companyBrief: "Aster Labs is a demo employer focused on applied product systems.",
      resumeTailoringNote:
        "Highlight shipped UI systems, accessibility work, and performance wins.",
    },
  },
  {
    id: "demo-job-002",
    title: "Machine Learning Intern",
    companyId: "demo-company-cloudbridge",
    companyName: "Cloudbridge AI",
    companyLogoUrl: null,
    location: {
      countryCode: "US",
      countryName: "United States",
      region: "California",
      city: "San Francisco",
      neighbourhood: "SoMa",
      latitude: 37.7786,
      longitude: -122.3959,
    },
    category: "machine-learning",
    employmentType: "internship",
    remoteMode: "hybrid",
    salaryRange: { min: 42, max: 55, currency: "USD" },
    postedAt: isoHoursAgo(4),
    postedDate: dateHoursAgo(4),
    freshness: "fresh",
    summary: "Prototype ranking features for demo job search and profile matching workflows.",
    applyUrl: "https://careers.example.com/cloudbridge-ai/ml-intern",
    requiredSkills: ["Python", "Embeddings", "SQL"],
    description:
      "Demo role for Step 2. This internship stands in for future ranking and matching work.",
    trustLine: "Redirects to the official application portal",
    matchBreakdown: {
      score: null,
      summary: "Step 2 placeholder. Real match scoring starts in Step 4.",
      strengths: [{ label: "Python and SQL", status: "strong" }],
      gaps: [{ label: "Production evaluation workflow", status: "partial" }],
    },
    quickPrep: {
      roleSummary: "Prepare to explain embeddings, ranking metrics, and data quality checks.",
      skillsIHave: ["Python", "SQL"],
      skillsMissing: ["Offline eval design"],
      interviewQuestions: [
        "How would you evaluate a job recommendation system?",
        "What makes an embedding useful for search?",
        "How would you detect noisy labels?",
      ],
      companyBrief: "Cloudbridge AI is a demo employer for AI infrastructure roles.",
      resumeTailoringNote: "Show projects with ranking, retrieval, or model evaluation.",
    },
  },
  {
    id: "demo-job-003",
    title: "Data Analyst, Marketplace Signals",
    companyId: "demo-company-datum",
    companyName: "Datum Works",
    companyLogoUrl: null,
    location: {
      countryCode: "CA",
      countryName: "Canada",
      region: "Ontario",
      city: "Toronto",
      neighbourhood: "Financial District",
      latitude: 43.6476,
      longitude: -79.3808,
    },
    category: "data-analytics",
    employmentType: "new-grad",
    remoteMode: "remote",
    salaryRange: { min: 82000, max: 98000, currency: "CAD" },
    postedAt: isoHoursAgo(20),
    postedDate: dateHoursAgo(20),
    freshness: "active",
    summary: "Turn demo job market activity into city and company-level insights.",
    applyUrl: "https://careers.example.com/datum-works/data-analyst-marketplace-signals",
    requiredSkills: ["SQL", "Dashboards", "Statistics"],
    description:
      "Demo role for Step 2. This job powers analytics examples in the city and country layers.",
    trustLine: "Redirects to the official application portal",
    matchBreakdown: {
      score: null,
      summary: "Step 2 placeholder. Real match scoring starts in Step 4.",
      strengths: [{ label: "SQL analysis", status: "strong" }],
      gaps: [{ label: "Labor market domain context", status: "unknown" }],
    },
    quickPrep: {
      roleSummary: "Prepare examples of dashboards, metric design, and messy data cleaning.",
      skillsIHave: ["SQL", "Statistics"],
      skillsMissing: ["Labor market data"],
      interviewQuestions: [
        "How would you define a healthy job cluster?",
        "How do you handle duplicate records?",
        "What makes a dashboard actionable?",
      ],
      companyBrief: "Datum Works is a demo employer focused on analytics workflows.",
      resumeTailoringNote: "Lead with dashboards, stakeholder metrics, and SQL depth.",
    },
  },
  {
    id: "demo-job-004",
    title: "Product Designer, Search Experience",
    companyId: "demo-company-juniper",
    companyName: "Juniper Learning",
    companyLogoUrl: null,
    location: {
      countryCode: "GB",
      countryName: "United Kingdom",
      region: "England",
      city: "London",
      neighbourhood: "Shoreditch",
      latitude: 51.5245,
      longitude: -0.0754,
    },
    category: "design",
    employmentType: "contract",
    remoteMode: "remote",
    salaryRange: { min: 450, max: 650, currency: "GBP" },
    postedAt: isoHoursAgo(24 * 6),
    postedDate: dateHoursAgo(24 * 6),
    freshness: "active",
    summary: "Design compact filtering and right-panel workflows for demo job discovery.",
    applyUrl: "https://careers.example.com/juniper-learning/search-product-designer",
    requiredSkills: ["UX Research", "Interaction Design", "Design Systems"],
    description:
      "Demo role for Step 2. This contract role represents product design support for the globe UX.",
    trustLine: "Redirects to the official application portal",
    matchBreakdown: {
      score: null,
      summary: "Step 2 placeholder. Real match scoring starts in Step 4.",
      strengths: [{ label: "Interaction design", status: "strong" }],
      gaps: [{ label: "Geospatial UX examples", status: "partial" }],
    },
    quickPrep: {
      roleSummary: "Prepare to discuss progressive disclosure and dense information design.",
      skillsIHave: ["UX Research", "Design Systems"],
      skillsMissing: ["Geospatial case study"],
      interviewQuestions: [
        "How would you prevent a map UI from overwhelming users?",
        "How do you test filter discoverability?",
        "What states should a job panel include?",
      ],
      companyBrief: "Juniper Learning is a demo employer for education and discovery tools.",
      resumeTailoringNote: "Emphasize search, filtering, accessibility, and complex workflows.",
    },
  },
  {
    id: "demo-job-005",
    title: "Security Review Analyst",
    companyId: "demo-company-northstar",
    companyName: "Northstar Security",
    companyLogoUrl: null,
    location: {
      countryCode: "DE",
      countryName: "Germany",
      region: "Berlin",
      city: "Berlin",
      neighbourhood: "Mitte",
      latitude: 52.5208,
      longitude: 13.4094,
    },
    category: "security",
    employmentType: "full-time",
    remoteMode: "on-site",
    salaryRange: { min: 76000, max: 102000, currency: "EUR" },
    postedAt: isoHoursAgo(24 * 20),
    postedDate: dateHoursAgo(24 * 20),
    freshness: "active",
    summary: "Review demo source trust, redirect safety, and profile data handling controls.",
    applyUrl: "https://careers.example.com/northstar-security/security-review-analyst",
    requiredSkills: ["Security Review", "Privacy", "Risk Assessment"],
    description:
      "Demo role for Step 2. This job highlights trust and safety expectations for redirect-first workflows.",
    trustLine: "Redirects to the official application portal",
    matchBreakdown: {
      score: null,
      summary: "Step 2 placeholder. Real match scoring starts in Step 4.",
      strengths: [{ label: "Risk review", status: "strong" }],
      gaps: [{ label: "Job board abuse patterns", status: "unknown" }],
    },
    quickPrep: {
      roleSummary: "Prepare examples around privacy review, threat modeling, and trust controls.",
      skillsIHave: ["Security Review", "Privacy"],
      skillsMissing: ["ATS source review"],
      interviewQuestions: [
        "How would you validate an apply URL?",
        "What sensitive profile data should never be logged?",
        "How would you rank source trust?",
      ],
      companyBrief: "Northstar Security is a demo employer for product security roles.",
      resumeTailoringNote: "Highlight reviews that protected users or reduced risk.",
    },
  },
  {
    id: "demo-job-006",
    title: "Operations Coordinator",
    companyId: "demo-company-orbit",
    companyName: "Orbit Supply",
    companyLogoUrl: null,
    location: {
      countryCode: "SG",
      countryName: "Singapore",
      region: "Central",
      city: "Singapore",
      neighbourhood: "Marina Bay",
      latitude: 1.2836,
      longitude: 103.8602,
    },
    category: "operations",
    employmentType: "full-time",
    remoteMode: "on-site",
    salaryRange: { min: 72000, max: 92000, currency: "SGD" },
    postedAt: isoHoursAgo(24 * 45),
    postedDate: dateHoursAgo(24 * 45),
    freshness: "active",
    summary: "Coordinate hiring operations and demo cluster workflows across regional teams.",
    applyUrl: "https://careers.example.com/orbit-supply/operations-coordinator",
    requiredSkills: ["Operations", "Coordination", "Reporting"],
    description:
      "Demo role for Step 2. This opening adds operational variety to city and country views.",
    trustLine: "Redirects to the official application portal",
    matchBreakdown: {
      score: null,
      summary: "Step 2 placeholder. Real match scoring starts in Step 4.",
      strengths: [{ label: "Operations coordination", status: "strong" }],
      gaps: [{ label: "Regional hiring process", status: "partial" }],
    },
    quickPrep: {
      roleSummary: "Prepare to discuss process tracking and stakeholder coordination.",
      skillsIHave: ["Coordination", "Reporting"],
      skillsMissing: ["Regional compliance"],
      interviewQuestions: [
        "How do you keep a process visible across teams?",
        "What metrics would you report weekly?",
        "How do you handle conflicting deadlines?",
      ],
      companyBrief: "Orbit Supply is a demo employer for operations roles.",
      resumeTailoringNote: "Show examples of process ownership and measurable coordination.",
    },
  },
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

export function getCountryData(filters: SearchFilters): GlobeCountryDatum[] {
  return groupBy(filteredJobs(filters), (job) => job.location.countryCode)
    .map((jobs) => {
      const first = jobs[0];

      return {
        countryCode: first.location.countryCode,
        countryName: first.location.countryName,
        latitude: average(jobs.map((job) => job.location.latitude)),
        longitude: average(jobs.map((job) => job.location.longitude)),
        jobCount: jobs.length,
        topCategories: topBreakdown(
          jobs.map((job) => job.category),
          3,
        ),
        topMetroAreas: topBreakdown(
          jobs.map((job) => job.location.city),
          5,
        ),
      };
    })
    .sort((a, b) => b.jobCount - a.jobCount);
}

export function getCityData(filters: SearchFilters): GlobeCityDatum[] {
  return groupBy(filteredJobs(filters), (job) => `${job.location.countryCode}:${job.location.city}`)
    .map((jobs) => {
      const first = jobs[0];

      return {
        city: first.location.city,
        countryCode: first.location.countryCode,
        countryName: first.location.countryName,
        latitude: average(jobs.map((job) => job.location.latitude)),
        longitude: average(jobs.map((job) => job.location.longitude)),
        jobCount: jobs.length,
        topCategories: topBreakdown(
          jobs.map((job) => job.category),
          3,
        ),
      };
    })
    .sort((a, b) => b.jobCount - a.jobCount);
}

export function getCompanyBubbles(filters: SearchFilters): GlobeCompanyBubble[] {
  return groupBy(filteredJobs(filters), (job) => job.companyId)
    .map((jobs) => {
      const first = jobs[0];
      const size: GlobeCompanyBubble["size"] =
        jobs.length > 2 ? "lg" : jobs.length > 1 ? "md" : "sm";

      return {
        id: first.companyId,
        companyName: first.companyName,
        logoUrl: first.companyLogoUrl,
        city: first.location.city,
        countryCode: first.location.countryCode,
        latitude: average(jobs.map((job) => job.location.latitude)),
        longitude: average(jobs.map((job) => job.location.longitude)),
        jobCount: jobs.length,
        topCategory:
          topBreakdown(
            jobs.map((job) => job.category),
            1,
          )[0]?.label ?? first.category,
        size,
      };
    })
    .sort((a, b) => b.jobCount - a.jobCount);
}

export function getGlobeMarkers(filters: SearchFilters): GlobeMarker[] {
  return filteredJobs(filters).map((job) => ({
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

export function getJobList(filters: SearchFilters): JobSummary[] {
  return filteredJobs(filters).map(toJobSummary);
}

export function getJobDetail(jobId: string): JobDetail | null {
  return demoJobs.find((job) => job.id === jobId) ?? null;
}

export function isValidExternalApplyUrl(applyUrl: string): boolean {
  try {
    const url = new URL(applyUrl);

    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname !== "localhost";
  } catch {
    return false;
  }
}

function filteredJobs(filters: SearchFilters): JobDetail[] {
  return demoJobs.filter((job) => {
    if (filters.category && job.category !== filters.category) {
      return false;
    }

    if (filters.countryCode && job.location.countryCode !== filters.countryCode) {
      return false;
    }

    if (filters.city && job.location.city.toLowerCase() !== filters.city.toLowerCase()) {
      return false;
    }

    if (filters.remoteMode && job.remoteMode !== filters.remoteMode) {
      return false;
    }

    if (filters.jobType && job.employmentType !== filters.jobType) {
      return false;
    }

    if (!isWithinPostedWindow(job.postedAt, filters.postedWithin)) {
      return false;
    }

    if (filters.query) {
      const haystack = [
        job.title,
        job.companyName,
        job.category,
        job.summary,
        job.location.city,
        ...job.requiredSkills,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(filters.query.toLowerCase());
    }

    return true;
  });
}

function toJobSummary(job: JobDetail): JobSummary {
  const { description, trustLine, matchBreakdown, quickPrep, ...summary } = job;
  void description;
  void trustLine;
  void matchBreakdown;
  void quickPrep;

  return summary;
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

function isWithinPostedWindow(postedAt: string, postedWithin: PostedWithin): boolean {
  if (postedWithin === "any-time") {
    return true;
  }

  const postedAtMs = Date.parse(postedAt);
  if (Number.isNaN(postedAtMs)) {
    return false;
  }

  return Date.now() - postedAtMs <= postedWindowMs(postedWithin);
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

function isoHoursAgo(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

function dateHoursAgo(hoursAgo: number): string {
  return isoHoursAgo(hoursAgo).slice(0, 10);
}
