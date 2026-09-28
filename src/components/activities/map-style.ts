import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

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

export function mapStyle(tilesUrl: string, palette: MapPalette): StyleSpecification {
  const p = palette;
  return {
    version: 8,
    sources: {
      basemap: {
        type: "vector",
        url: tilesUrl,
        attribution:
          '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>',
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": p.earth } },
      {
        id: "landcover",
        type: "fill",
        source: "basemap",
        "source-layer": "landcover",
        filter: ["in", ["get", "kind"], ["literal", ["forest", "grassland", "scrub"]]],
        paint: { "fill-color": p.green, "fill-opacity": 0.7 },
      },
      {
        id: "landuse-farmland",
        type: "fill",
        source: "basemap",
        "source-layer": "landuse",
        filter: ["in", ["get", "kind"], ["literal", ["farmland", "farmyard", "orchard"]]],
        paint: { "fill-color": p.farmland },
      },
      {
        id: "landuse-urban",
        type: "fill",
        source: "basemap",
        "source-layer": "landuse",
        filter: [
          "in",
          ["get", "kind"],
          ["literal", ["residential", "commercial", "industrial", "retail", "school"]],
        ],
        paint: { "fill-color": p.urban },
      },
      {
        id: "landuse-green",
        type: "fill",
        source: "basemap",
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
        id: "water",
        type: "fill",
        source: "basemap",
        "source-layer": "water",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": p.water },
      },
      {
        id: "waterways",
        type: "line",
        source: "basemap",
        "source-layer": "water",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": p.water, "line-width": width(1.2) },
      },
      {
        id: "buildings",
        type: "fill",
        source: "basemap",
        "source-layer": "buildings",
        minzoom: 13,
        paint: { "fill-color": p.building },
      },
      {
        id: "roads-path",
        type: "line",
        source: "basemap",
        "source-layer": "roads",
        filter: ["==", ["get", "kind"], "path"],
        minzoom: 13,
        paint: { "line-color": p.path, "line-width": width(0.8), "line-dasharray": [2, 2] },
      },
      {
        id: "roads-casing",
        type: "line",
        source: "basemap",
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
        id: "roads-minor",
        type: "line",
        source: "basemap",
        "source-layer": "roads",
        filter: ["in", ["get", "kind"], ["literal", ["minor_road", "medium_road"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": p.road, "line-width": width(1.6) },
      },
      {
        id: "roads-major",
        type: "line",
        source: "basemap",
        "source-layer": "roads",
        filter: ["in", ["get", "kind"], ["literal", ["major_road", "highway"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["match", ["get", "kind"], "highway", p.highway, p.road],
          "line-width": width(2.2),
        },
      },
    ],
  };
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
