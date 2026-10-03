/**
 * "Lav intensitet først", the intensity profile a team may lay on top of
 * its hours, DCU's or none (docs/adr/0053). It sets no hours of its own;
 * it says how a session count should spread over three zones
 * (src/modules/load/intensity.ts) in the months it has numbers for.
 *
 * The numbers are Kadence's synthesis, not one source's
 * (docs/research/traeningsparadigmer.md, section 8.1): in the distance
 * and base phases at least 75–80 % of the sessions low, at most 10 %
 * between the thresholds, and the rest high — NCF 2014 (~75 / 5–10 /
 * 15–20), SCF 2025 (at least 75 % low), Seiler 2010 (about 80/20,
 * counted in sessions). Polarised and pyramidal spreads work about
 * equally well (Rosenblat 2025; Oliveira 2024); much time between the
 * thresholds looks worst, also in juniors (Guellich & Seiler 2010). So it
 * is not called "80/20": no fixed split is shown to be best.
 *
 * Pure: imports nothing from the database.
 */

export type IntensityProfile = {
  /** The least share of sessions low, as a range: 75–80 %. */
  lowMin: number;
  lowTarget: number;
  /** The most share of sessions between the thresholds. */
  midMax: number;
};

export const LOW_INTENSITY_FIRST: IntensityProfile = { lowMin: 75, lowTarget: 80, midMax: 10 };

/** DCU's distance and base phases, November to February (src/modules/dcu/phases.ts). */
export const PROFILE_MONTHS: readonly number[] = [11, 12, 1, 2];

/** The profile's numbers for a month (1–12), or null in the months it sets none. */
export function profileFor(month: number): IntensityProfile | null {
  return PROFILE_MONTHS.includes(month) ? LOW_INTENSITY_FIRST : null;
}
