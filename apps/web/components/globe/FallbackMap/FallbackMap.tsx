"use client";

import type {
  GlobeCompanyBubble,
  GlobeMarker,
  GlobeZoomLayer,
  JobSummary,
} from "@job-globe/shared-types";

interface FallbackMapProps {
  activeLayer: GlobeZoomLayer;
  bubbles: GlobeCompanyBubble[];
  markers: GlobeMarker[];
  jobs: JobSummary[];
  onJobSelect: (jobId: string) => void;
  onCompanySelect: (companyId: string) => void;
}

export function FallbackMap({
  activeLayer,
  bubbles,
  markers,
  jobs,
  onJobSelect,
  onCompanySelect,
}: FallbackMapProps) {
  return (
    <section className="fallback-map" aria-label="2D fallback job map">
      <div className="fallback-grid" aria-hidden="true">
        {(activeLayer === "city" ? bubbles : markers).map((item) => (
          <button
            key={item.id}
            type="button"
            className="map-pin"
            style={{
              left: `${projectLongitude(item.longitude)}%`,
              top: `${projectLatitude(item.latitude)}%`,
            }}
            onClick={() =>
              "companyName" in item ? onCompanySelect(item.id) : onJobSelect(item.jobId)
            }
          >
            {"companyName" in item ? item.companyName.slice(0, 1) : "J"}
          </button>
        ))}
      </div>
      <div className="fallback-list">
        {jobs.map((job) => (
          <button
            key={job.id}
            type="button"
            className="job-row"
            onClick={() => onJobSelect(job.id)}
          >
            <span>
              <strong>{job.title}</strong>
              <small>
                {job.companyName} - {job.location.city}
              </small>
            </span>
            <span>{job.remoteMode}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function projectLongitude(longitude: number): number {
  return Math.min(Math.max(((longitude + 180) / 360) * 100, 6), 94);
}

function projectLatitude(latitude: number): number {
  return Math.min(Math.max(((90 - latitude) / 180) * 100, 10), 90);
}
