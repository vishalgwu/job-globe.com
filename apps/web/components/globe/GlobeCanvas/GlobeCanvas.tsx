"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import type {
  GlobeCityDatum,
  GlobeCompanyBubble,
  GlobeCountryDatum,
  GlobeMarker,
  GlobeZoomLayer,
} from "@job-globe/shared-types";

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

interface GlobeView {
  longitude: number;
  latitude: number;
  zoom: number;
}

interface ProjectedMarker {
  id: string;
  className: string;
  label: string;
  subLabel: string | null;
  latitude: number;
  longitude: number;
  size: string;
  density: number;
  title: string;
  isActive?: boolean;
  onSelect: () => void;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
  visible: boolean;
}

const minZoom = 0.72;
const maxZoom = 2.35;
const defaultViews: Record<GlobeZoomLayer, GlobeView> = {
  global: { longitude: 16, latitude: 18, zoom: 0.96 },
  country: { longitude: -96, latitude: 38, zoom: 1.26 },
  city: { longitude: -74, latitude: 40, zoom: 1.48 },
  neighbourhood: { longitude: -74, latitude: 40, zoom: 1.72 },
};

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
  const [view, setView] = useState<GlobeView>(defaultViews.global);
  const dragRef = useRef({
    isDragging: false,
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    longitude: defaultViews.global.longitude,
    latitude: defaultViews.global.latitude,
  });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef({ distance: 0, zoom: defaultViews.global.zoom });
  const interactionUntilRef = useRef(0);
  const viewRef = useRef(view);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const layerMarkers = useMemo(
    () =>
      getLayerMarkers({
        activeLayer,
        countries,
        cities,
        bubbles,
        markers,
        selectedJobId,
        onCountrySelect,
        onCitySelect,
        onCompanySelect,
        onJobSelect,
      }),
    [
      activeLayer,
      bubbles,
      cities,
      countries,
      markers,
      onCitySelect,
      onCompanySelect,
      onCountrySelect,
      onJobSelect,
      selectedJobId,
    ],
  );

  useEffect(() => {
    const focus = getLayerFocus(activeLayer, layerMarkers);
    if (!focus) return;

    const timeoutId = window.setTimeout(() => {
      setView((current) => ({
        longitude: normalizeLongitude(focus.longitude),
        latitude: clamp(focus.latitude, -45, 52),
        zoom: Math.max(current.zoom, defaultViews[activeLayer].zoom),
      }));
      interactionUntilRef.current = Date.now() + 1800;
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeLayer, layerMarkers]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return undefined;

    let frameId = 0;
    const tick = () => {
      if (!dragRef.current.isDragging && Date.now() > interactionUntilRef.current) {
        setView((current) => ({
          ...current,
          longitude: normalizeLongitude(current.longitude + 0.035),
        }));
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const updateZoom = useCallback((nextZoom: number) => {
    interactionUntilRef.current = Date.now() + 2200;
    setView((current) => ({
      ...current,
      zoom: clamp(nextZoom, minZoom, maxZoom),
    }));
  }, []);

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const multiplier = event.ctrlKey ? 0.012 : 0.0028;
      updateZoom(viewRef.current.zoom - event.deltaY * multiplier);
    },
    [updateZoom],
  );

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    interactionUntilRef.current = Date.now() + 2500;

    if (pointersRef.current.size === 2) {
      const points = Array.from(pointersRef.current.values());
      pinchRef.current = {
        distance: distanceBetween(points[0], points[1]),
        zoom: viewRef.current.zoom,
      };
      return;
    }

    dragRef.current = {
      isDragging: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      longitude: viewRef.current.longitude,
      latitude: viewRef.current.latitude,
    };
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;

    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    interactionUntilRef.current = Date.now() + 2500;

    if (pointersRef.current.size >= 2) {
      const points = Array.from(pointersRef.current.values());
      const nextDistance = distanceBetween(points[0], points[1]);
      if (pinchRef.current.distance > 0) {
        setView((current) => ({
          ...current,
          zoom: clamp(
            pinchRef.current.zoom * (nextDistance / pinchRef.current.distance),
            minZoom,
            maxZoom,
          ),
        }));
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag.isDragging || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    setView((current) => ({
      ...current,
      longitude: normalizeLongitude(drag.longitude - deltaX * (0.18 / current.zoom)),
      latitude: clamp(drag.latitude + deltaY * (0.12 / current.zoom), -55, 55),
    }));
  }, []);

  const handlePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pointersRef.current.delete(event.pointerId);
    if (dragRef.current.pointerId === event.pointerId) {
      dragRef.current.isDragging = false;
      dragRef.current.pointerId = null;
    }

    if (pointersRef.current.size === 1) {
      const [remaining] = Array.from(pointersRef.current.entries());
      dragRef.current = {
        isDragging: true,
        pointerId: remaining[0],
        startX: remaining[1].x,
        startY: remaining[1].y,
        longitude: viewRef.current.longitude,
        latitude: viewRef.current.latitude,
      };
    }
  }, []);

  const globeStyle = {
    "--globe-scale": view.zoom,
    "--globe-bg-x": `${50 + normalizeDelta(view.longitude) / 3.6}%`,
  } as CSSProperties;

  return (
    <div
      className="map-stage is-3d"
      id="mapStage"
      aria-busy={isLoading}
      data-testid="interactive-globe"
      style={globeStyle}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onWheel={handleWheel}
    >
      <div className="globe-zoom-controls" aria-label="Globe zoom controls">
        <button type="button" aria-label="Zoom out" onClick={() => updateZoom(view.zoom - 0.14)}>
          -
        </button>
        <span>{Math.round(view.zoom * 100)}%</span>
        <button type="button" aria-label="Zoom in" onClick={() => updateZoom(view.zoom + 0.14)}>
          +
        </button>
      </div>
      <div className="globe-frame" aria-hidden="true">
        <div className="globe-halo" />
        <div className="globe-core">
          <div className="cloud-band" />
          <div className="contour contour-a" />
          <div className="contour contour-b" />
          <div className="map-texture" />
        </div>
      </div>
      <div className="flat-map" aria-hidden="true" />
      <div className="marker-layer">
        {layerMarkers.map((marker) => {
          const point = projectGlobe(marker.longitude, marker.latitude, view);

          return (
            <button
              key={marker.id}
              aria-label={marker.title}
              className={`marker ${marker.className}${marker.isActive ? " is-active" : ""}${
                point.visible ? "" : " is-occluded"
              }`}
              type="button"
              style={markerStyle(point, marker.size, marker.density)}
              title={marker.title}
              onClick={marker.onSelect}
            >
              <span>{marker.label}</span>
              {marker.subLabel ? <small>{marker.subLabel}</small> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getLayerMarkers({
  activeLayer,
  countries,
  cities,
  bubbles,
  markers,
  selectedJobId,
  onCountrySelect,
  onCitySelect,
  onCompanySelect,
  onJobSelect,
}: {
  activeLayer: GlobeZoomLayer;
  countries: GlobeCountryDatum[];
  cities: GlobeCityDatum[];
  bubbles: GlobeCompanyBubble[];
  markers: GlobeMarker[];
  selectedJobId: string | null;
  onCountrySelect: (countryCode: string) => void;
  onCitySelect: (countryCode: string, city: string) => void;
  onCompanySelect: (companyId: string) => void;
  onJobSelect: (jobId: string) => void;
}): ProjectedMarker[] {
  if (activeLayer === "country") {
    const maxCityCount = Math.max(...cities.map((city) => city.jobCount), 1);

    return cities.map((city) => {
      const ratio = city.jobCount / maxCityCount;

      return {
        id: `${city.countryCode}-${city.city}`,
        className: `marker-city ${densityClass(ratio)}`,
        label: cityAbbr(city.city),
        subLabel: formatCount(city.jobCount),
        latitude: city.latitude,
        longitude: city.longitude,
        size: "auto",
        density: ratio,
        title: `${city.city} | ${city.jobCount.toLocaleString()} jobs`,
        onSelect: () => onCitySelect(city.countryCode, city.city),
      };
    });
  }

  if (activeLayer === "city") {
    return bubbles.map((bubble) => ({
      id: bubble.id,
      className: `marker-company density-high marker-company--${bubble.size}`,
      label: initials(bubble.companyName),
      subLabel: formatCount(bubble.jobCount),
      latitude: bubble.latitude,
      longitude: bubble.longitude,
      size: companySize(bubble.size),
      density: 0.72,
      title: `${bubble.companyName} | ${bubble.jobCount} open jobs | ${bubble.topCategory}`,
      onSelect: () => onCompanySelect(bubble.id),
    }));
  }

  if (activeLayer === "neighbourhood") {
    return markers.map((marker) => ({
      id: marker.id,
      className: "marker-job density-peak",
      label: marker.label,
      subLabel: marker.salaryHint,
      latitude: marker.latitude,
      longitude: marker.longitude,
      size: "16px",
      density: 0.82,
      title: `${marker.label} | ${marker.salaryHint ?? "Salary not listed"} | ${marker.remoteMode}`,
      isActive: marker.jobId === selectedJobId,
      onSelect: () => onJobSelect(marker.jobId),
    }));
  }

  const maxCountryCount = Math.max(...countries.map((country) => country.jobCount), 1);

  return countries.map((country) => {
    const ratio = country.jobCount / maxCountryCount;

    return {
      id: country.countryCode,
      className: `marker-country ${densityClass(ratio)}`,
      label: country.countryCode,
      subLabel: formatCount(country.jobCount),
      latitude: country.latitude,
      longitude: country.longitude,
      size: "auto",
      density: ratio,
      title: `${country.countryName} | ${country.jobCount.toLocaleString()} open jobs`,
      onSelect: () => onCountrySelect(country.countryCode),
    };
  });
}

function getLayerFocus(activeLayer: GlobeZoomLayer, markers: ProjectedMarker[]) {
  if (!markers.length) {
    return defaultViews[activeLayer];
  }

  if (activeLayer === "global") {
    return defaultViews.global;
  }

  return {
    longitude: averageLongitude(markers.map((marker) => marker.longitude)),
    latitude: average(markers.map((marker) => marker.latitude)),
  };
}

function markerStyle(point: ProjectedPoint, size: string, density: number): CSSProperties {
  return {
    "--x": `${point.x}%`,
    "--y": `${point.y}%`,
    "--size": size,
    "--density": density,
    "--depth": point.z,
    zIndex: Math.round(point.z * 1000),
  } as CSSProperties;
}

function projectGlobe(longitude: number, latitude: number, view: GlobeView): ProjectedPoint {
  const lat = toRadians(latitude);
  const lon = toRadians(normalizeDelta(longitude - view.longitude));
  const tilt = toRadians(view.latitude);
  const cosLat = Math.cos(lat);
  const x = cosLat * Math.sin(lon);
  const y = Math.sin(lat);
  const z = cosLat * Math.cos(lon);
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);
  const yRotated = y * cosTilt - z * sinTilt;
  const zRotated = y * sinTilt + z * cosTilt;

  return {
    x: 50 + x * 42 * view.zoom,
    y: 50 - yRotated * 39 * view.zoom,
    z: zRotated,
    visible: zRotated > -0.04,
  };
}

function densityClass(ratio: number): string {
  if (ratio >= 0.78) return "density-peak";
  if (ratio >= 0.48) return "density-high";
  if (ratio >= 0.25) return "density-mid";
  return "density-low";
}

function companySize(size: GlobeCompanyBubble["size"]): string {
  if (size === "lg") return "58px";
  if (size === "md") return "44px";
  return "34px";
}

function cityAbbr(city: string): string {
  const aliases: Record<string, string> = {
    "New York": "NYC",
    "San Francisco": "SF",
    Toronto: "TOR",
    London: "LDN",
    Berlin: "BER",
    Singapore: "SG",
  };

  return aliases[city] ?? city.slice(0, 3).toUpperCase();
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatCount(value: number): string {
  return value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value);
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function averageLongitude(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  const vector = values.reduce(
    (accumulator, longitude) => ({
      x: accumulator.x + Math.cos(toRadians(longitude)),
      y: accumulator.y + Math.sin(toRadians(longitude)),
    }),
    { x: 0, y: 0 },
  );

  return normalizeLongitude((Math.atan2(vector.y, vector.x) * 180) / Math.PI);
}

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeDelta(value: number): number {
  return ((value + 540) % 360) - 180;
}

function normalizeLongitude(value: number): number {
  return ((value + 540) % 360) - 180;
}
