import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { FONT_MEDIUM, FONT_REGULAR, NAME, SIZE, textPaint, type LabelPalette } from "./map-text";

/**
 * The roads' names and numbers on the map behind a route (ADR 0100), from
 * the Protomaps v4 roads layer (name, ref, kind). Pure, so it is tested
 * alone.
 */

/** From this zoom road numbers are shown. */
export const REFS_FROM = 6;

/**
 * Below this zoom road numbers come from the world, from it up from the
 * detail. The world's roads are cut at zoom 8 and drift from the real road
 * when enlarged, so its numbers would sit beside the detail's; split by
 * zoom, a number is never drawn twice.
 */
export const DETAIL_REFS_FROM = 9;

const BIG_ROADS = ["major_road", "highway"];
const SMALL_ROADS = ["minor_road", "medium_road"];

/**
 * The first of a road's numbers: "Ma-11;Ma-10" is shown as "Ma-11". A ring
 * road OpenStreetMap numbers with a circle ("○2", as some of Copenhagen's
 * are) is written with an O, as the rest of them are ("O2"): Noto Sans has
 * no circle, and the numbers read the same either way.
 */
const FIRST_REF: ExpressionSpecification = [
  "let",
  "ref",
  ["to-string", ["get", "ref"]],
  [
    "let",
    "first",
    [
      "case",
      [">=", ["index-of", ";", ["var", "ref"]], 0],
      ["slice", ["var", "ref"], 0, ["index-of", ";", ["var", "ref"]]],
      ["var", "ref"],
    ],
    [
      "case",
      ["==", ["slice", ["var", "first"], 0, 1], "○"],
      ["concat", "O", ["slice", ["var", "first"], 1]],
      ["var", "first"],
    ],
  ],
];

/**
 * The roads' labels over the detail: names along the line, the big roads
 * from zoom 12 and the rest from 13, and numbers as small upright text
 * from `refsFrom` — no shields, nothing to host but the glyphs. The
 * world's roads carry no names, so these are the detail's alone.
 */
export function roadLabels(
  source: string,
  prefix: string,
  colours: LabelPalette,
  refsFrom: number,
): LayerSpecification[] {
  const name = (id: string, kinds: string[], minzoom: number): LayerSpecification => ({
    id: `${prefix}${id}`,
    type: "symbol",
    source,
    "source-layer": "roads",
    filter: ["all", ["has", "name"], ["in", ["get", "kind"], ["literal", kinds]]],
    minzoom,
    layout: {
      "symbol-placement": "line",
      "text-field": NAME,
      "text-font": [FONT_REGULAR],
      "text-size": SIZE(12, 10, 16, 12),
      "text-max-angle": 30,
      "symbol-spacing": 320,
    },
    paint: textPaint(colours.road, colours.halo),
  });
  return [
    name("label-road-major", BIG_ROADS, 12),
    name("label-road-minor", SMALL_ROADS, 13),
    roadRefs(source, `${prefix}label-road-ref`, colours, refsFrom, 24),
  ];
}

/** Road numbers between two zooms, upright beside the road. */
export function roadRefs(
  source: string,
  id: string,
  colours: LabelPalette,
  minzoom: number,
  maxzoom: number,
): LayerSpecification {
  return {
    id,
    type: "symbol",
    source,
    "source-layer": "roads",
    filter: ["all", ["has", "ref"], ["in", ["get", "kind"], ["literal", BIG_ROADS]]],
    minzoom,
    maxzoom,
    layout: {
      "symbol-placement": "line",
      "text-field": FIRST_REF,
      "text-font": [FONT_MEDIUM],
      "text-size": 9.5,
      "text-rotation-alignment": "viewport",
      "symbol-spacing": 420,
      // Room around each number, so the two carriageways of a motorway are not numbered side by side.
      "text-padding": 10,
    },
    paint: {
      ...textPaint(colours.road, colours.halo),
      "text-halo-width": 1.6,
      "text-halo-blur": 0,
    },
  };
}
