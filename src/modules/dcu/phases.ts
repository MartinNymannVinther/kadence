/**
 * The parts of DCU's season, month by month. DCU does not name its
 * phases; the names here are Kadence's short labels for what the
 * documents describe, in their order:
 * - **break** — October, "pause + frit"
 *   (Landevej_traeningsanbefalinger_2025.pdf p. 1);
 * - **distance** — November and December: form is built "primært …
 *   [af] stigende træningsmængde (distance)"
 *   (DCU_U17_kompendium_2016.pdf p. 13; DCU_U19_kompendium_2016.pdf p. 14);
 * - **base_intervals** — after New Year, "relativt lang
 *   basisintervaltræning" while the volume keeps rising
 *   (DCU_U17_kompendium_2016.pdf p. 14; DCU_U19_kompendium_2016.pdf p. 14);
 * - **peak_intervals** — "omkring marts", "egentlige formtop intervaller
 *   (korte, hårde intervaller)", placed by when the rider wants to peak
 *   (DCU_U17_kompendium_2016.pdf p. 14; DCU_U19_kompendium_2016.pdf p. 14-15);
 * - **season** — April to September, ridden to the end
 *   (DCU_U17_kompendium_2016.pdf p. 12-13; DCU_U19_kompendium_2016.pdf p. 14).
 *
 * DCU's year wheel on its web page ("Årshjul for træning på landevej")
 * adds a line per month, kept as `MONTH_NOTES`. It lets light intervals
 * begin in December, which the compendia's "primarily distance" leaves
 * room for; its "the largest volume of the year in March" does not hold
 * for U23 in the 2025 table (July is larger), and the 2025 hours win.
 *
 * Pure: imports nothing from the database.
 */

export const PHASES = ["break", "distance", "base_intervals", "peak_intervals", "season"] as const;
export type Phase = (typeof PHASES)[number];

export type PhaseInfo = {
  months: readonly number[];
  /** What DCU says the phase is for, in English. */
  description: string;
  source: string;
};

export const PHASE_INFO: Record<Phase, PhaseInfo> = {
  break: {
    months: [10],
    description:
      "Break and free riding after the season: rest body and mind, then short easy rides, and plan the winter toward next season's goals.",
    source: "Landevej_traeningsanbefalinger_2025.pdf p. 1; DCU web page, year wheel, October",
  },
  distance: {
    months: [11, 12],
    description:
      "Build form mainly by rising volume (distance); track, MTB and cross riders will also ride some intervals.",
    source: "DCU_U17_kompendium_2016.pdf p. 13-14; DCU_U19_kompendium_2016.pdf p. 14",
  },
  base_intervals: {
    months: [1, 2],
    description:
      "Relatively long base intervals begin, while the volume keeps rising month by month.",
    source: "DCU_U17_kompendium_2016.pdf p. 14; DCU_U19_kompendium_2016.pdf p. 14",
  },
  peak_intervals: {
    months: [3],
    description:
      "Around March, real peak intervals (short, hard intervals), timed to when the rider wants to peak.",
    source: "DCU_U17_kompendium_2016.pdf p. 14; DCU_U19_kompendium_2016.pdf p. 14-15",
  },
  season: {
    months: [4, 5, 6, 7, 8, 9],
    description:
      "The racing season: training fits the racing, and the season is ridden to the end.",
    source: "DCU_U17_kompendium_2016.pdf p. 12-13; DCU_U19_kompendium_2016.pdf p. 14",
  },
};

/** The phase a month (1–12) belongs to. */
export function phaseOf(month: number): Phase {
  const phase = PHASES.find((p) => PHASE_INFO[p].months.includes(month));
  if (!phase) throw new RangeError(`Not a month: ${month}`);
  return phase;
}

/**
 * DCU's guidance for each month, in English, with its source. The year
 * wheel is the DCU web page's "Årshjul for træning på landevej"; June to
 * September come from the compendia's U19 text, which U23 shares
 * ("samme skabelon").
 */
export const MONTH_NOTES: Record<number, string> = {
  10: "Pause + free riding. Two weeks of full rest is usually enough, a month if the rider is worn out; then short rides every other day, and other sports are welcome. Plan the winter. (2025 table p. 1; year wheel)",
  11: "The first month with a set volume. No high-intensity intervals yet: build the base that later hard training rests on. (U17 compendium p. 13; year wheel)",
  12: "Volume rises. Light planned intervals may begin, short at first (about 5 min) with long pauses; harder periods about 10 % of the volume. (Year wheel)",
  1: "Relatively long base intervals begin while volume keeps rising; intervals at least 10 % of the volume, below about 85 % of maximum heart rate. (Compendia p. 14; year wheel)",
  2: "Volume keeps rising; interval time about 15-20 %. The most intensive work starts 6-8 weeks before the rider wants to peak. (Year wheel)",
  3: "Around March, short, hard peak intervals, timed to the wanted peak. A camp in the south may be needed for the hours. (Compendia p. 14; year wheel)",
  4: "The season: training fits the rider's racing; up to two peaks a season, each followed by much less volume and low intensity. (Year wheel)",
  5: "The season: training fits the rider's racing. (Year wheel)",
  6: "A little less volume: many important races, ending with the national championships. (U19 compendium p. 14)",
  7: "A little more volume: the summer holiday leaves room to build a base for the second half of the season. (U19 compendium p. 14)",
  8: "A little less volume late in the season, when riders may be worn, not least mentally. (U19 compendium p. 14)",
  9: "A little less volume, but ride the season to the end: there are many races in September. (U19 compendium p. 14)",
};
