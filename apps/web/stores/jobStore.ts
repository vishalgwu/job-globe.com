"use client";

import { create } from "zustand";

import type { JobDetail, JobSummary } from "@job-globe/shared-types";

const savedJobsStorageKey = "job-globe.demo.saved-job-ids";

export interface JobStore {
  jobs: JobSummary[];
  selectedJobId: string | null;
  selectedJob: JobDetail | null;
  isPanelOpen: boolean;
  isLoading: boolean;
  error: string | null;
  savedJobIds: string[];
  setJobs: (jobs: JobSummary[]) => void;
  setSelectedJob: (job: JobDetail | null) => void;
  setPanelOpen: (isPanelOpen: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  hydrateSavedJobs: () => void;
  toggleSavedJob: (jobId: string) => void;
  isJobSaved: (jobId: string) => boolean;
}

export const useJobStore = create<JobStore>((set, get) => ({
  jobs: [],
  selectedJobId: null,
  selectedJob: null,
  isPanelOpen: false,
  isLoading: false,
  error: null,
  savedJobIds: [],
  setJobs: (jobs) => set({ jobs }),
  setSelectedJob: (job) =>
    set({
      selectedJob: job,
      selectedJobId: job?.id ?? null,
      isPanelOpen: Boolean(job),
    }),
  setPanelOpen: (isPanelOpen) => set({ isPanelOpen }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  hydrateSavedJobs: () => set({ savedJobIds: readSavedJobIds() }),
  toggleSavedJob: (jobId) => {
    const savedJobIds = get().savedJobIds.includes(jobId)
      ? get().savedJobIds.filter((savedJobId) => savedJobId !== jobId)
      : [...get().savedJobIds, jobId];

    writeSavedJobIds(savedJobIds);
    set({ savedJobIds });
  },
  isJobSaved: (jobId) => get().savedJobIds.includes(jobId),
}));

function readSavedJobIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.sessionStorage.getItem(savedJobsStorageKey);
    const parsedValue: unknown = rawValue ? JSON.parse(rawValue) : [];

    return Array.isArray(parsedValue)
      ? parsedValue.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeSavedJobIds(savedJobIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(savedJobsStorageKey, JSON.stringify(savedJobIds));
}
