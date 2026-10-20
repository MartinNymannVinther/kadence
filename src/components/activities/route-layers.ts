import type { LayerSpecification } from "maplibre-gl";

/**
 * The route over the map: a casing and the line, then the start and
 * finish, then the dot that follows the curves. route-map-gl.tsx adds
 * them after the style has loaded and without naming a layer to go
 * before, so they lie over everything in the style — the names included
 * (ADR 0100): the route stays the strongest thing on the map. Pure, so
 * the order is tested alone.
 */

export const ROUTE_COLOUR = { light: "#4a6b53", dark: "#7fa588" } as const;
const HERE = "#c08a63";

/** The route's own layers, in the order they are added: the line first, the dot that moves last. */
export function routeLayers(dark: boolean): LayerSpecification[] {
  const colour = dark ? ROUTE_COLOUR.dark : ROUTE_COLOUR.light;
  return [
    {
      id: "route-casing",
      type: "line",
      source: "route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": dark ? "#1b1a18" : "#ffffff", "line-width": 7 },
    },
    {
      id: "route",
      type: "line",
      source: "route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": colour, "line-width": 3.5 },
    },
    {
      id: "ends",
      type: "circle",
      source: "ends",
      paint: {
        "circle-radius": 6,
        "circle-color": ["match", ["get", "end"], "start", colour, "#ffffff"],
        "circle-stroke-color": ["match", ["get", "end"], "start", "#ffffff", "#24221e"],
        "circle-stroke-width": 2.5,
      },
    },
    {
      id: "here",
      type: "circle",
      source: "here",
      paint: {
        "circle-radius": 7,
        "circle-color": HERE,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2.5,
      },
    },
  ];
}
