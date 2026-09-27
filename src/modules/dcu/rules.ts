import type { DcuCategory } from "./classes";

/**
 * DCU's rules about volume that are words rather than a table: the
 * longest ride, the U19 in-season band, and which hours count. The
 * guardrails read the numbers here; the texts are DCU's, paraphrased in
 * English, with the page they stand on.
 *
 * Pure: imports nothing from the database.
 */

export type LongestRide = { hours: number; km: number; source: string };

/**
 * The longest training ride: DCU says a rider should "ALDRIG" ride longer
 * than this — whichever of the two comes first — and only in the right
 * conditions (good warm weather, several riders to share the pace, a
 * small gap in level). U23 has no limit in any document.
 */
export const LONGEST_RIDE: Record<DcuCategory, LongestRide | null> = {
  U17: { hours: 4, km: 120, source: "DCU_U17_kompendium_2016.pdf p. 15" },
  U19: { hours: 5, km: 150, source: "DCU_U19_kompendium_2016.pdf p. 18" },
  U23: null,
};

/** True when a ride goes past the class's longest ride, by time or by distance. */
export function exceedsLongestRide(
  category: DcuCategory,
  ride: { hours: number; km?: number | null },
): boolean {
  const limit = LONGEST_RIDE[category];
  if (!limit) return false;
  return ride.hours > limit.hours || (ride.km ?? 0) > limit.km;
}

/**
 * U19 in the season: "45-60 timer hver måned"
 * (DCU_U19_kompendium_2016.pdf p. 14; DCU_U17_kompendium_2016.pdf p. 12).
 * The 2016 text; the 2025 table leaves it in two months (U19-1 September
 * 42 h, U19-2 July 66 h), and the 2025 hours win. Kept as DCU's words
 * for the coach, not used to plan.
 */
export const U19_SEASON_MONTHLY_HOURS = {
  low: 45,
  high: 60,
  source: "DCU_U19_kompendium_2016.pdf p. 14",
} as const;

/**
 * Only hours on the bike count toward DCU's hours: road, track, MTB,
 * spinning, rollers and so on; running, swimming, gymnastics, skiing and
 * ball games do not (DCU_U17_kompendium_2016.pdf p. 12). In Kadence's
 * sports that is the bike alone: strength does not count either.
 */
export const COUNTS_TOWARD_DCU_HOURS: Record<"bike" | "strength" | "other", boolean> = {
  bike: true,
  strength: false,
  other: false,
};

export type VolumeRule = { id: string; text: string; source: string };

/** DCU's words on volume, in English, for the coach and the AI's context. */
export const VOLUME_RULES: readonly VolumeRule[] = [
  {
    id: "neither-more-nor-less",
    text: "Train neither much more nor much less than the recommendations; they are guidance, to be adjusted by the club or national coach.",
    source: "DCU_U17_kompendium_2016.pdf p. 12; DCU_U19_kompendium_2016.pdf p. 13",
  },
  {
    id: "u17-not-too-much",
    text: "For U17 the most important thing is not to train too much: too much volume kills motivation and leaves no room to progress.",
    source: "DCU_U17_kompendium_2016.pdf p. 12",
  },
  {
    id: "u19-yearly-increase",
    text: "In U19 it is natural to raise the volume again by a fitting amount (10-15 %) a year; too much too early makes steady increases harder later.",
    source: "DCU_U19_kompendium_2016.pdf p. 12",
  },
  {
    id: "u23-younger-below",
    text: "Younger U23 riders may lie a little under the recommendations: they have four years to reach them.",
    source: "DCU_U17_kompendium_2016.pdf p. 13; DCU_U19_kompendium_2016.pdf p. 14",
  },
  {
    id: "no-full-winter-break",
    text: "Do not stop completely through the winter: after a long break a rider cannot, in principle, get past last season's level.",
    source: "DCU_U17_kompendium_2016.pdf p. 12",
  },
  {
    id: "camps-no-jumps",
    text: "On training camps, avoid big jumps in volume: sudden large increases risk overtraining and joint and tendon injuries.",
    source: "DCU_U17_kompendium_2016.pdf p. 14-15; DCU_U19_kompendium_2016.pdf p. 17",
  },
  {
    id: "supercompensation",
    text: "Build in recovery weeks with less volume, fewer sessions and lower intensity; the recovery is often what releases the progress.",
    source: "DCU_U17_kompendium_2016.pdf p. 12",
  },
];
