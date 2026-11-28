import { addDaysIso, diffDays } from "@/core/dates";

/**
 * The patterns in a rider's moved and skipped sessions (docs/adr/0119):
 * what the coach sees on the rider's page and as a hint in "Planlæg
 * ugen", so the plan can be shaped to the rider. Rules, not a model:
 *
 * - a weekday whose sessions are often moved or skipped;
 * - one reason behind most changes;
 * - long sessions (two hours and more) among most changes;
 * - strength sessions among most changes.
 *
 * Each needs at least three changes and a clear share of them, so a
 * single bad week is not a pattern. The window is the last eight weeks,
 * by the day the session was on.
 *
 * What counts: the rider's own moves and skips, and a coach's made in the
 * three days before the session — a coach rearranging weeks ahead is
 * planning, not a sign. A skip taken back with "Fortryd" counts for
 * nothing. Pure: imports nothing from the database.
 */

export const PATTERN_WEEKS = 8;
/** At least this many changes before anything is called a pattern. */
export const PATTERN_MIN = 3;
/** A coach's change this close to the session counts as a sign. */
const COACH_CLOSE_DAYS = 3;
const LONG_MINUTES = 120;

export type ChangeFact = {
  plannedSessionId: string | null;
  kind: string;
  fromDate: string;
  reason: string | null;
  byRole: string;
  /** When the change was made, as a Copenhagen day. */
  changedOn: string;
  sport: string;
  plannedMinutes: number;
};

export type ChangePattern =
  | { key: "weekday"; weekday: number; count: number; total: number; reason: string | null }
  | { key: "reason"; reason: string; count: number; total: number }
  | { key: "long"; count: number; total: number }
  | { key: "strength"; count: number; total: number };

export type ChangeSummary = {
  moved: number;
  skipped: number;
  /** The reasons given, most often first; at most three. */
  reasons: { reason: string; count: number }[];
  /** The clearest patterns first; at most three. */
  patterns: ChangePattern[];
};

/** Monday 0 … Sunday 6, for an ISO day. */
export function weekdayOf(iso: string): number {
  return (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;
}

/** The changes that say something about the rider, in the window. */
export function countedChanges(changes: readonly ChangeFact[], today: string): ChangeFact[] {
  const from = addDaysIso(today, -7 * PATTERN_WEEKS);
  const undone = new Set(
    changes
      .filter((c) => c.kind === "unskipped" && c.plannedSessionId)
      .map((c) => c.plannedSessionId),
  );
  return changes.filter(
    (c) =>
      (c.kind === "moved" || (c.kind === "skipped" && !undone.has(c.plannedSessionId))) &&
      c.fromDate >= from &&
      c.fromDate <= addDaysIso(today, 7 * PATTERN_WEEKS) &&
      (c.byRole === "rider" || diffDays(c.changedOn, c.fromDate) <= COACH_CLOSE_DAYS),
  );
}

function mostCommon(values: readonly string[]): { value: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: { value: string; count: number } | null = null;
  for (const [value, count] of counts)
    if (!best || count > best.count || (count === best.count && value < best.value))
      best = { value, count };
  return best;
}

const clear = (count: number, total: number, share: number) =>
  count >= PATTERN_MIN && count / total >= share;

export function changeSummary(changes: readonly ChangeFact[], today: string): ChangeSummary {
  const counted = countedChanges(changes, today);
  const total = counted.length;
  const reasons = new Map<string, number>();
  for (const c of counted) if (c.reason) reasons.set(c.reason, (reasons.get(c.reason) ?? 0) + 1);
  const patterns: ChangePattern[] = [];

  const day = mostCommon(counted.map((c) => String(weekdayOf(c.fromDate))));
  if (day && clear(day.count, total, 0.4)) {
    const onDay = counted.filter((c) => String(weekdayOf(c.fromDate)) === day.value);
    const why = mostCommon(onDay.flatMap((c) => (c.reason ? [c.reason] : [])));
    patterns.push({
      key: "weekday",
      weekday: Number(day.value),
      count: day.count,
      total,
      reason: why && why.count * 2 > day.count ? why.value : null,
    });
  }
  const why = mostCommon(counted.flatMap((c) => (c.reason ? [c.reason] : [])));
  if (why && clear(why.count, total, 0.5))
    patterns.push({ key: "reason", reason: why.value, count: why.count, total });
  const long = counted.filter((c) => c.plannedMinutes >= LONG_MINUTES).length;
  if (clear(long, total, 0.5)) patterns.push({ key: "long", count: long, total });
  const strength = counted.filter((c) => c.sport === "strength").length;
  if (clear(strength, total, 0.6)) patterns.push({ key: "strength", count: strength, total });

  return {
    moved: counted.filter((c) => c.kind === "moved").length,
    skipped: counted.filter((c) => c.kind === "skipped").length,
    reasons: [...reasons]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason))
      .slice(0, 3),
    patterns: patterns.sort((a, b) => b.count - a.count).slice(0, 3),
  };
}
