"use client";

import type { JobType, PostedWithin, RemoteMode, SearchFilters } from "@job-globe/shared-types";

const categories = [
  { label: "Software", value: "software-engineering" },
  { label: "AI / ML", value: "machine-learning" },
  { label: "Data", value: "data-analytics" },
  { label: "Design", value: "design" },
  { label: "Security", value: "security" },
  { label: "Operations", value: "operations" },
];

const countries = [
  { label: "Global", value: "" },
  { label: "United States", value: "US" },
  { label: "Canada", value: "CA" },
  { label: "United Kingdom", value: "GB" },
  { label: "Germany", value: "DE" },
  { label: "Singapore", value: "SG" },
];

const remoteModes: { label: string; value: RemoteMode }[] = [
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "On-site", value: "on-site" },
];

const jobTypes: { label: string; value: JobType }[] = [
  { label: "Internship", value: "internship" },
  { label: "New grad", value: "new-grad" },
  { label: "Full-time", value: "full-time" },
  { label: "Contract", value: "contract" },
];

const postedWithinOptions: { label: string; value: PostedWithin }[] = [
  { label: "Any time", value: "any-time" },
  { label: "Past 1 hour", value: "1hr" },
  { label: "Past 6 hours", value: "6hr" },
  { label: "Past 1 day", value: "1day" },
  { label: "Past 7 days", value: "7day" },
  { label: "Past month", value: "past-month" },
];

interface FilterBarProps {
  filters: SearchFilters;
  searchText: string;
  onFilterChange: (filters: Partial<SearchFilters>) => void;
  onSearchChange: (searchText: string) => void;
}

export function FilterBar({ filters, searchText, onFilterChange, onSearchChange }: FilterBarProps) {
  return (
    <form className="search-rack" role="search" onSubmit={(event) => event.preventDefault()}>
      <label className="search-field">
        <span className="visually-hidden">Search jobs</span>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
        </svg>
        <input
          value={searchText}
          autoComplete="off"
          placeholder="Search roles, skills, or companies"
          type="search"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      <label>
        <span>Category</span>
        <select
          value={filters.category ?? ""}
          onChange={(event) => onFilterChange({ category: event.target.value || null })}
        >
          <option value="">All</option>
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Place</span>
        <select
          value={filters.countryCode ?? ""}
          onChange={(event) =>
            onFilterChange({ countryCode: event.target.value || null, city: null })
          }
        >
          {countries.map((country) => (
            <option key={country.value || "global"} value={country.value}>
              {country.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Remote</span>
        <select
          value={filters.remoteMode ?? ""}
          onChange={(event) =>
            onFilterChange({ remoteMode: (event.target.value as RemoteMode) || null })
          }
        >
          <option value="">All</option>
          {remoteModes.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Type</span>
        <select
          value={filters.jobType ?? ""}
          onChange={(event) => onFilterChange({ jobType: (event.target.value as JobType) || null })}
        >
          <option value="">All</option>
          {jobTypes.map((jobType) => (
            <option key={jobType.value} value={jobType.value}>
              {jobType.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Posted</span>
        <select
          value={filters.postedWithin}
          onChange={(event) => onFilterChange({ postedWithin: event.target.value as PostedWithin })}
        >
          {postedWithinOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
