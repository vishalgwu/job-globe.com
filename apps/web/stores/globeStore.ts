"use client";

import { create } from "zustand";

import type { GlobeZoomLayer, SearchFilters } from "@job-globe/shared-types";

export type GlobeSelection =
  | { type: "country"; countryCode: string }
  | { type: "city"; countryCode: string; city: string }
  | { type: "company"; companyId: string }
  | { type: "job"; jobId: string }
  | null;

export interface GlobeStore {
  activeLayer: GlobeZoomLayer;
  filters: SearchFilters;
  searchText: string;
  selection: GlobeSelection;
  isLoading: boolean;
  error: string | null;
  setActiveLayer: (activeLayer: GlobeZoomLayer) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  setSearchText: (searchText: string) => void;
  setSelection: (selection: GlobeSelection) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetGlobeState: () => void;
}

const defaultFilters: SearchFilters = {
  category: null,
  countryCode: null,
  city: null,
  remoteMode: null,
  jobType: null,
  postedWithin: "any-time",
  query: null,
};

export const useGlobeStore = create<GlobeStore>((set) => ({
  activeLayer: "global",
  filters: defaultFilters,
  searchText: "",
  selection: null,
  isLoading: false,
  error: null,
  setActiveLayer: (activeLayer) => set({ activeLayer }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  setSearchText: (searchText) =>
    set((state) => ({
      searchText,
      filters: { ...state.filters, query: searchText.trim() || null },
    })),
  setSelection: (selection) => set({ selection }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  resetGlobeState: () =>
    set({
      activeLayer: "global",
      filters: defaultFilters,
      searchText: "",
      selection: null,
      isLoading: false,
      error: null,
    }),
}));
