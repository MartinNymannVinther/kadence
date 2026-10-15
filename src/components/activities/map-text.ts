import type { ExpressionSpecification } from "maplibre-gl";

/**
 * How the map writes its names (ADR 0100): the glyphs Kadence serves
 * itself, the two Noto Sans weights, the colours and which name is shown.
 * Shared by the place and road labels; pure, so it is tested alone.
 */

/**
 * Where the glyphs are, on Kadence's own origin: Noto Sans as SDF ranges
 * in public/map/fonts (scripts/fetch-map-fonts.sh). MapLibre fills in the
 * font stack and the range of 256 code points it needs.
 */
export const GLYPHS_PATH = "/map/fonts/{fontstack}/{range}.pbf";

export const FONT_REGULAR = "Noto Sans Regular";
export const FONT_MEDIUM = "Noto Sans Medium";
/** Every font stack the labels name; each has every range below under public/map/fonts. */
export const FONT_STACKS = [FONT_REGULAR, FONT_MEDIUM] as const;

/**
 * The ranges that are shipped: what names in Latin script need — Basic
 * Latin and Latin-1 (æøå, ñ, ç, the Spanish and Catalan accents, the
 * middle dot of l·l), Latin Extended-A and -B, Latin Extended Additional
 * and General Punctuation. A character outside them asks for a range that
 * is not there: MapLibre gets one 404 for that range, warns in the
 * console, and draws the character from the browser's own fonts instead.
 * Nothing breaks, and NAME keeps it rare.
 */
export const GLYPH_RANGES = ["0-255", "256-511", "512-767", "7680-7935", "8192-8447"] as const;

/** The glyphs address on this origin. */
export function glyphsUrl(origin: string): string {
  return `${origin}${GLYPHS_PATH}`;
}

/** The colours the labels are drawn in. */
export type LabelPalette = {
  /** Places. */
  place: string;
  /** Countries, regions and a city's quarters, fainter than towns. */
  area: string;
  /** Road names and numbers. */
  road: string;
  /** The halo, the map's own paper. */
  halo: string;
};

/** Grey text on a soft halo of the map's paper. */
export function textPaint(color: string, halo: string) {
  return {
    "text-color": color,
    "text-halo-color": halo,
    "text-halo-width": 1.4,
    "text-halo-blur": 0.4,
  };
}

/** A size that grows linearly between two zooms. */
export const SIZE = (z1: number, s1: number, z2: number, s2: number): ExpressionSpecification => [
  "interpolate",
  ["linear"],
  ["zoom"],
  z1,
  s1,
  z2,
  s2,
];

/**
 * A name as it is written where the ride was. A name in another script
 * than Latin (the tiles mark it with `script`) is shown in its English
 * form when the tiles have one, so it is drawn with the glyphs Kadence
 * ships and read by a Danish rider; without one, the local name stands.
 */
export const NAME: ExpressionSpecification = [
  "case",
  ["has", "script"],
  ["coalesce", ["get", "name:en"], ["get", "name"]],
  ["get", "name"],
];
