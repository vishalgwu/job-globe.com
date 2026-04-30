"use client";

import type { CSSProperties } from "react";

import type {
  GlobeCityDatum,
  GlobeCompanyBubble,
  GlobeCountryDatum,
  GlobeMarker,
  GlobeZoomLayer,
} from "@job-globe/shared-types";

interface FallbackMapProps {
  activeLayer: GlobeZoomLayer;
  countries: GlobeCountryDatum[];
  cities: GlobeCityDatum[];
  bubbles: GlobeCompanyBubble[];
  markers: GlobeMarker[];
  onCountrySelect: (countryCode: string) => void;
  onCitySelect: (countryCode: string, city: string) => void;
  onJobSelect: (jobId: string) => void;
  onCompanySelect: (companyId: string) => void;
}

export function FallbackMap({
  activeLayer,
  countries,
  cities,
  bubbles,
  markers,
  onCountrySelect,
  onCitySelect,
  onJobSelect,
  onCompanySelect,
}: FallbackMapProps) {
  return (
    <div className="map-stage is-2d" aria-label="2D fallback job map">
      <div className="flat-map" aria-hidden="true" />
      <div className="marker-layer">
        {activeLayer === "global"
          ? countries.map((country) => (
              <button
                key={country.countryCode}
                type="button"
                className="marker marker-country density-high"
                style={markerStyle(
                  projectLongitude(country.longitude),
                  projectLatitude(country.latitude),
                  "34px",
                )}
                title={`${country.countryName} | ${country.jobCount} open jobs`}
                onClick={() => onCountrySelect(country.countryCode)}
              >
                <span>{country.countryCode}</span>
                <small>{country.jobCount}</small>
              </button>
            ))
          : null}
        {activeLayer === "country"
          ? cities.map((city) => (
              <button
                key={`${city.countryCode}-${city.city}`}
                type="button"
                className="marker marker-city density-mid"
                style={markerStyle(
                  projectLongitude(city.longitude),
                  projectLatitude(city.latitude),
                  "30px",
                )}
                title={`${city.city} | ${city.jobCount} jobs`}
                onClick={() => onCitySelect(city.countryCode, city.city)}
              >
                <span>{city.city.slice(0, 3).toUpperCase()}</span>
              </button>
            ))
          : null}
        {activeLayer === "city"
          ? bubbles.map((bubble, index) => {
              const point = localRing(index, bubbles.length, 18);

              return (
                <button
                  key={bubble.id}
                  type="button"
                  className="marker marker-company density-high"
                  style={markerStyle(point.x, point.y, bubble.size === "lg" ? "58px" : "42px")}
                  title={`${bubble.companyName} | ${bubble.jobCount} jobs`}
                  onClick={() => onCompanySelect(bubble.id)}
                >
                  <span>{bubble.companyName.slice(0, 1)}</span>
                </button>
              );
            })
          : null}
        {activeLayer === "neighbourhood"
          ? markers.map((marker, index) => {
              const point = localRing(index, markers.length, 18);

              return (
                <button
                  key={marker.id}
                  type="button"
                  className="marker marker-job density-peak"
                  style={markerStyle(point.x, point.y, "16px")}
                  title={marker.label}
                  onClick={() => onJobSelect(marker.jobId)}
                >
                  <span>{marker.label}</span>
                </button>
              );
            })
          : null}
      </div>
    </div>
  );
}

function markerStyle(x: number, y: number, size: string): CSSProperties {
  return {
    "--x": `${x}%`,
    "--y": `${y}%`,
    "--size": size,
    "--density": 0.7,
  } as CSSProperties;
}

function projectLongitude(longitude: number): number {
  return Math.min(Math.max(((longitude + 180) / 360) * 100, 6), 94);
}

function projectLatitude(latitude: number): number {
  return Math.min(Math.max(((90 - latitude) / 180) * 100, 10), 90);
}

function localRing(index: number, total: number, radius: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index / Math.max(total, 1)) * Math.PI * 2;

  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius * 0.76,
  };
}
