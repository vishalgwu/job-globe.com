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
    <div className="layer-switcher" role="tablist" aria-label="Map layer selector">
      {layers.map((layer) => (
        <button
          key={layer.value}
          role="tab"
          type="button"
          aria-selected={layer.value === activeLayer}
          data-layer={layer.value}
          onClick={() => onLayerChange(layer.value)}
        >
          {layer.label}
        </button>
      ))}
    </div>
  );
}
