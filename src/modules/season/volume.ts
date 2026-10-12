import { addDaysIso } from "@/core/dates";
import { CORRIDOR_BAND, COUNTS_TOWARD_DCU_HOURS, seasonStartYear } from "@/modules/dcu";
import { DCU_2025, type Paradigm, type PlanBasis } from "@/modules/paradigms";

/**
 * How much a rider rides against the season plan, in four numbers that
 * mean the same wherever they are shown (ADR 0040):
 *
 * - **DCU**: DCU's hours for the class-year, with the corridor round them
 *   — for a senior, the training profile's (docs/adr/0091);
 * - **Mål** (goal): the coach's own season plan;
 * - **Planlagt** (planned): the bike sessions in the calendar;
 * - **Udført** (done): what was actually ridden.
 *
 * Only hours on the bike count, as DCU counts them. DCU's and the plan's
 * hours are given per month; a day carries its month's hours over the
 * month's calendar days — the derivation `weeklyCorridor` uses — so a
 * week, a month or a season to date are all sums of their days, and a
 * range across a season's turn reads each day in its own season.
 *
 * Pure: imports nothing from the database.
 */

export type VolumeRange = { from: string; to: string };

/** What one season knows about a rider: the basis DCU's hours are read for, and the coach's months. */
export type SeasonFrame = {
  basis: PlanBasis | null;
  goal: ReadonlyArray<{ month: number; hours: number }> | null;
};

export type VolumeSession = {
  onDate: string;
  sport: string;
  plannedMinutes: number;
  done: boolean;
};
export type VolumeActivity = { onDate: string; sport: string; seconds: number };

export type Volume = {
  /** The DCU class-year or senior profile the range is read for — its first day's season. */
  basis: PlanBasis | null;
  dcu: { low: number; target: number; high: number } | null;
  goal: number | null;
  planned: number;
  done: number;
  /** Done, plus the bike sessions still to ride from today on: where the range is heading. */
  expected: number;
  /** Whether the team plans by a paradigm (ADR 0049); without, `dcu` is always null. */
  guided: boolean;
};

export type VolumeState = "under" | "inside" | "over";

const counts = (sport: string) => COUNTS_TOWARD_DCU_HOURS[sport as "bike"] === true;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function days(range: VolumeRange): string[] {
  const out: string[] = [];
  for (let d = range.from; d <= range.to && out.length < 400; d = addDaysIso(d, 1)) out.push(d);
  return out;
}

const inRange = (date: string, range: VolumeRange) => date >= range.from && date <= range.to;

/**
 * The four numbers for a range. `frameOf` answers for a season by the
 * year it starts in; a day whose season has no basis leaves DCU unknown,
 * and a day whose season has no plan leaves the goal unknown — a number
 * for part of a range would read as the whole.
 */
export function volumeOf(input: {
  range: VolumeRange;
  frameOf: (seasonStartYear: number) => SeasonFrame;
  sessions: ReadonlyArray<VolumeSession>;
  activities: ReadonlyArray<VolumeActivity>;
  today: string;
  /** The team's paradigm (ADR 0049); null leaves the reference number out. */
  paradigm?: Paradigm | null;
}): Volume {
  const paradigm = input.paradigm === undefined ? DCU_2025 : input.paradigm;
  const bike = input.sessions.filter((s) => counts(s.sport) && inRange(s.onDate, input.range));
  const planned = bike.reduce((sum, s) => sum + s.plannedMinutes, 0) / 60;
  const done =
    input.activities
      .filter((a) => counts(a.sport) && inRange(a.onDate, input.range))
      .reduce((sum, a) => sum + Math.max(0, a.seconds), 0) / 3600;
  const ahead =
    bike
      .filter((s) => !s.done && s.onDate >= input.today)
      .reduce((sum, s) => sum + s.plannedMinutes, 0) / 60;
  return volumeFrom(input.range, input.frameOf, paradigm, { planned, done, ahead });
}

/**
 * The reference side of the four numbers for a range: DCU's hours (or a
 * senior profile's) and the season plan's, each day carrying its month's
 * hours over the month's days. Null where any day's season lacks them.
 */
export function referenceHours(
  range: VolumeRange,
  frameOf: (seasonStartYear: number) => SeasonFrame,
  paradigm: Paradigm | null,
): { dcu: number | null; goal: number | null } {
  let dcu: number | null = paradigm ? 0 : null;
  let goal: number | null = 0;
  for (const day of days(range)) {
    const [year, month] = day.split("-").map(Number) as [number, number];
    const frame = frameOf(seasonStartYear(day));
    const share = 1 / daysInMonth(year, month);
    dcu =
      dcu === null || !frame.basis || !paradigm
        ? null
        : dcu + paradigm.monthHours(frame.basis, month) * share;
    const planned = frame.goal?.find((m) => m.month === month);
    goal = goal === null || !planned ? null : goal + planned.hours * share;
  }
  return { dcu, goal };
}

/**
 * The four numbers from the calendar's side already summed — hours put
 * in, ridden, and still to ride from today — as the month and season
 * views read them from one aggregate query (docs/adr/0093).
 */
export function volumeFrom(
  range: VolumeRange,
  frameOf: (seasonStartYear: number) => SeasonFrame,
  paradigm: Paradigm | null,
  hours: { planned: number; done: number; ahead: number },
): Volume {
  const { dcu, goal } = referenceHours(range, frameOf, paradigm);
  return {
    basis: frameOf(seasonStartYear(range.from)).basis,
    dcu:
      dcu === null
        ? null
        : { low: dcu * (1 - CORRIDOR_BAND), target: dcu, high: dcu * (1 + CORRIDOR_BAND) },
    goal,
    planned: hours.planned,
    done: hours.done,
    expected: hours.done + hours.ahead,
    guided: paradigm !== null,
  };
}

/** Where the expected hours land against DCU's corridor; null without one, or in October's break. */
export function dcuState(volume: Volume): VolumeState | null {
  if (!volume.dcu || volume.dcu.target === 0) return null;
  if (volume.expected > volume.dcu.high) return "over";
  if (volume.expected < volume.dcu.low) return "under";
  return "inside";
}

/** The calendar months from the one `from` is in to the one `to` is in, each whole. */
export function monthsBetween(from: string, to: string): Array<VolumeRange & { month: number }> {
  const out: Array<VolumeRange & { month: number }> = [];
  let [year, month] = from.split("-").map(Number) as [number, number];
  const last = to.slice(0, 7);
  while (`${year}-${String(month).padStart(2, "0")}` <= last && out.length < 24) {
    const mm = String(month).padStart(2, "0");
    out.push({
      month,
      from: `${year}-${mm}-01`,
      to: `${year}-${mm}-${String(daysInMonth(year, month)).padStart(2, "0")}`,
    });
    [year, month] = month === 12 ? [year + 1, 1] : [year, month + 1];
  }
  return out;
}

/** The months of a season, October first, each as its own range. */
export function seasonMonths(seasonStart: number): Array<VolumeRange & { month: number }> {
  return [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((month) => {
    const year = month >= 10 ? seasonStart : seasonStart + 1;
    const mm = String(month).padStart(2, "0");
    return {
      month,
      from: `${year}-${mm}-01`,
      to: `${year}-${mm}-${String(daysInMonth(year, month)).padStart(2, "0")}`,
    };
  });
}
