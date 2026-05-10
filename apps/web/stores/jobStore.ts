"use client";

import { create } from "zustand";

import type { JobDetail, JobSummary } from "@job-globe/shared-types";

// Session storage is used as a fallback for unauthenticated users.
const SESSION_STORAGE_KEY = "job-globe.demo.saved-job-ids";

export interface JobStore {
  jobs: JobSummary[];
  selectedJobId: string | null;
  selectedJob: JobDetail | null;
  isPanelOpen: boolean;
  isLoading: boolean;
  error: string | null;
  savedJobIds: string[];
  /** True once we've confirmed the user is authenticated. */
  isAuthenticated: boolean;
  setJobs: (jobs: JobSummary[]) => void;
  setSelectedJob: (job: JobDetail | null) => void;
  setPanelOpen: (isPanelOpen: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  /** Load saved job IDs — uses /api/saved-jobs if authenticated, sessionStorage otherwise. */
  hydrateSavedJobs: () => Promise<void>;
  /** Toggle a saved job — persists to API or sessionStorage based on auth state. */
  toggleSavedJob: (jobId: string) => Promise<void>;
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
  isAuthenticated: false,

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
  isJobSaved: (jobId) => get().savedJobIds.includes(jobId),

  hydrateSavedJobs: async () => {
    try {
      // Check auth state first
      const sessionRes = await fetch("/api/auth/session");
      const session = (await sessionRes.json()) as {
        authenticated: boolean;
        userId?: string;
      };

      if (session.authenticated) {
        // Authenticated — fetch from the database
        set({ isAuthenticated: true });
        const res = await fetch("/api/saved-jobs");
        if (res.ok) {
          const data = (await res.json()) as { savedJobs: Array<{ job_id: string }> };
          set({ savedJobIds: (data.savedJobs ?? []).map((j) => j.job_id) });
        }
      } else {
        // Unauthenticated — read from session storage
        set({ isAuthenticated: false, savedJobIds: readSessionSavedIds() });
      }
    } catch {
      // Non-fatal — fall back to session storage
      set({ savedJobIds: readSessionSavedIds() });
    }
  },

  toggleSavedJob: async (jobId: string) => {
    const { savedJobIds, isAuthenticated } = get();
    const isSaved = savedJobIds.includes(jobId);

    // Optimistic update
    const next = isSaved
      ? savedJobIds.filter((id) => id !== jobId)
      : [...savedJobIds, jobId];
    set({ savedJobIds: next });

    if (isAuthenticated) {
      try {
        if (isSaved) {
          await fetch(`/api/saved-jobs?jobId=${encodeURIComponent(jobId)}`, {
            method: "DELETE",
          });
        } else {
          await fetch("/api/saved-jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId }),
          });
        }
      } catch {
        // Roll back optimistic update on failure
        set({ savedJobIds });
      }
    } else {
      // Unauthenticated — persist to session storage
      writeSessionSavedIds(next);
    }
  },
}));

// ── Session storage helpers (unauthenticated fallback) ───────────────────

function readSessionSavedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeSessionSavedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(ids));
}
