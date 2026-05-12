"use client";

/**
 * GlobeCanvas — Globe.GL WebGL globe replacing the previous CSS-sphere.
 *
 * Uses globe.gl (v2) as an imperative vanilla-JS library mounted via useEffect.
 * The component keeps the same props interface as the CSS-sphere version so
 * GlobeExperience requires zero changes.
 *
 * Layer mapping:
 *   global       → country-level density points coloured by job count
 *   country      → city-level points sized by job count
 *   city         → company bubble points sized by posting count
 *   neighbourhood → individual job markers; active job highlighted in white
 */

import { useCallback, useEffect, useRef } from "react";

import type {
  GlobeCityDatum,
  GlobeCompanyBubble,
  GlobeCountryDatum,
  GlobeMarker,
  GlobeZoomLayer,
} from "@job-globe/shared-types";

// ── Types ─────────────────────────────────────────────────────────────────

interface GlobeCanvasProps {
  activeLayer: GlobeZoomLayer;
  countries: GlobeCountryDatum[];
  cities: GlobeCityDatum[];
  bubbles: GlobeCompanyBubble[];
  markers: GlobeMarker[];
  isLoading: boolean;
  selectedJobId: string | null;
  onCountrySelect: (countryCode: string) => void;
  onCitySelect: (countryCode: string, city: string) => void;
  onCompanySelect: (companyId: string) => void;
  onJobSelect: (jobId: string) => void;
}

interface GlobePoint {
  __type: "country" | "city" | "company" | "job";
  lat: number;
  lng: number;
  color: string;
  altitude: number;
  radius: number;
  label: string;
  countryCode?: string;
  city?: string;
  companyId?: string;
  jobId?: string;
}

// Globe.GL instance — typed loosely since the library ships its own types but
// using them here would require a complex generic chain.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GlobeInstance = any;

// ── Texture URLs (CDN — avoids bundling large images) ────────────────────

const GLOBE_IMG_URL = "/globe-ui/earth_1.png";
const BUMP_IMG_URL = "/globe-ui/contour1_1.png";

// ── Colour helpers ────────────────────────────────────────────────────────

function densityColor(ratio: number): string {
  if (ratio >= 0.78) return "#e84545"; // peak  — crimson
  if (ratio >= 0.48) return "#f5a623"; // high  — amber
  if (ratio >= 0.25) return "#4a9eff"; // mid   — sky blue
  return "#1a5fb4"; //                   low   — deep blue
}

// ── Point builders (one per layer) ───────────────────────────────────────

function buildPoints(
  activeLayer: GlobeZoomLayer,
  countries: GlobeCountryDatum[],
  cities: GlobeCityDatum[],
  bubbles: GlobeCompanyBubble[],
  markers: GlobeMarker[],
  selectedJobId: string | null,
): GlobePoint[] {
  if (activeLayer === "country") {
    const maxCount = Math.max(...cities.map((c) => c.jobCount), 1);
    return cities.map((city) => {
      const ratio = city.jobCount / maxCount;
      return {
        __type: "city" as const,
        lat: city.latitude,
        lng: city.longitude,
        color: densityColor(ratio),
        altitude: 0.02 + ratio * 0.06,
        radius: 0.3 + ratio * 0.5,
        label: `<b>${city.city}</b><br/>${city.jobCount.toLocaleString()} jobs`,
        countryCode: city.countryCode,
        city: city.city,
      };
    });
  }

  if (activeLayer === "city") {
    return bubbles.map((bubble) => ({
      __type: "company" as const,
      lat: bubble.latitude,
      lng: bubble.longitude,
      color: "#f5a623",
      altitude: 0.04,
      radius: bubble.size === "lg" ? 0.7 : bubble.size === "md" ? 0.5 : 0.35,
      label: `<b>${bubble.companyName}</b><br/>${bubble.jobCount} open roles`,
      companyId: bubble.id,
    }));
  }

  if (activeLayer === "neighbourhood") {
    return markers.map((marker) => {
      const isActive = marker.jobId === selectedJobId;
      return {
        __type: "job" as const,
        lat: marker.latitude,
        lng: marker.longitude,
        color: isActive ? "#ffffff" : "#e84545",
        altitude: isActive ? 0.09 : 0.06,
        radius: isActive ? 0.45 : 0.28,
        label: `<b>${marker.label}</b>${marker.salaryHint ? `<br/>${marker.salaryHint}` : ""}`,
        jobId: marker.jobId,
      };
    });
  }

  // global layer
  const maxCount = Math.max(...countries.map((c) => c.jobCount), 1);
  return countries.map((country) => {
    const ratio = country.jobCount / maxCount;
    return {
      __type: "country" as const,
      lat: country.latitude,
      lng: country.longitude,
      color: densityColor(ratio),
      altitude: 0.01 + ratio * 0.08,
      radius: 0.3 + ratio * 0.55,
      label: `<b>${country.countryName}</b><br/>${country.jobCount.toLocaleString()} open roles`,
      countryCode: country.countryCode,
    };
  });
}

// ── Default point-of-view per layer ──────────────────────────────────────

const DEFAULT_POV: Record<GlobeZoomLayer, { lat: number; lng: number; altitude: number }> = {
  global: { lat: 20, lng: 10, altitude: 2.2 },
  country: { lat: 38, lng: -96, altitude: 1.8 },
  city: { lat: 40, lng: -74, altitude: 1.4 },
  neighbourhood: { lat: 40, lng: -74, altitude: 1.1 },
};

// ── Component ─────────────────────────────────────────────────────────────

export function GlobeCanvas({
  activeLayer,
  countries,
  cities,
  bubbles,
  markers,
  isLoading,
  selectedJobId,
  onCountrySelect,
  onCitySelect,
  onCompanySelect,
  onJobSelect,
}: GlobeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance>(null);

  // Keep handler refs fresh — avoids tearing down/recreating the globe on each
  // callback identity change while still using the latest prop values.
  const handlersRef = useRef({ onCountrySelect, onCitySelect, onCompanySelect, onJobSelect });
  useEffect(() => {
    handlersRef.current = { onCountrySelect, onCitySelect, onCompanySelect, onJobSelect };
  });

  const handlePointClick = useCallback((point: GlobePoint) => {
    const h = handlersRef.current;
    if (point.__type === "country" && point.countryCode) {
      h.onCountrySelect(point.countryCode);
    } else if (point.__type === "city" && point.countryCode && point.city) {
      h.onCitySelect(point.countryCode, point.city);
    } else if (point.__type === "company" && point.companyId) {
      h.onCompanySelect(point.companyId);
    } else if (point.__type === "job" && point.jobId) {
      h.onJobSelect(point.jobId);
    }
  }, []);

  // ── Mount Globe.GL instance once ─────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    void (async () => {
      // Dynamic import — keeps globe.gl (+ three.js) out of the SSR bundle.
      // Cast to any: globe.gl's TS types don't match its runtime factory API.
      // The runtime pattern is: GlobeFactory(config)(element)
      // The TS types say: new GlobeFactory(element, config)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const GlobeFactory = (await import("globe.gl")).default as any;
      if (cancelled || !containerRef.current) return;

      const containerEl = containerRef.current;
      const globe: GlobeInstance = GlobeFactory({ animateIn: true })
        .width(containerEl.clientWidth || 600)
        .height(containerEl.clientHeight || 500)
        // Globe surface
        .globeImageUrl(GLOBE_IMG_URL)
        .bumpImageUrl(BUMP_IMG_URL)
        .atmosphereColor("#4a9eff")
        .atmosphereAltitude(0.22)
        .backgroundColor("rgba(0,0,0,0)")
        // Points layer — data bound later via separate effect
        .pointsData([])
        .pointLat("lat")
        .pointLng("lng")
        .pointColor("color")
        .pointAltitude("altitude")
        .pointRadius("radius")
        .pointLabel("label")
        .onPointClick(handlePointClick)
        // Initial camera position
        .pointOfView(DEFAULT_POV.global, 0);

      globe(containerEl);
      globeRef.current = globe;

      // Auto-rotate — pauses on user interaction, resumes after 4 s idle.
      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableDamping = true;

      let autoRotateTimer = 0;
      controls.addEventListener("start", () => {
        controls.autoRotate = false;
        window.clearTimeout(autoRotateTimer);
      });
      controls.addEventListener("end", () => {
        window.clearTimeout(autoRotateTimer);
        autoRotateTimer = window.setTimeout(() => {
          if (globeRef.current === globe) controls.autoRotate = true;
        }, 4_000);
      });
    })();

    // Keep canvas sized to its container.
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !globeRef.current) return;
      const { width, height } = entry.contentRect;
      globeRef.current.width(Math.round(width)).height(Math.round(height));
    });
    ro.observe(containerRef.current);

    return () => {
      cancelled = true;
      ro.disconnect();
      if (globeRef.current) {
        try { globeRef.current._destructor?.(); } catch { /* ignore */ }
        globeRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

  // ── Sync points when layer / data / selection changes ─────────────────────
  useEffect(() => {
    if (!globeRef.current) return;
    const points = buildPoints(activeLayer, countries, cities, bubbles, markers, selectedJobId);
    globeRef.current.pointsData(points);
  }, [activeLayer, countries, cities, bubbles, markers, selectedJobId]);

  // ── Fly camera to layer default on layer change ────────────────────────────
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView(DEFAULT_POV[activeLayer], 800);
  }, [activeLayer]);

  // ── Fly to selected job marker ─────────────────────────────────────────────
  useEffect(() => {
    if (!globeRef.current || !selectedJobId) return;
    const marker = markers.find((m) => m.jobId === selectedJobId);
    if (!marker) return;
    globeRef.current.pointOfView(
      { lat: marker.latitude, lng: marker.longitude, altitude: 1.0 },
      600,
    );
  }, [selectedJobId, markers]);

  return (
    <div
      ref={containerRef}
      className="globe-gl-stage"
      id="mapStage"
      aria-busy={isLoading}
      aria-label="Interactive job globe"
      data-testid="interactive-globe"
      style={{ width: "100%", height: "100%", position: "relative", background: "transparent" }}
    />
  );
}
