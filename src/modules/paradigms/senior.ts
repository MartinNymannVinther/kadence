import {
  MIN_HOURS_BETWEEN_STRENGTH,
  corridorOf,
  type StrengthFrequency,
  type WeeklyCorridor,
} from "@/modules/dcu";

/**
 * Kadence's own numbers for riders past U23 (docs/adr/0091): two
 * training profiles, Motionist and Supermotionist, for an adult — a
 * parent, say — who uses Kadence for their own training. DCU publishes
 * no hours for seniors, so these fill the gap; they are not DCU's and
 * live here, not in src/modules/dcu. The reasoning, in Danish, with every
 * source: docs/research/senior-motionister.md.
 *
 * - The floor is WHO 2020: adults 150–300 min moderate or 75–150 min
 *   vigorous activity a week, and muscle-strengthening on 2 or more days
 *   (WHO guidelines on physical activity and sedentary behaviour, 2020;
 *   Bull et al., Br J Sports Med 2020;54:1451–1462). Sundhedsstyrelsen
 *   asks at least 30 minutes a day, about 210 a week, and strength twice
 *   a week (sst.dk, "Anbefalinger om fysisk aktivitet").
 * - The ceiling is NCF 2014: "De beste seniorutøverne i sykling trener
 *   mellom 700-1100 treningstimer i året" (Rønnestad et al., p. 29;
 *   docs/research/traeningsparadigmer.md, section 3.5). Supermotionist
 *   stays well under it.
 * - The mix is "Lav intensitet først" (ADR 0053; Seiler 2010, NCF 2014):
 *   mostly easy rides, a few hard sessions.
 *
 * **Kadence's own judgement**, anchored in those and said plainly: the
 * yearly totals (about 280 and 520 hours), the split over the months, the
 * longest rides and the strength rhythm. October is free, as in DCU's
 * season, and planned as 0.
 *
 * Pure: imports nothing from the database.
 */

export const SENIOR_PROFILES = ["motionist", "super-motionist"] as const;
export type SeniorProfile = (typeof SENIOR_PROFILES)[number];

/** A senior who has chosen nothing plans as a motionist, so an adult alone has a plan at once. */
export const DEFAULT_SENIOR_PROFILE: SeniorProfile = "motionist";

export const SENIOR_BASES = ["senior-motionist", "senior-super-motionist"] as const;
export type SeniorBasis = (typeof SENIOR_BASES)[number];

export function isSeniorProfile(value: unknown): value is SeniorProfile {
  return typeof value === "string" && (SENIOR_PROFILES as readonly string[]).includes(value);
}

export function isSeniorBasis(value: unknown): value is SeniorBasis {
  return typeof value === "string" && (SENIOR_BASES as readonly string[]).includes(value);
}

/** The basis a profile plans from; no profile is the default. */
export function seniorBasisOf(profile: string | null | undefined): SeniorBasis {
  return `senior-${isSeniorProfile(profile) ? profile : DEFAULT_SENIOR_PROFILE}`;
}

export function profileOf(basis: SeniorBasis): SeniorProfile {
  return basis === "senior-super-motionist" ? "super-motionist" : "motionist";
}

/**
 * Hours on the bike per month, November to September, in DCU's table's
 * order. Kadence's judgement (docs/research/senior-motionister.md §3.2):
 * the season's shape is DCU's — built through the winter, most in May to
 * August, a little less in September — and the totals are the profiles'.
 * Motionist: 280 h, about 5.4 h a week; its quietest month, November, is
 * about 3.7 h a week, above WHO's 150 minutes. Supermotionist: 520 h,
 * about 10 h a week, under NCF's 700–1,100 h for the best seniors.
 */
export const SENIOR_HOURS: Record<SeniorBasis, readonly number[]> = {
  // Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep
  "senior-motionist": [16, 18, 20, 21, 24, 27, 30, 32, 34, 32, 26],
  "senior-super-motionist": [30, 34, 38, 40, 46, 50, 56, 58, 62, 58, 48],
};

function checkMonth(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12)
    throw new RangeError(`Not a month: ${month}`);
}

/** The profile's hours for a month (1–12); October, free, is 0. */
export function seniorMonthHours(basis: SeniorBasis, month: number): number {
  checkMonth(month);
  return SENIOR_HOURS[basis][(month + 1) % 12] ?? 0;
}

/** The profile's hours for the season, November to September. */
export function seniorSeasonHours(basis: SeniorBasis): number {
  return SENIOR_HOURS[basis].reduce((sum, h) => sum + h, 0);
}

/**
 * The week's hours as DCU's corridor is made (src/modules/dcu/hours.ts):
 * each day carries its month's hours over the month's days, and low and
 * high are the target ∓ the same CORRIDOR_BAND (±20 %, Kadence's).
 */
export function seniorWeeklyCorridor(basis: SeniorBasis, weekMondayIso: string): WeeklyCorridor {
  return corridorOf((month) => seniorMonthHours(basis, month), weekMondayIso);
}

/**
 * The longest training ride, whichever comes first. Kadence's judgement:
 * no source sets one for adults. A motionist's 3 hours are more than half
 * the week on one day; a supermotionist gets U19's limit
 * (DCU_U19_kompendium_2016.pdf p. 18), where summer's long rides and
 * sportives lie. A reminder for the coach, never a ban.
 */
export const SENIOR_LONGEST_RIDE: Record<
  SeniorBasis,
  { hours: number; km: number; source: string }
> = {
  "senior-motionist": { hours: 3, km: 90, source: "Kadence's judgement, ADR 0091" },
  "senior-super-motionist": {
    hours: 5,
    km: 150,
    source: "Kadence's judgement, ADR 0091; as DCU_U19_kompendium_2016.pdf p. 18",
  },
};

/**
 * The last month of the strength build: two sessions a week from
 * November to it, one after. WHO 2020 and Sundhedsstyrelsen ask strength
 * twice a week, which the winter keeps; one a week in the season is
 * Kadence's judgement, as DCU's own maintenance (DCU_U17_styrketraening.pdf
 * p. 2). The 48 hours between sessions are DCU's, for everybody.
 */
export const SENIOR_STRENGTH_BUILD_ENDS: Record<SeniorBasis, number> = {
  "senior-motionist": 2, // November to February
  "senior-super-motionist": 3, // November to March
};

/** How many strength sessions a week the profile suggests on a date (yyyy-mm-dd). */
export function seniorStrengthFrequency(basis: SeniorBasis, dateIso: string): StrengthFrequency {
  const match = /^\d{4}-(\d{2})-\d{2}$/.exec(dateIso);
  if (!match) throw new RangeError(`Not an ISO date: ${dateIso}`);
  const month = Number(match[1]);
  const build = month >= 11 || month <= SENIOR_STRENGTH_BUILD_ENDS[basis];
  const n = build ? 2 : 1;
  return {
    period: build ? "build" : "maintenance",
    perWeekMin: n,
    perWeekMax: n,
    minHoursBetween: MIN_HOURS_BETWEEN_STRENGTH,
  };
}

/**
 * Whose numbers stand beside a plan, as the words' `ref` select reads it
 * ("{ref, select, dcu {DCU} motionist {Motionist} other {Supermotionist}}"):
 * DCU's for a class-year or no basis, the profile's for a senior.
 */
export type Reference = "dcu" | "motionist" | "supermotionist";

export function referenceOf(basis: unknown): Reference {
  if (!isSeniorBasis(basis)) return "dcu";
  return basis === "senior-super-motionist" ? "supermotionist" : "motionist";
}
