import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { DETAIL_REFS_FROM, REFS_FROM, roadLabels, roadRefs } from "./map-road-labels";
import { FONT_MEDIUM, FONT_REGULAR, NAME, SIZE, textPaint, type LabelPalette } from "./map-text";

/**
 * The names on the map behind a route (ADR 0100): places here, roads in
 * map-road-labels.ts, both from the names already in the Protomaps v4
 * tiles (places: name, kind, kind_detail, min_zoom, sort_key). Quiet grey
 * on a halo of the map's own paper, and laid under the route, which
 * route-map-gl.tsx adds on top of the whole style. Pure, so it is tested
 * alone.
 */

/** A size for a city, a town and anything smaller. */
const BY_SIZE = (city: number, town: number, other: number): ExpressionSpecification => [
  "match",
  ["get", "kind_detail"],
  "city",
  city,
  "town",
  town,
  other,
];

/** A place's own threshold: the tiles say from which zoom it deserves a name. */
const SHOWN: ExpressionSpecification = ["<=", ["get", "min_zoom"], ["zoom"]];

/**
 * The places' labels over one source: countries and regions coarse,
 * cities early, towns later, villages only zoomed in — each from the zoom
 * its tile says — and a city's quarters from zoom 12, faintly.
 */
export function placeLabels(
  source: string,
  prefix: string,
  colours: LabelPalette,
): LayerSpecification[] {
  const paint = (color: string) => textPaint(color, colours.halo);
  return [
    {
      id: `${prefix}label-country`,
      type: "symbol",
      source,
      "source-layer": "places",
      filter: ["all", ["==", ["get", "kind"], "country"], SHOWN],
      maxzoom: 7,
      layout: {
        "text-field": NAME,
        "text-font": [FONT_REGULAR],
        "text-size": SIZE(2, 11, 6, 13),
        "text-letter-spacing": 0.08,
        "text-max-width": 7,
        "symbol-sort-key": ["get", "sort_key"],
      },
      paint: paint(colours.area),
    },
    {
      id: `${prefix}label-region`,
      type: "symbol",
      source,
      "source-layer": "places",
      filter: ["all", ["==", ["get", "kind"], "region"], SHOWN],
      minzoom: 5,
      maxzoom: 8,
      layout: {
        "text-field": NAME,
        "text-font": [FONT_REGULAR],
        "text-size": 11,
        "text-letter-spacing": 0.06,
        "text-max-width": 7,
        "symbol-sort-key": ["get", "sort_key"],
      },
      paint: paint(colours.area),
    },
    {
      id: `${prefix}label-neighbourhood`,
      type: "symbol",
      source,
      "source-layer": "places",
      filter: ["all", ["in", ["get", "kind"], ["literal", ["macrohood", "neighbourhood"]]], SHOWN],
      minzoom: 12,
      layout: {
        "text-field": NAME,
        "text-font": [FONT_REGULAR],
        "text-size": SIZE(12, 10.5, 16, 12),
        "text-max-width": 7,
        "symbol-sort-key": ["get", "sort_key"],
      },
      paint: paint(colours.area),
    },
    {
      id: `${prefix}label-locality`,
      type: "symbol",
      source,
      "source-layer": "places",
      // Not OSM's named spots (place=locality: a bastion, a bog), a farm or a lone house.
      filter: [
        "all",
        ["==", ["get", "kind"], "locality"],
        [
          "!",
          ["in", ["get", "kind_detail"], ["literal", ["locality", "isolated_dwelling", "farm"]]],
        ],
        SHOWN,
      ],
      layout: {
        "text-field": NAME,
        "text-font": [
          "match",
          ["get", "kind_detail"],
          "city",
          ["literal", [FONT_MEDIUM]],
          ["literal", [FONT_REGULAR]],
        ],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          4,
          BY_SIZE(11, 10, 10),
          8,
          BY_SIZE(12.5, 11, 10),
          12,
          BY_SIZE(15, 12.5, 11),
          15,
          BY_SIZE(16, 13.5, 12),
        ],
        "text-max-width": 8,
        "symbol-sort-key": ["get", "sort_key"],
      },
      paint: paint(colours.place),
    },
  ];
}

/**
 * The labels for a style with one or both files, in the order MapLibre
 * should give way: the layer on top is placed first and the ones under it
 * yield where they would collide. So roads go under places, the world's
 * under the detail's. Where both files name the same place the two labels
 * lie exactly on each other, and the world's is hidden by collision. Road
 * names come from the detail only (the world's roads carry none), and road
 * numbers from each file in its own zooms (DETAIL_REFS_FROM); a detail
 * drawn alone numbers its roads from REFS_FROM.
 */
export function labelLayers(
  sources: { world: boolean; detail: boolean },
  colours: LabelPalette,
): LayerSpecification[] {
  const layers: LayerSpecification[] = [];
  if (sources.detail)
    layers.push(
      ...roadLabels("basemap", "", colours, sources.world ? DETAIL_REFS_FROM : REFS_FROM),
    );
  if (sources.world)
    layers.push(
      roadRefs("world", "world-label-road-ref", colours, REFS_FROM, DETAIL_REFS_FROM),
      ...placeLabels("world", "world-", colours),
    );
  if (sources.detail) layers.push(...placeLabels("basemap", "", colours));
  return layers;
}
