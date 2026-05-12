"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  GlobeCityDatum,
  GlobeCompanyBubble,
  GlobeCountryDatum,
  GlobeMarker,
  GlobeMetricBreakdown,
  GlobeZoomLayer,
  JobDetail,
  JobSummary,
  JobsApiResponse,
} from "@job-globe/shared-types";

import { FilterBar } from "../../filters/FilterBar/FilterBar";
import {
  JobComparePanel,
  type CompareJobResult,
} from "../../job-panel/JobComparePanel/JobComparePanel";
import { JobPanel } from "../../job-panel/JobPanel/JobPanel";
import { FallbackMap } from "../FallbackMap/FallbackMap";
import { GlobeCanvas } from "../GlobeCanvas/GlobeCanvas";
import { IntroOverlay } from "../IntroOverlay/IntroOverlay";
import { ZoomController } from "../ZoomController/ZoomController";
import { useGlobeStore } from "../../../stores/globeStore";
import { useJobStore } from "../../../stores/jobStore";

interface SummaryItem {
  label: string;
  value: string;
  onSelect?: () => void;
}

interface LayerSummary {
  title: string;
  copy: string;
  jobs: string;
  velocity: string;
  categories: GlobeMetricBreakdown[];
  items: SummaryItem[];
  breadcrumb: string;
  plottedSignals: number;
}

interface CompareApiResponse {
  jobs?: CompareJobResult[];
  topMatch?: { id: string; score: number } | null;
  error?: string;
}

export function GlobeExperience() {
  const {
    activeLayer,
    filters,
    searchText,
    isLoading,
    error,
    setActiveLayer,
    setFilters,
    setSearchText,
    setSelection,
    setLoading,
    setError,
  } = useGlobeStore();
  const {
    jobs,
    selectedJobId,
    selectedJob,
    isPanelOpen,
    savedJobIds,
    setJobs,
    setSelectedJob,
    setPanelOpen,
    hydrateSavedJobs,
    toggleSavedJob,
    isJobSaved,
  } = useJobStore();

  const [countries, setCountries] = useState<GlobeCountryDatum[]>([]);
  const [cities, setCities] = useState<GlobeCityDatum[]>([]);
  const [bubbles, setBubbles] = useState<GlobeCompanyBubble[]>([]);
  const [markers, setMarkers] = useState<GlobeMarker[]>([]);
  const [isPanelLoading, setPanelLoading] = useState(false);
  const [forceFallback, setForceFallback] = useState(false);
  const [listMode, setListMode] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [introVisible, setIntroVisible] = useState(true);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareJobs, setCompareJobs] = useState<CompareJobResult[]>([]);
  const [compareTopMatchId, setCompareTopMatchId] = useState<string | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void hydrateSavedJobs();
      setWebglAvailable(detectWebGL());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [hydrateSavedJobs]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryString = toQueryString(filters);
      const [globalResponse, countryResponse, cityResponse, jobsResponse] = await Promise.all([
        fetch(jobsUrl("global", queryString)),
        fetch(jobsUrl("country", queryString)),
        fetch(jobsUrl("city", queryString)),
        fetch(jobsUrl("jobs", queryString)),
      ]);

      if (!globalResponse.ok || !countryResponse.ok || !cityResponse.ok || !jobsResponse.ok) {
        throw new Error("Demo search API returned an error.");
      }

      const globalData = (await globalResponse.json()) as JobsApiResponse;
      const countryData = (await countryResponse.json()) as JobsApiResponse;
      const cityData = (await cityResponse.json()) as JobsApiResponse;
      const jobsData = (await jobsResponse.json()) as JobsApiResponse;

      if (globalData.mode === "global") {
        setCountries(globalData.countries);
      }

      if (countryData.mode === "country") {
        setCities(countryData.cities);
      }

      if (cityData.mode === "city") {
        setBubbles(cityData.bubbles);
        setMarkers(cityData.markers);
      }

      if (jobsData.mode === "jobs") {
        setJobs(jobsData.jobs);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load demo search data.");
    } finally {
      setLoading(false);
    }
  }, [filters, setError, setJobs, setLoading]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const openJob = useCallback(
    async (jobId: string) => {
      setPanelLoading(true);
      setSelection({ type: "job", jobId });
      setPanelOpen(true);

      try {
        const response = await fetch(`/api/jobs?mode=detail&id=${encodeURIComponent(jobId)}`);
        if (!response.ok) {
          throw new Error("Job detail is unavailable.");
        }

        const data = (await response.json()) as JobsApiResponse;
        if (data.mode === "detail") {
          setSelectedJob(data.job);
        }
      } catch {
        setSelectedJob(null);
      } finally {
        setPanelLoading(false);
      }
    },
    [setPanelOpen, setSelectedJob, setSelection],
  );

  const openCompany = useCallback(
    (companyId: string) => {
      setSelection({ type: "company", companyId });
      setActiveLayer("neighbourhood");
      const firstCompanyJob = jobs.find((job) => job.companyId === companyId);
      if (firstCompanyJob) {
        void openJob(firstCompanyJob.id);
      }
    },
    [jobs, openJob, setActiveLayer, setSelection],
  );

  const selectCountry = useCallback(
    (countryCode: string) => {
      setFilters({ countryCode, city: null });
      setSelection({ type: "country", countryCode });
      setActiveLayer("country");
    },
    [setActiveLayer, setFilters, setSelection],
  );

  const selectCity = useCallback(
    (countryCode: string, city: string) => {
      setFilters({ countryCode, city });
      setSelection({ type: "city", countryCode, city });
      setActiveLayer("city");
    },
    [setActiveLayer, setFilters, setSelection],
  );

  const setLayer = useCallback(
    (layer: GlobeZoomLayer) => {
      setActiveLayer(layer);
      if (layer === "neighbourhood" && !filters.city && cities[0]) {
        setFilters({ countryCode: cities[0].countryCode, city: cities[0].city });
      }
    },
    [cities, filters.city, setActiveLayer, setFilters],
  );

  const toggleCompareJob = useCallback((jobId: string) => {
    setCompareError(null);
    setCompareIds((current) => {
      if (current.includes(jobId)) {
        return current.filter((id) => id !== jobId);
      }
      if (current.length >= 4) {
        return [...current.slice(1), jobId];
      }
      return [...current, jobId];
    });
  }, []);

  const clearComparison = useCallback(() => {
    setCompareIds([]);
    setCompareJobs([]);
    setCompareTopMatchId(null);
    setCompareError(null);
    setCompareOpen(false);
  }, []);

  const openComparison = useCallback(async () => {
    if (compareIds.length < 2) {
      return;
    }

    setCompareOpen(true);
    setCompareLoading(true);
    setCompareError(null);

    try {
      const ids = compareIds.map(encodeURIComponent).join(",");
      const response = await fetch(`/api/jobs/compare?ids=${ids}`, { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as CompareApiResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to compare these jobs.");
      }
      setCompareJobs(data.jobs ?? []);
      setCompareTopMatchId(data.topMatch?.id ?? null);
    } catch (comparisonError) {
      setCompareJobs([]);
      setCompareTopMatchId(null);
      setCompareError(
        comparisonError instanceof Error
          ? comparisonError.message
          : "Unable to compare these jobs.",
      );
    } finally {
      setCompareLoading(false);
    }
  }, [compareIds]);

  const summary = useMemo(
    () =>
      buildLayerSummary({
        activeLayer,
        countries,
        cities,
        bubbles,
        markers,
        jobs,
        selectCountry,
        selectCity,
        openCompany,
        openJob,
      }),
    [
      activeLayer,
      bubbles,
      cities,
      countries,
      jobs,
      markers,
      openCompany,
      openJob,
      selectCity,
      selectCountry,
    ],
  );
  const showFallback = forceFallback || !webglAvailable;
  const queryString = toQueryString(filters);

  return (
    <main className="globe-rich">
      <IntroOverlay
        isVisible={introVisible}
        onEnter={() => setIntroVisible(false)}
        onPersonalize={() => { setIntroVisible(false); window.location.href = "/onboarding"; }}
      />
      <a className="skip-link" href="#globe-list-mode">
        Skip to job list
      </a>
      <div className="app-shell">
        <header className="command-bar" aria-label="Job search controls">
          <div className="brand-block">
            <div className="brand-mark" aria-hidden="true">
              JG
            </div>
            <div>
              <p className="eyebrow">Jarvis Job Globe</p>
              <h1>Global hiring intelligence</h1>
            </div>
          </div>
          <FilterBar
            filters={filters}
            searchText={searchText}
            onFilterChange={setFilters}
            onSearchChange={setSearchText}
          />
          <div className="view-actions" aria-label="View options">
            <Link className="icon-button" href="/onboarding">
              Profile
            </Link>
            <button
              className="icon-button"
              type="button"
              aria-pressed={showFallback}
              onClick={() => setForceFallback((value) => !value)}
            >
              {showFallback ? "3D" : "2D"}
            </button>
            <button
              className="icon-button"
              type="button"
              aria-pressed={listMode}
              onClick={() => setListMode((value) => !value)}
            >
              List
            </button>
          </div>
        </header>

        <section className="experience-grid">
          <aside className="intel-panel" aria-label="Selected geography summary">
            <section>
              <p className="eyebrow">Live layer</p>
              <ZoomController activeLayer={activeLayer} onLayerChange={setLayer} />
            </section>
            <section className="summary-block">
              <p className="eyebrow">Demand summary</p>
              <h2>{summary.title}</h2>
              <p>{summary.copy}</p>
              <div className="metric-grid">
                <div>
                  <strong>{summary.jobs}</strong>
                  <span>open roles</span>
                </div>
                <div>
                  <strong>{summary.velocity}</strong>
                  <span>7 day velocity</span>
                </div>
              </div>
            </section>
            <section>
              <p className="eyebrow">Top categories</p>
              <div className="chip-stack">
                {summary.categories.slice(0, 5).map((category) => (
                  <span key={category.label}>{formatLabel(category.label)}</span>
                ))}
              </div>
            </section>
            <section>
              <p className="eyebrow">Top signals</p>
              <ol className="metro-list">
                {summary.items.slice(0, 5).map((item) => (
                  <li key={item.label}>
                    <button type="button" onClick={item.onSelect}>
                      {item.label}
                    </button>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ol>
            </section>
            <section className="endpoint-readout">
              <span>Data route</span>
              <code>
                {jobsUrl(activeLayer === "neighbourhood" ? "jobs" : activeLayer, queryString)}
              </code>
            </section>
          </aside>

          <section className="map-viewport" aria-label="Interactive job globe" aria-busy={isLoading}>
            <div className="map-status" aria-live="polite" aria-atomic="true">
              <span>{summary.breadcrumb}</span>
              <strong>
                {isLoading ? "Loading signals…" : `${summary.plottedSignals} plotted signals`}
              </strong>
            </div>
            {error ? <p className="error-text globe-error" role="alert">{error}</p> : null}
            {showFallback ? (
              <FallbackMap
                activeLayer={activeLayer}
                countries={countries}
                cities={cities}
                bubbles={bubbles}
                markers={markers}
                onCountrySelect={selectCountry}
                onCitySelect={selectCity}
                onCompanySelect={openCompany}
                onJobSelect={openJob}
              />
            ) : (
              <GlobeCanvas
                activeLayer={activeLayer}
                countries={countries}
                cities={cities}
                bubbles={bubbles}
                markers={markers}
                isLoading={isLoading}
                selectedJobId={selectedJobId}
                onCountrySelect={selectCountry}
                onCitySelect={selectCity}
                onCompanySelect={openCompany}
                onJobSelect={openJob}
              />
            )}
            <div className="legend-bar" aria-label="Hiring density legend">
              <span>Hiring density</span>
              <div className="legend-ramp" aria-hidden="true" />
              <span>Low</span>
              <span>High</span>
            </div>
            <div
              className={`jobs-list-panel ${listMode ? "is-open" : ""}`}
              id="globe-list-mode"
              role="region"
              aria-label="Accessible job list"
              aria-expanded={listMode}
            >
              <div className="list-panel-head">
                <h2>Accessible job list</h2>
                <button type="button" aria-label="Close job list" onClick={() => setListMode(false)}>
                  <span aria-hidden="true">✕</span>
                </button>
              </div>
              <div className="job-list">
                {jobs.length === 0 ? (
                  <p className="detail-company">No jobs match the active filters.</p>
                ) : null}
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    className={`list-item${jobMatchesSearch(job, searchText) ? " is-match" : ""}`}
                    onClick={() => {
                      setActiveLayer("neighbourhood");
                      void openJob(job.id);
                    }}
                  >
                    <strong>{job.title}</strong>
                    <span>
                      {job.companyName} | {job.location.city} | {formatLabel(job.remoteMode)} |{" "}
                      {formatSalary(job)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <JobPanel
            job={selectedJob as JobDetail | null}
            isOpen={isPanelOpen}
            isLoading={isPanelLoading}
            isSaved={selectedJob ? isJobSaved(selectedJob.id) : false}
            isCompared={selectedJob ? compareIds.includes(selectedJob.id) : false}
            onClose={() => setPanelOpen(false)}
            onSave={toggleSavedJob}
            onCompare={toggleCompareJob}
          />
        </section>
        <JobComparePanel
          isOpen={compareOpen}
          isLoading={compareLoading}
          error={compareError}
          jobs={compareJobs}
          topMatchId={compareTopMatchId}
          onClose={() => setCompareOpen(false)}
          onOpenJob={(jobId) => {
            setCompareOpen(false);
            void openJob(jobId);
          }}
        />
        {compareIds.length > 0 ? (
          <div className="compare-tray" aria-live="polite">
            <span>Compare {compareIds.length}/4</span>
            <button
              type="button"
              disabled={compareIds.length < 2 || compareLoading}
              onClick={() => void openComparison()}
            >
              {compareLoading ? "Loading" : "Compare"}
            </button>
            <button type="button" onClick={clearComparison}>
              Clear
            </button>
          </div>
        ) : null}
        <div className="saved-tray" aria-live="polite">
          Saved jobs: {savedJobIds.length}
        </div>
      </div>
    </main>
  );
}

function buildLayerSummary({
  activeLayer,
  countries,
  cities,
  bubbles,
  markers,
  jobs,
  selectCountry,
  selectCity,
  openCompany,
  openJob,
}: {
  activeLayer: GlobeZoomLayer;
  countries: GlobeCountryDatum[];
  cities: GlobeCityDatum[];
  bubbles: GlobeCompanyBubble[];
  markers: GlobeMarker[];
  jobs: JobSummary[];
  selectCountry: (countryCode: string) => void;
  selectCity: (countryCode: string, city: string) => void;
  openCompany: (companyId: string) => void;
  openJob: (jobId: string) => void;
}): LayerSummary {
  if (activeLayer === "country") {
    return {
      title: "Country demand",
      copy: "Metro-level density shows where filtered roles are concentrated inside the selected market.",
      jobs: formatCount(sum(cities.map((city) => city.jobCount))),
      velocity: "+8%",
      categories: topMetrics(cities.flatMap((city) => city.topCategories)),
      items: cities.map((city) => ({
        label: city.city,
        value: formatCount(city.jobCount),
        onSelect: () => selectCity(city.countryCode, city.city),
      })),
      breadcrumb: "Country layer",
      plottedSignals: cities.length,
    };
  }

  if (activeLayer === "city") {
    return {
      title: "Company demand",
      copy: "Company bubbles are sized by current posting count. Select a bubble to expose precise role markers.",
      jobs: formatCount(sum(bubbles.map((bubble) => bubble.jobCount))),
      velocity: "+8%",
      categories: topMetrics(
        bubbles.map((bubble) => ({ label: bubble.topCategory, count: bubble.jobCount })),
      ),
      items: bubbles.map((bubble) => ({
        label: bubble.companyName,
        value: formatCount(bubble.jobCount),
        onSelect: () => openCompany(bubble.id),
      })),
      breadcrumb: "City company layer",
      plottedSignals: bubbles.length,
    };
  }

  if (activeLayer === "neighbourhood") {
    return {
      title: "Role signals",
      copy: "Precise job markers expose role snippets, salary hints, freshness, and remote mode.",
      jobs: formatCount(jobs.length),
      velocity: "+5%",
      categories: topMetrics(jobs.map((job) => ({ label: job.category, count: 1 }))),
      items: jobs.map((job) => ({
        label: job.title,
        value: formatSalary(job),
        onSelect: () => openJob(job.id),
      })),
      breadcrumb: "Neighbourhood role layer",
      plottedSignals: markers.length,
    };
  }

  return {
    title: "Global hiring demand",
    copy: "Country-level density reveals where hiring pressure is strongest. Click a country to inspect metro demand.",
    jobs: formatCount(sum(countries.map((country) => country.jobCount))),
    velocity: "+14%",
    categories: topMetrics(countries.flatMap((country) => country.topCategories)),
    items: countries.map((country) => ({
      label: country.countryName,
      value: formatCount(country.jobCount),
      onSelect: () => selectCountry(country.countryCode),
    })),
    breadcrumb: "Global demand layer",
    plottedSignals: countries.length,
  };
}

function topMetrics(metrics: GlobeMetricBreakdown[]): GlobeMetricBreakdown[] {
  const counts = new Map<string, number>();

  for (const metric of metrics) {
    counts.set(metric.label, (counts.get(metric.label) ?? 0) + metric.count);
  }

  return Array.from(counts, ([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);
}

function toQueryString(filters: {
  category: string | null;
  countryCode: string | null;
  city: string | null;
  remoteMode: string | null;
  jobType: string | null;
  postedWithin: string;
  query: string | null;
}): string {
  const params = new URLSearchParams();

  if (filters.category) params.set("category", filters.category);
  if (filters.countryCode) params.set("country", filters.countryCode);
  if (filters.city) params.set("city", filters.city);
  if (filters.remoteMode) params.set("remote", filters.remoteMode);
  if (filters.jobType) params.set("jobType", filters.jobType);
  if (filters.postedWithin !== "any-time") params.set("postedWithin", filters.postedWithin);
  if (filters.query) params.set("q", filters.query);

  return params.toString();
}

function jobsUrl(
  mode: Exclude<GlobeZoomLayer, "neighbourhood"> | "jobs",
  queryString: string,
): string {
  return `/api/jobs?mode=${mode}${queryString ? `&${queryString}` : ""}`;
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function jobMatchesSearch(job: JobSummary, searchText: string): boolean {
  const query = searchText.trim().toLowerCase();

  if (!query) {
    return false;
  }

  return [job.title, job.companyName, job.location.city, job.category, ...job.requiredSkills]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function formatSalary(job: JobSummary): string {
  if (!job.salaryRange || job.salaryRange.min === null || job.salaryRange.max === null) {
    return "Salary not listed";
  }

  return `${job.salaryRange.currency} ${job.salaryRange.min.toLocaleString()}-${job.salaryRange.max.toLocaleString()}`;
}

function formatCount(value: number): string {
  return value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
