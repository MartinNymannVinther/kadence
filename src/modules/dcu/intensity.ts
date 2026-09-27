/**
 * What DCU says about intensity, kept as DCU's words and numbers — not as
 * zones. Kadence's zones are its own (ZONE_FTP_PCT and ZONE_HR_PCT in
 * `@/modules/workouts/structure`, ADR 0014); nothing here feeds them.
 *
 * Three sources say something, and they do not agree with one another:
 * - the compendia's example weeks name "Tempotræning (70-80 %)" and
 *   "AT (80-90 %)" without saying what the percent is of;
 * - the web page's year wheel gives the share of the volume at higher
 *   intensity month by month, and a ceiling of about 85 % of maximum
 *   heart rate in January;
 * - the interval sheet (intervaltraening.pdf) gives five interval forms
 *   with when to use them, and bands in percent of heart-rate reserve, in
 *   which AT is 84-92 % rather than the example weeks' 80-90 %.
 * The research note found no zone model in the six documents it read;
 * the interval sheet, linked from the same web page, has one. Whether
 * Kadence should show it beside its own zones is a decision for an ADR,
 * not for this file.
 *
 * Pure: imports nothing from the database.
 */

export type IntensityTerm = { term: string; note: string; source: string };

/** The words of DCU's example weeks, as DCU writes them. */
export const EXAMPLE_WEEK_TERMS: readonly IntensityTerm[] = [
  {
    term: "Grundtræning",
    note: "Base riding; not defined further.",
    source: "DCU_U17_kompendium_2016.pdf p. 14; DCU_U19_kompendium_2016.pdf p. 16-17",
  },
  {
    term: "Tempotræning (70-80 %)",
    note: "Tempo. DCU does not say what the percentage is of.",
    source: "DCU_U17_kompendium_2016.pdf p. 14; DCU_U19_kompendium_2016.pdf p. 16-17",
  },
  {
    term: "AT (80-90 %)",
    note: "AT, usually read as the anaerobic threshold. DCU does not say what the percentage is of.",
    source: "DCU_U17_kompendium_2016.pdf p. 14; DCU_U19_kompendium_2016.pdf p. 16-17",
  },
  {
    term: "fartlege",
    note: "Fartlek.",
    source: "DCU_U17_kompendium_2016.pdf p. 14; DCU_U19_kompendium_2016.pdf p. 16-17",
  },
  {
    term: "Opladning: 1*5 min. AT eller 1*3 max.",
    note: 'Opener the day before a race: one 5-minute AT effort, or "1*3 max." (DCU gives no unit for it).',
    source: "DCU_U17_kompendium_2016.pdf p. 14; DCU_U19_kompendium_2016.pdf p. 17",
  },
];

/**
 * The share of the volume at higher intensity, by month, from DCU's year
 * wheel (web page "Årshjul for træning på landevej"). Only the months the
 * page gives a number for.
 */
export const INTENSITY_SHARE_BY_MONTH: Record<number, IntensityTerm> = {
  11: {
    term: "0 %",
    note: "No periods of high intensity (intervals): build the base first.",
    source: "DCU web page, year wheel, November",
  },
  12: {
    term: "omkring 10 %",
    note: "About 10 % of the volume; intervals short at first (about 5 min) with long pauses, between slightly raised intensity and the anaerobic threshold, lengthening to about 20-30 min over the next months.",
    source: "DCU web page, year wheel, December",
  },
  1: {
    term: "minimum 10 %",
    note: "At least 10 % of the volume, perhaps a little more; the harder periods should not go above about 85 % of maximum heart rate.",
    source: "DCU web page, year wheel, January",
  },
  2: {
    term: "omkring 15-20 %",
    note: "About 15-20 % of the volume, counting everything from a tight chain to maximal effort; the fully intensive work begins 6-8 weeks before the wanted peak.",
    source: "DCU web page, year wheel, February",
  },
};

export type IntervalForm = {
  form: string;
  purpose: string;
  /** Examples as DCU writes them: "2*20" is two times 20 minutes. */
  examples: string;
  /** DCU's "Dage" column; the sheet does not say per what (a week, presumably). */
  days: string;
  /** DCU's "Mængde" column; "-" where it gives none. */
  amount: string;
  placement: string;
};

/** DCU's five interval forms (intervaltraening.pdf p. 2-3), as DCU writes them. */
export const INTERVAL_FORMS: readonly IntervalForm[] = [
  {
    form: "Medium",
    purpose: "General development of fitness; the platform for later intensive peak training.",
    examples: "1*15, 1*20, 1*30, 2*15, 2*20, 2*30",
    days: "2-3",
    amount: "1-3 timer",
    placement: "Fra december/januar",
  },
  {
    form: "AT",
    purpose: "General development of aerobic capacity and building base form.",
    examples: "1*5, 1*10, 1*15, 4*5, 3*8, 3*10 osv.",
    days: "2-3",
    amount: "½-2 timer",
    placement: "Fra december/januar",
  },
  {
    form: "VO2 max",
    purpose: "Raise maximal aerobic capacity and power (oxygen uptake).",
    examples: "5*1, 3*3, 3*2",
    days: "1-2",
    amount: "-",
    placement: "2 måneder før formtop",
  },
  {
    form: "Anaerob kap.",
    purpose: "Intensive work to produce, tolerate and clear lactate.",
    examples: "5*40/40, 2*(4*40/40), 10*30/30",
    days: "1-2",
    amount: "-",
    placement: "4-6 uger før formtop",
  },
  {
    form: "spurt",
    purpose: "Generate a lot of energy in a short time (sprint).",
    examples: "5*10 sek, 10*10 sek, 2*(5*10 sek)",
    days: "1-2",
    amount: "-",
    placement: "2 måneder før formtop",
  },
];

/**
 * The interval sheet's bands, in percent of heart-rate reserve:
 * (working pulse − resting pulse) / (max pulse − resting pulse).
 * DCU's, recorded so the disagreement above is visible; not Kadence's
 * zones and not used by the load model. Null where the sheet prints "-"
 * or leaves the lower edge open ("< 55 %").
 */
export const DCU_HRR_BANDS: readonly { name: string; low: number | null; high: number | null }[] = [
  { name: "Restitution", low: null, high: 55 }, // intervaltraening.pdf p. 3
  { name: "Basis/dist.", low: 56, high: 75 }, // intervaltraening.pdf p. 3
  { name: "Medium", low: 76, high: 83 }, // intervaltraening.pdf p. 3
  { name: "AT", low: 84, high: 92 }, // intervaltraening.pdf p. 3
  { name: "VO2 max", low: 93, high: 100 }, // intervaltraening.pdf p. 3
  { name: "Anaerob kap.", low: null, high: null }, // intervaltraening.pdf p. 3
  { name: "Spurt", low: null, high: null }, // intervaltraening.pdf p. 3
];
