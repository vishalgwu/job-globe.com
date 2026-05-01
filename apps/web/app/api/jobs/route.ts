import { type NextRequest, NextResponse } from "next/server";

import type { JobsApiResponse } from "@job-globe/shared-types";
import { parseJobsApiMode, parseSearchFilters } from "@/lib/jobs/filters";
import {
  getCityData,
  getCompanyBubbles,
  getCountryData,
  getGlobeMarkers,
  getJobDetail,
  getJobList,
  getSupabaseJobs,
} from "@/lib/jobs/supabaseJobs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const mode = parseJobsApiMode(request.nextUrl.searchParams);
  const filters = parseSearchFilters(request.nextUrl.searchParams);

  try {
    if (mode === "detail") {
      const jobId = request.nextUrl.searchParams.get("id");
      const job = jobId ? await getJobDetail(jobId) : null;

      if (!job) {
        return NextResponse.json(
          { error: { code: "job_not_found", message: "Supabase job not found." }, source: "supabase" },
          { status: 404 },
        );
      }

      const response: JobsApiResponse = { mode, source: "supabase", job };
      return NextResponse.json(response);
    }

    const jobs = await getSupabaseJobs(filters);

    if (mode === "jobs") {
      const response: JobsApiResponse = {
        mode,
        source: "supabase",
        filters,
        jobs: getJobList(jobs),
      };

      return NextResponse.json(response);
    }

    if (mode === "city") {
      const response: JobsApiResponse = {
        mode,
        source: "supabase",
        filters,
        bubbles: getCompanyBubbles(jobs),
        markers: getGlobeMarkers(jobs),
      };

      return NextResponse.json(response);
    }

    if (mode === "country") {
      const countries = getCountryData(jobs);
      const response: JobsApiResponse = {
        mode,
        source: "supabase",
        filters,
        country: filters.countryCode
          ? (countries.find((country) => country.countryCode === filters.countryCode) ?? null)
          : (countries[0] ?? null),
        cities: getCityData(jobs),
      };

      return NextResponse.json(response);
    }

    const response: JobsApiResponse = {
      mode: "global",
      source: "supabase",
      filters,
      countries: getCountryData(jobs),
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "jobs_query_failed",
          message: error instanceof Error ? error.message : "Unable to load Supabase jobs.",
        },
        source: "supabase",
      },
      { status: 500 },
    );
  }
}
