/**
 * DCU's age classes and the season they are planned for.
 *
 * **The class goes by birth year.** DCU's sporting rules open each class
 * to riders "der i kalenderåret fylder …" — who turn a given age in the
 * calendar year — so a rider's class is the same all year, whatever their
 * birthday:
 * - U17: turning 15 and 16 (Sporstlige_regler_2025 ch. 7 § 1.15-1, p. 35);
 * - U19: turning 17 and 18 (ch. 7 § 1.6-1, p. 32);
 * - U23: turning 19 to 22 (ch. 16 § 5.9-1, p. 109; ch. 15 § 2.1-3.2, p. 103).
 * The training documents agree: U17 are "unge på 15-16 år"
 * (DCU_U17_kompendium_2016.pdf p. 15), the two U17 years are the first of
 * "otte sæsoner (U17, U19, U23)" (p. 6), and U23 riders "har fire år"
 * (p. 13). Younger riders are "youth" and older "senior"; DCU gives
 * neither any hours.
 *
 * **The season runs October to September.** DCU's 2025 table starts with
 * October, "pause + frit", then November to September
 * (Landevej_traeningsanbefalinger_2025.pdf p. 1), and DCU's year wheel
 * opens with October: the break after the season ends, in which the
 * winter toward the coming season is planned (web page "Årshjul for
 * træning på landevej"). So October, November and December belong to the
 * season that starts that year; January to September to the one that
 * started the year before. A season leads into one racing year, the next
 * calendar year, and the rider is planned in the class of that racing
 * year: the winter from November trains for it. In October to December
 * the rider still races, on paper, in last year's class, but no DCU hours
 * fall in October, and from November the plan is the new class's.
 *
 * "U17-1" is the first year in U17, "U23-4" the fourth in U23: the 2025
 * table's column heads "U17 1" … "U23 4" read that way (research note,
 * "Tolkning af kolonnenavne").
 *
 * Pure: imports nothing from the database.
 */

export type Category = "U17" | "U19" | "U23" | "senior" | "youth";

/** The three classes DCU publishes hours and strength programmes for. */
export type DcuCategory = "U17" | "U19" | "U23";

export const CLASS_BASES = [
  "U17-1",
  "U17-2",
  "U19-1",
  "U19-2",
  "U23-1",
  "U23-2",
  "U23-3",
  "U23-4",
] as const;
export type ClassBasis = (typeof CLASS_BASES)[number];

/** Ages turned in the racing year, inclusive (sources in the file comment). */
export const CLASS_AGES: Record<DcuCategory, { from: number; to: number }> = {
  U17: { from: 15, to: 16 }, // Sporstlige_regler_2025 ch. 7 § 1.15-1, p. 35
  U19: { from: 17, to: 18 }, // Sporstlige_regler_2025 ch. 7 § 1.6-1, p. 32
  U23: { from: 19, to: 22 }, // Sporstlige_regler_2025 ch. 16 § 5.9-1, p. 109
};

/** The months of a season in order (Landevej_traeningsanbefalinger_2025.pdf p. 1). */
export const SEASON_MONTHS = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** The month the season starts in: October. */
export const SEASON_START_MONTH = 10;

export type RiderClass = {
  category: Category;
  /** 1 or 2 in U17 and U19, 1 to 4 in U23; null for youth and senior. */
  yearInClass: number | null;
  /** The column of DCU's table to plan from; null when DCU has none. */
  basis: ClassBasis | null;
};

function yearAndMonth(dateIso: string): [number, number] {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(dateIso);
  if (!match) throw new RangeError(`Not an ISO date: ${dateIso}`);
  return [Number(match[1]), Number(match[2])];
}

/** The year the season a date falls in started: October–December that year, else the year before. */
export function seasonStartYear(dateIso: string): number {
  const [year, month] = yearAndMonth(dateIso);
  return month >= SEASON_START_MONTH ? year : year - 1;
}

/** The racing year a season leads into. */
export function raceYearOf(seasonStartYear: number): number {
  return seasonStartYear + 1;
}

/** The age a rider turns in the racing year the season leads into. */
export function ageInRaceYear(birthYear: number, seasonStartYear: number): number {
  return raceYearOf(seasonStartYear) - birthYear;
}

/** The category and year in it that a basis names. */
export function basisParts(basis: ClassBasis): { category: DcuCategory; yearInClass: number } {
  const [category, year] = basis.split("-") as [DcuCategory, string];
  return { category, yearInClass: Number(year) };
}

export function isClassBasis(value: unknown): value is ClassBasis {
  return typeof value === "string" && (CLASS_BASES as readonly string[]).includes(value);
}

/**
 * A rider's class for a season, from their birth year. A coach may
 * override it — a second-year U17 moved up to U19 (the rules allow it,
 * ch. 7 § 1.6-1), or a rider who starts late and plans from an earlier
 * year's hours — and the override wins.
 */
export function classFor(
  birthYear: number,
  seasonStartYear: number,
  override?: ClassBasis | null,
): RiderClass {
  if (override) return { ...basisParts(override), basis: override };
  const age = ageInRaceYear(birthYear, seasonStartYear);
  for (const category of ["U17", "U19", "U23"] as const) {
    const { from, to } = CLASS_AGES[category];
    if (age >= from && age <= to) {
      const yearInClass = age - from + 1;
      return { category, yearInClass, basis: `${category}-${yearInClass}` as ClassBasis };
    }
  }
  return {
    category: age < CLASS_AGES.U17.from ? "youth" : "senior",
    yearInClass: null,
    basis: null,
  };
}
