import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from "maplibre-gl";
import type { MapVersions } from "@/core/map/paths";

/**
 * The map behind a ride's route, as a MapLibre style over the Protomaps
 * basemap schema (v4: earth, landcover, landuse, water, roads, buildings).
 * Quiet by design — warm paper, soft green, grey-blue water, white roads —
 * so the route is what the eye finds. No labels: labels need font files,
 * and the route needs roads and water around it, not names. Pure, so it
 * is tested alone.
 */

export type MapPalette = {
  earth: string;
  water: string;
  green: string;
  farmland: string;
  urban: string;
  building: string;
  road: string;
  roadCasing: string;
  highway: string;
  path: string;
};

export const LIGHT: MapPalette = {
  earth: "#f4f1ea",
  water: "#c7d7de",
  green: "#dde6d2",
  farmland: "#eeebe1",
  urban: "#ebe6dc",
  building: "#e0d9cc",
  road: "#ffffff",
  roadCasing: "#d9d2c4",
  highway: "#e6d6b3",
  path: "#c9bfae",
};

export const DARK: MapPalette = {
  earth: "#23221f",
  water: "#26343b",
  green: "#28302a",
  farmland: "#262522",
  urban: "#2a2926",
  building: "#33312d",
  road: "#3b3a36",
  roadCasing: "#1b1a18",
  highway: "#4a4436",
  path: "#45423c",
};

const width = (base: number): ExpressionSpecification => [
  "interpolate",
  ["exponential", 1.6],
  ["zoom"],
  8,
  base * 0.3,
  12,
  base,
  16,
  base * 4,
];

/** Where the map's files are, as pmtiles:// addresses: the detail file, the world, or both. */
export type MapSources = { detail?: string | null; world?: string | null };

/**
 * The pmtiles:// addresses of the files the page says are there. Each
 * carries its file's version, so a newly fetched file gets a new address
 * and the browser never mixes ranges it cached from the old one.
 */
export function mapSources(origin: string, versions: MapVersions): MapSources {
  const at = (path: string, version: string | null) =>
    version ? `pmtiles://${origin}${path}?v=${encodeURIComponent(version)}` : null;
  return {
    detail: at("/api/map/tiles", versions.detail),
    world: at("/api/map/world", versions.world),
  };
}

const ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>';

/**
 * The style over one or both files (ADR 0099). The world goes first, so
 * it lies under the detail; where both are drawn, the detail's land
 * covers the world's coarser shapes and the detail is what shows. Outside
 * the detail file's regions only the world is there, coarse but whole.
 */
export function mapStyle(sources: MapSources, palette: MapPalette): StyleSpecification {
  const p = palette;
  const style: StyleSpecification = {
    version: 8,
    sources: {},
    layers: [{ id: "background", type: "background", paint: { "background-color": p.earth } }],
  };
  if (sources.world) {
    style.sources.world = { type: "vector", url: sources.world, attribution: ATTRIBUTION };
    style.layers.push(...basemapLayers("world", "world-", p));
  }
  if (sources.detail) {
    style.sources.basemap = { type: "vector", url: sources.detail, attribution: ATTRIBUTION };
    // Over the world, the detail's own land hides the world's coarser coast.
    if (sources.world)
      style.layers.push({
        id: "earth",
        type: "fill",
        source: "basemap",
        "source-layer": "earth",
        paint: { "fill-color": p.earth },
      });
    style.layers.push(...basemapLayers("basemap", "", p));
  }
  return style;
}

/** The basemap's layers over one source, their ids prefixed so two sources can share a style. */
export function basemapLayers(
  source: string,
  prefix: string,
  palette: MapPalette,
): LayerSpecification[] {
  const p = palette;
  return [
    {
      id: `${prefix}landcover`,
      type: "fill",
      source,
      "source-layer": "landcover",
      filter: ["in", ["get", "kind"], ["literal", ["forest", "grassland", "scrub"]]],
      paint: { "fill-color": p.green, "fill-opacity": 0.7 },
    },
    {
      id: `${prefix}landuse-farmland`,
      type: "fill",
      source,
      "source-layer": "landuse",
      filter: ["in", ["get", "kind"], ["literal", ["farmland", "farmyard", "orchard"]]],
      paint: { "fill-color": p.farmland },
    },
    {
      id: `${prefix}landuse-urban`,
      type: "fill",
      source,
      "source-layer": "landuse",
      filter: [
        "in",
        ["get", "kind"],
        ["literal", ["residential", "commercial", "industrial", "retail", "school"]],
      ],
      paint: { "fill-color": p.urban },
    },
    {
      id: `${prefix}landuse-green`,
      type: "fill",
      source,
      "source-layer": "landuse",
      filter: [
        "in",
        ["get", "kind"],
        [
          "literal",
          [
            "park",
            "wood",
            "forest",
            "nature_reserve",
            "golf_course",
            "cemetery",
            "meadow",
            "grass",
          ],
        ],
      ],
      paint: { "fill-color": p.green },
    },
    {
      id: `${prefix}water`,
      type: "fill",
      source,
      "source-layer": "water",
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": p.water },
    },
    {
      id: `${prefix}waterways`,
      type: "line",
      source,
      "source-layer": "water",
      filter: ["==", ["geometry-type"], "LineString"],
      paint: { "line-color": p.water, "line-width": width(1.2) },
    },
    {
      id: `${prefix}buildings`,
      type: "fill",
      source,
      "source-layer": "buildings",
      minzoom: 13,
      paint: { "fill-color": p.building },
    },
    {
      id: `${prefix}roads-path`,
      type: "line",
      source,
      "source-layer": "roads",
      filter: ["==", ["get", "kind"], "path"],
      minzoom: 13,
      paint: { "line-color": p.path, "line-width": width(0.8), "line-dasharray": [2, 2] },
    },
    {
      id: `${prefix}roads-casing`,
      type: "line",
      source,
      "source-layer": "roads",
      filter: [
        "in",
        ["get", "kind"],
        ["literal", ["minor_road", "medium_road", "major_road", "highway"]],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": p.roadCasing, "line-width": width(2.6) },
    },
    {
      id: `${prefix}roads-minor`,
      type: "line",
      source,
      "source-layer": "roads",
      filter: ["in", ["get", "kind"], ["literal", ["minor_road", "medium_road"]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": p.road, "line-width": width(1.6) },
    },
    {
      id: `${prefix}roads-major`,
      type: "line",
      source,
      "source-layer": "roads",
      filter: ["in", ["get", "kind"], ["literal", ["major_road", "highway"]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["match", ["get", "kind"], "highway", p.highway, p.road],
        "line-width": width(2.2),
      },
    },
  ];
}

/** The route as lines, broken where the GPS had no fix: [lon, lat] pairs, as GeoJSON wants. */
export function routeLines(
  lat: readonly (number | null)[],
  lon: readonly (number | null)[],
): Array<Array<[number, number]>> {
  const lines: Array<Array<[number, number]>> = [];
  let current: Array<[number, number]> = [];
  lat.forEach((la, i) => {
    const lo = lon[i];
    if (typeof la === "number" && typeof lo === "number") current.push([lo, la]);
    else if (current.length) {
      lines.push(current);
      current = [];
    }
  });
  if (current.length) lines.push(current);
  return lines.filter((line) => line.length > 1);
}

/** The route's bounding box, [[west, south], [east, north]]. */
export function routeBounds(
  lines: ReadonlyArray<ReadonlyArray<[number, number]>>,
): [[number, number], [number, number]] | null {
  const all = lines.flat();
  if (all.length === 0) return null;
  const lons = all.map((p) => p[0]);
  const lats = all.map((p) => p[1]);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}
