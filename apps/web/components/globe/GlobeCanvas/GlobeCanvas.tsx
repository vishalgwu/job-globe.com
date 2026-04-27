import type {
  GlobeCityDatum,
  GlobeCompanyBubble,
  GlobeCountryDatum,
  GlobeMarker,
  GlobeZoomLayer,
  JobSummary,
} from "@job-globe/shared-types";

interface GlobeCanvasProps {
  activeLayer: GlobeZoomLayer;
  countries: GlobeCountryDatum[];
  cities: GlobeCityDatum[];
  bubbles: GlobeCompanyBubble[];
  markers: GlobeMarker[];
  jobs: JobSummary[];
  isLoading: boolean;
  onCountrySelect: (countryCode: string) => void;
  onCitySelect: (countryCode: string, city: string) => void;
  onCompanySelect: (companyId: string) => void;
  onJobSelect: (jobId: string) => void;
}

export function GlobeCanvas({
  activeLayer,
  countries,
  cities,
  bubbles,
  markers,
  jobs,
  isLoading,
  onCountrySelect,
  onCitySelect,
  onCompanySelect,
  onJobSelect,
}: GlobeCanvasProps) {
  const maxCountryCount = Math.max(...countries.map((country) => country.jobCount), 1);

  return (
    <section className="globe-canvas" aria-label="Global job demand map">
      <div className="globe-visual" aria-hidden="true">
        <div className={`globe-sphere globe-sphere--${activeLayer}`}>
          <div className="globe-grid" />
          {activeLayer === "global" &&
            countries.map((country) => (
              <button
                key={country.countryCode}
                className="globe-point globe-point--country"
                type="button"
                style={{
                  left: `${projectLongitude(country.longitude)}%`,
                  top: `${projectLatitude(country.latitude)}%`,
                  width: `${28 + (country.jobCount / maxCountryCount) * 24}px`,
                  height: `${28 + (country.jobCount / maxCountryCount) * 24}px`,
                }}
                title={`${country.countryName}: ${country.jobCount} jobs`}
                onClick={() => onCountrySelect(country.countryCode)}
              >
                {country.countryCode}
              </button>
            ))}
          {activeLayer === "country" &&
            cities.map((city) => (
              <button
                key={`${city.countryCode}-${city.city}`}
                className="globe-point globe-point--city"
                type="button"
                style={{
                  left: `${projectLongitude(city.longitude)}%`,
                  top: `${projectLatitude(city.latitude)}%`,
                }}
                title={`${city.city}: ${city.jobCount} jobs`}
                onClick={() => onCitySelect(city.countryCode, city.city)}
              >
                {city.jobCount}
              </button>
            ))}
          {activeLayer === "city" &&
            bubbles.map((bubble) => (
              <button
                key={bubble.id}
                className={`globe-point globe-point--bubble globe-point--${bubble.size}`}
                type="button"
                style={{
                  left: `${projectLongitude(bubble.longitude)}%`,
                  top: `${projectLatitude(bubble.latitude)}%`,
                }}
                title={`${bubble.companyName}: ${bubble.jobCount} jobs`}
                onClick={() => onCompanySelect(bubble.id)}
              >
                {bubble.companyName.slice(0, 1)}
              </button>
            ))}
          {activeLayer === "neighbourhood" &&
            markers.map((marker) => (
              <button
                key={marker.id}
                className="globe-point globe-point--marker"
                type="button"
                style={{
                  left: `${projectLongitude(marker.longitude)}%`,
                  top: `${projectLatitude(marker.latitude)}%`,
                }}
                title={marker.label}
                onClick={() => onJobSelect(marker.jobId)}
              >
                {marker.remoteMode === "remote" ? "R" : "J"}
              </button>
            ))}
        </div>
      </div>
      <div className="globe-side-list" id="globe-list-mode">
        <div className="panel-heading">
          <p className="eyebrow">{formatLayer(activeLayer)}</p>
          <h2>{getLayerTitle(activeLayer)}</h2>
        </div>
        {isLoading ? <p className="muted">Loading demo jobs...</p> : null}
        {!isLoading && jobs.length === 0 ? (
          <p className="muted">No jobs match these filters.</p>
        ) : null}
        <div className="job-list" role="list">
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
                  {job.companyName} - {job.location.city} - {formatLayer(job.remoteMode)}
                </small>
              </span>
              <span>{formatLayer(job.employmentType)}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function projectLongitude(longitude: number): number {
  return Math.min(Math.max(((longitude + 180) / 360) * 100, 8), 92);
}

function projectLatitude(latitude: number): number {
  return Math.min(Math.max(((90 - latitude) / 180) * 100, 12), 88);
}

function formatLayer(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getLayerTitle(activeLayer: GlobeZoomLayer): string {
  if (activeLayer === "global") {
    return "Hiring density by country";
  }

  if (activeLayer === "country") {
    return "Country summary and metro demand";
  }

  if (activeLayer === "city") {
    return "Company bubbles by current postings";
  }

  return "Operational job markers";
}
