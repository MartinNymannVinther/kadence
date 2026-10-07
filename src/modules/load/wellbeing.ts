import { diffDays } from "@/core/dates";

/**
 * The daily check-in's zones, and what the last three weeks of them ask
 * the adults around a rider to do.
 *
 * Built on Kolding Talent's wellbeing model as Team Danmark's parents'
 * guide presents it (docs/research/foraeldre-og-talentudvikling.md §1,
 * theme 9, and §3.2): wellbeing is balance most of the time; hard spells
 * are normal, but about three weeks of a young person having a hard time
 * should not be accepted; signs of the yellow zone call for a meeting of
 * rider, parent and coach within 14 days, and the red zone for
 * professionals, followed up every week. Kadence paraphrases the model
 * and never diagnoses; the zone is a prompt for a conversation.
 *
 * **One check-in's zone.** The answers are 1–5 where 5 is good (for
 * soreness and stress too: 5 is not sore, not stressed), pain is 0–3 and
 * ill is 0 or 1. The rules, in words a rider and a coach can both check:
 *
 * - **red** if any of: pain 3 (pain during training and after it, up to
 *   pain in everyday life — the top of ATK's pain ladder, §2
 *   "Overbelastning"); ill (never train ill, theme 9); mood 1, the lowest
 *   there is.
 * - **yellow** if any of: pain 2 (pain when starting and the next
 *   morning); any other answer at 1; the answers averaging 2.5 or lower
 *   (at least three answered); under 6 hours of sleep (Team Danmark links
 *   around 6 hours to a markedly higher injury risk, §2 "Søvn").
 * - **green** otherwise.
 *
 * **The status.** The model has four zones; a single day's answers cannot
 * tell "challenged" from "serious", so Kadence judges the pattern by the
 * week instead. The last 21 days are three weeks counted back from today,
 * and a week is yellow when at least half of its check-ins are yellow or
 * red — which works whether a rider checks in every day or once a week (a
 * week without check-ins is unknown, and breaks a run):
 *
 * - a red check-in in the last 7 days makes the status red: get help now;
 * - otherwise, this week yellow makes it yellow: talk within 14 days;
 * - this week yellow and the two before it too — three weeks in a row,
 *   the model's limit — escalates to help;
 * - otherwise green, or null when there is no check-in this week.
 *
 * `yellowDays` counts the yellow-or-red check-ins in the 21 days, not
 * necessarily in a row; `since` is the first of them in the current run.
 *
 * Pure: imports nothing from the database.
 */

export type WellbeingZone = "green" | "yellow" | "red";
export type WellbeingAction = "none" | "talk" | "help";
export type WellbeingSign = "pain" | "ill" | "mood" | "low_answer" | "low_average" | "short_sleep";

const SIGN_ORDER: readonly WellbeingSign[] = [
  "ill",
  "pain",
  "mood",
  "low_answer",
  "low_average",
  "short_sleep",
];

export interface Checkin {
  sleepHours?: number | null;
  sleepQuality?: number | null;
  energy?: number | null;
  mood?: number | null;
  soreness?: number | null;
  stress?: number | null;
  /**
   * ATK's pain ladder folded onto 0–3: 0 none, 1 mild soreness after
   * training, 2 pain at the start, hours after and the next morning, 3 pain
   * during and after training or in everyday life (ATK's steps 3 and 4).
   */
  pain: number;
  /** 1 when ill. */
  ill: number;
}

export interface CheckinZone {
  zone: WellbeingZone;
  signs: WellbeingSign[];
}

export interface WellbeingStatus {
  /** Null when there is no check-in in the last 7 days. */
  zone: WellbeingZone | null;
  /** Yellow-or-red check-ins in the last 21 days, not necessarily in a row. */
  yellowDays: number;
  /** The first yellow-or-red day of the current run; null when green. */
  since: string | null;
  action: WellbeingAction;
  /** What put the status in its zone, for the UI to name. */
  signs: WellbeingSign[];
}

/** Under this many hours a night reads yellow. */
export const SHORT_NIGHT_HOURS = 6;
/** The answers averaging this or lower read yellow. */
export const LOW_AVERAGE = 2.5;
/** The average needs this many answers to mean anything. */
const MIN_ANSWERS_FOR_AVERAGE = 3;
/** The model's "about three weeks". */
export const WELLBEING_WINDOW_DAYS = 21;
const WEEKS = WELLBEING_WINDOW_DAYS / 7;

function answered(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function ordered(signs: Iterable<WellbeingSign>): WellbeingSign[] {
  const set = new Set(signs);
  return SIGN_ORDER.filter((sign) => set.has(sign));
}

/** One check-in's zone and the signs behind it; see the file comment. */
export function checkinZone(checkin: Checkin): CheckinZone {
  const red: WellbeingSign[] = [];
  if (checkin.pain >= 3) red.push("pain");
  if (checkin.ill >= 1) red.push("ill");
  if (answered(checkin.mood) && checkin.mood <= 1) red.push("mood");
  if (red.length > 0) return { zone: "red", signs: ordered(red) };

  const yellow: WellbeingSign[] = [];
  if (checkin.pain === 2) yellow.push("pain");
  const scales = [
    checkin.sleepQuality,
    checkin.energy,
    checkin.mood,
    checkin.soreness,
    checkin.stress,
  ].filter(answered);
  if (scales.some((value) => value <= 1)) yellow.push("low_answer");
  if (scales.length >= MIN_ANSWERS_FOR_AVERAGE) {
    const average = scales.reduce((sum, value) => sum + value, 0) / scales.length;
    if (average <= LOW_AVERAGE) yellow.push("low_average");
  }
  if (answered(checkin.sleepHours) && checkin.sleepHours < SHORT_NIGHT_HOURS)
    yellow.push("short_sleep");
  return yellow.length > 0
    ? { zone: "yellow", signs: ordered(yellow) }
    : { zone: "green", signs: [] };
}

/**
 * Whether one check-in is in the red zone. The one rule both the
 * check-in's `red_since` (src/modules/wellbeing/checkins.ts) and a coach's
 * wellbeing reminder (src/modules/push/wellbeing.ts) go by, so the moment
 * a check-in turned red and the reminder about it can never disagree.
 */
export function isRedCheckin(checkin: Checkin): boolean {
  return checkinZone(checkin).zone === "red";
}

interface Week {
  total: number;
  bad: { date: string; zone: WellbeingZone; signs: WellbeingSign[] }[];
}

function isYellowWeek(week: Week): boolean {
  return week.total > 0 && week.bad.length * 2 >= week.total;
}

/**
 * Where a rider stands over the last three weeks of check-ins, keyed by
 * ISO date; see the file comment. Check-ins after today are ignored.
 */
export function wellbeingStatus(
  checkins: Readonly<Record<string, Checkin>>,
  todayIso: string,
): WellbeingStatus {
  const weeks: Week[] = Array.from({ length: WEEKS }, () => ({ total: 0, bad: [] }));
  for (const [date, checkin] of Object.entries(checkins)) {
    const ago = diffDays(date, todayIso);
    if (ago < 0 || ago >= WELLBEING_WINDOW_DAYS) continue;
    const week = weeks[Math.floor(ago / 7)]!;
    week.total += 1;
    const { zone, signs } = checkinZone(checkin);
    if (zone !== "green") week.bad.push({ date, zone, signs });
  }

  const yellowDays = weeks.reduce((sum, week) => sum + week.bad.length, 0);
  const thisWeek = weeks[0]!;
  if (thisWeek.total === 0)
    return { zone: null, yellowDays, since: null, action: "none", signs: [] };

  const reds = thisWeek.bad.filter((day) => day.zone === "red");
  let run = 0;
  while (run < WEEKS && isYellowWeek(weeks[run]!)) run++;

  let zone: WellbeingZone = "green";
  if (reds.length > 0) zone = "red";
  else if (run > 0) zone = "yellow";
  if (zone === "green") return { zone, yellowDays, since: null, action: "none", signs: [] };

  const runDays = weeks.slice(0, Math.max(run, 1)).flatMap((week) => week.bad);
  const since = runDays.reduce<string | null>(
    (first, day) => (first === null || day.date < first ? day.date : first),
    null,
  );
  const action: WellbeingAction = zone === "red" || run >= WEEKS ? "help" : "talk";
  const signs = ordered((zone === "red" ? reds : thisWeek.bad).flatMap((day) => day.signs));
  return { zone, yellowDays, since, action, signs };
}
