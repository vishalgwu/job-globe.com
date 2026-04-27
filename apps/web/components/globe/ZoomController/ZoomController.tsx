"use client";

import type { GlobeZoomLayer } from "@job-globe/shared-types";

const layers: { label: string; value: GlobeZoomLayer }[] = [
  { label: "Global", value: "global" },
  { label: "Country", value: "country" },
  { label: "City", value: "city" },
  { label: "Neighbourhood", value: "neighbourhood" },
];

interface ZoomControllerProps {
  activeLayer: GlobeZoomLayer;
  onLayerChange: (layer: GlobeZoomLayer) => void;
}

export function ZoomController({ activeLayer, onLayerChange }: ZoomControllerProps) {
  return (
    <div className="zoom-controller" aria-label="Globe zoom layer">
      {layers.map((layer) => (
        <button
          key={layer.value}
          className={layer.value === activeLayer ? "is-active" : undefined}
          type="button"
          aria-pressed={layer.value === activeLayer}
          onClick={() => onLayerChange(layer.value)}
        >
          {layer.label}
        </button>
      ))}
    </div>
  );
}
