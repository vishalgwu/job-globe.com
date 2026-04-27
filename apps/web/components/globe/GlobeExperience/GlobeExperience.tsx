"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type {
  GlobeCityDatum,
  GlobeCompanyBubble,
  GlobeCountryDatum,
  GlobeMarker,
  JobDetail,
  JobsApiResponse,
} from "@job-globe/shared-types";

import { FilterBar } from "../../filters/FilterBar/FilterBar";
import { JobPanel } from "../../job-panel/JobPanel/JobPanel";
import { FallbackMap } from "../FallbackMap/FallbackMap";
import { GlobeCanvas } from "../GlobeCanvas/GlobeCanvas";
import { IntroOverlay } from "../IntroOverlay/IntroOverlay";
import { ZoomController } from "../ZoomController/ZoomController";
import { useGlobeStore } from "../../../stores/globeStore";
import { useJobStore } from "../../../stores/jobStore";

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
  const [introVisible, setIntroVisible] = useState(true);
  const [isMuted, setMuted] = useState(true);
  const [forceFallback, setForceFallback] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState(true);

  useEffect(() => {
    hydrateSavedJobs();

    const timeoutId = window.setTimeout(() => {
      setMuted(window.localStorage.getItem("job-globe-muted") !== "false");
      setIntroVisible(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      setWebglAvailable(detectWebGL());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [hydrateSavedJobs]);

  useEffect(() => {
    window.localStorage.setItem("job-globe-muted", String(isMuted));
  }, [isMuted]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryString = toQueryString(filters);
      const [globalResponse, countryResponse, cityResponse, jobsResponse] = await Promise.all([
        fetch(`/api/jobs?mode=global&${queryString}`),
        fetch(`/api/jobs?mode=country&${queryString}`),
        fetch(`/api/jobs?mode=city&${queryString}`),
        fetch(`/api/jobs?mode=jobs&${queryString}`),
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
      const firstCompanyJob = jobs.find((job) => job.companyId === companyId);
      if (firstCompanyJob) {
        void openJob(firstCompanyJob.id);
      }
    },
    [jobs, openJob, setSelection],
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

  const activeJobs = useMemo(() => jobs.slice(0, 8), [jobs]);
  const showFallback = forceFallback || !webglAvailable;

  return (
    <main className="globe-app">
      <a className="skip-link" href="#globe-list-mode">
        Skip to job list
      </a>
      <IntroOverlay
        isVisible={introVisible}
        isMuted={isMuted}
        onEnter={() => setIntroVisible(false)}
        onPersonalize={() => {
          window.location.href = "/onboarding";
        }}
        onDemoCluster={() => {
          setIntroVisible(false);
          selectCity("US", "New York");
          setActiveLayer("neighbourhood");
        }}
        onMutedChange={setMuted}
      />
      <section className="globe-workspace">
        <header className="app-header">
          <div>
            <p className="eyebrow">Jarvis Job Globe</p>
            <h1>Find opportunity on the globe.</h1>
          </div>
          <div className="header-actions">
            <Link href="/onboarding">Personalise</Link>
            <button type="button" onClick={() => setForceFallback((value) => !value)}>
              {showFallback ? "3D View" : "2D View"}
            </button>
          </div>
        </header>
        <FilterBar
          filters={filters}
          searchText={searchText}
          onFilterChange={setFilters}
          onSearchChange={setSearchText}
        />
        <ZoomController activeLayer={activeLayer} onLayerChange={setActiveLayer} />
        {error ? <p className="error-text">{error}</p> : null}
        {showFallback ? (
          <FallbackMap
            activeLayer={activeLayer}
            bubbles={bubbles}
            markers={markers}
            jobs={activeJobs}
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
            jobs={activeJobs}
            isLoading={isLoading}
            onCountrySelect={selectCountry}
            onCitySelect={selectCity}
            onCompanySelect={openCompany}
            onJobSelect={openJob}
          />
        )}
      </section>
      <JobPanel
        job={selectedJob as JobDetail | null}
        isOpen={isPanelOpen}
        isLoading={isPanelLoading}
        isSaved={selectedJob ? isJobSaved(selectedJob.id) : false}
        onClose={() => setPanelOpen(false)}
        onSave={toggleSavedJob}
      />
      <div className="saved-tray" aria-live="polite">
        Saved jobs: {savedJobIds.length}
      </div>
    </main>
  );
}

function toQueryString(filters: {
  category: string | null;
  countryCode: string | null;
  city: string | null;
  remoteMode: string | null;
  jobType: string | null;
  query: string | null;
}): string {
  const params = new URLSearchParams();

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.countryCode) {
    params.set("country", filters.countryCode);
  }

  if (filters.city) {
    params.set("city", filters.city);
  }

  if (filters.remoteMode) {
    params.set("remote", filters.remoteMode);
  }

  if (filters.jobType) {
    params.set("jobType", filters.jobType);
  }

  if (filters.query) {
    params.set("q", filters.query);
  }

  return params.toString();
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}
