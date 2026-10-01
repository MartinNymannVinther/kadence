import { addDaysIso, diffDays, mondayOf } from "@/core/dates";

/**
 * "Kopiér ugen" (ADR 0042): each rider's own sessions of one week, laid
 * again on the same weekdays of another. Which sessions go, which stay
 * behind, and which still belong together — pure, so the preview and the
 * press agree on it.
 *
 * - A session goes as a new, planned session: what was ridden stays with
 *   the week it was ridden in.
 * - A session of a series (ADR 0041) that already has a day in the target
 *   week is left behind: the series has it covered.
 * - Copies of one group plan stay one group, under a new key.
 *
 * Pure: imports nothing from the database.
 */

export type SourceSession = {
  id: string;
  riderId: string;
  onDate: string;
  groupKey: string | null;
  seriesKey: string | null;
};

export type CopyPlan<T extends SourceSession> = {
  copies: Array<{ source: T; onDate: string; groupRef: string | null }>;
  skipped: T[];
};

export function planCopy<T extends SourceSession>(input: {
  sessions: T[];
  fromMonday: string;
  toMonday: string;
  /** The series each rider already has a session of in the target week. */
  seriesInTarget: (riderId: string) => ReadonlySet<string>;
}): CopyPlan<T> {
  const from = mondayOf(input.fromMonday);
  const shift = diffDays(from, mondayOf(input.toMonday));
  const inWeek = input.sessions
    .filter((s) => s.onDate >= from && s.onDate <= addDaysIso(from, 6))
    .sort((a, b) => a.onDate.localeCompare(b.onDate));
  const skipped = inWeek.filter(
    (s) => s.seriesKey !== null && input.seriesInTarget(s.riderId).has(s.seriesKey),
  );
  const going = inWeek.filter((s) => !skipped.includes(s));
  const shared = (key: string | null) =>
    key !== null && going.filter((s) => s.groupKey === key).length > 1;
  return {
    copies: going.map((source) => ({
      source,
      onDate: addDaysIso(source.onDate, shift),
      groupRef: shared(source.groupKey) ? source.groupKey : null,
    })),
    skipped,
  };
}
