import { type NextRequest, NextResponse } from "next/server";

import type { JobsApiResponse } from "@job-globe/shared-types";
import {
  getCityData,
  getCompanyBubbles,
  getCountryData,
  getGlobeMarkers,
  getJobDetail,
  getJobList,
  isValidExternalApplyUrl,
  parseJobsApiMode,
  parseSearchFilters,
} from "@/lib/demo/jobs";

export async function GET(request: NextRequest) {
  const mode = parseJobsApiMode(request.nextUrl.searchParams);
  const filters = parseSearchFilters(request.nextUrl.searchParams);

  if (mode === "detail") {
    const jobId = request.nextUrl.searchParams.get("id");
    const job = jobId ? getJobDetail(jobId) : null;

    if (!job) {
      return NextResponse.json(
        { error: { code: "job_not_found", message: "Demo job not found." }, source: "demo" },
        { status: 404 },
      );
    }

    if (!isValidExternalApplyUrl(job.applyUrl)) {
      return NextResponse.json(
        {
          error: { code: "invalid_apply_url", message: "Demo job apply URL is not external." },
          source: "demo",
        },
        { status: 422 },
      );
    }

    const response: JobsApiResponse = { mode, source: "demo", job };
    return NextResponse.json(response);
  }

  if (mode === "jobs") {
    const response: JobsApiResponse = {
      mode,
      source: "demo",
      filters,
      jobs: getJobList(filters).filter((job) => isValidExternalApplyUrl(job.applyUrl)),
    };

    return NextResponse.json(response);
  }

  if (mode === "city") {
    const response: JobsApiResponse = {
      mode,
      source: "demo",
      filters,
      bubbles: getCompanyBubbles(filters),
      markers: getGlobeMarkers(filters),
    };

    return NextResponse.json(response);
  }

  if (mode === "country") {
    const countries = getCountryData(filters);
    const response: JobsApiResponse = {
      mode,
      source: "demo",
      filters,
      country: filters.countryCode
        ? (countries.find((country) => country.countryCode === filters.countryCode) ?? null)
        : (countries[0] ?? null),
      cities: getCityData(filters),
    };

    return NextResponse.json(response);
  }

  const response: JobsApiResponse = {
    mode: "global",
    source: "demo",
    filters,
    countries: getCountryData(filters),
  };

  return NextResponse.json(response);
}
