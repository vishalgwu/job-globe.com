"use client";

import type { JobType, RemoteMode, SearchFilters } from "@job-globe/shared-types";

const categories = [
  "software-engineering",
  "machine-learning",
  "data-analytics",
  "design",
  "security",
  "operations",
];

const countries = [
  { label: "All Countries", value: "" },
  { label: "United States", value: "US" },
  { label: "Canada", value: "CA" },
  { label: "United Kingdom", value: "GB" },
  { label: "Germany", value: "DE" },
  { label: "Singapore", value: "SG" },
];

const remoteModes: RemoteMode[] = ["remote", "hybrid", "on-site"];
const jobTypes: JobType[] = ["internship", "new-grad", "full-time", "contract"];

interface FilterBarProps {
  filters: SearchFilters;
  searchText: string;
  onFilterChange: (filters: Partial<SearchFilters>) => void;
  onSearchChange: (searchText: string) => void;
}

export function FilterBar({ filters, searchText, onFilterChange, onSearchChange }: FilterBarProps) {
  return (
    <form className="filter-bar" role="search" onSubmit={(event) => event.preventDefault()}>
      <label className="field-control field-control--wide">
        <span>Search</span>
        <input
          value={searchText}
          placeholder="Company, role, skill"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      <label className="field-control">
        <span>Category</span>
        <select
          value={filters.category ?? ""}
          onChange={(event) => onFilterChange({ category: event.target.value || null })}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {formatLabel(category)}
            </option>
          ))}
        </select>
      </label>
      <label className="field-control">
        <span>Country</span>
        <select
          value={filters.countryCode ?? ""}
          onChange={(event) =>
            onFilterChange({ countryCode: event.target.value || null, city: null })
          }
        >
          {countries.map((country) => (
            <option key={country.value || "all"} value={country.value}>
              {country.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field-control">
        <span>Remote</span>
        <select
          value={filters.remoteMode ?? ""}
          onChange={(event) =>
            onFilterChange({ remoteMode: (event.target.value as RemoteMode) || null })
          }
        >
          <option value="">Any mode</option>
          {remoteModes.map((mode) => (
            <option key={mode} value={mode}>
              {formatLabel(mode)}
            </option>
          ))}
        </select>
      </label>
      <label className="field-control">
        <span>Type</span>
        <select
          value={filters.jobType ?? ""}
          onChange={(event) => onFilterChange({ jobType: (event.target.value as JobType) || null })}
        >
          <option value="">Any type</option>
          {jobTypes.map((jobType) => (
            <option key={jobType} value={jobType}>
              {formatLabel(jobType)}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
