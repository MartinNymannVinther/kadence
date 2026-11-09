import { addDaysIso } from "@/core/dates";

/**
 * What the job does with one rider's calendar at the provider (docs/adr/
 * 0114, 0115), worked out from the rider's sessions and what was sent
 * before, before anything is called. Pure.
 *
 * The window is today and the six days after it, Copenhagen days. In it,
 * every bike session with steps is to be on the calendar. A workout that
 * was sent is taken off when its session is gone, is no longer a bike
 * session with steps, or has moved out of the window — into the past, or
 * from inside the window to beyond it. A workout sent by a press for a day
 * beyond the window, whose session is still beyond it, is left alone
 * until the window reaches it.
 *
 * A workout whose day has passed is left as it is: the rider's recent
 * history at the provider. The one exception is a session moved from a
 * day that has passed into the window, which takes its workout with it
 * rather than leaving it behind and getting a second one. Once its day is
 * more than KEEP_PAST_DAYS behind, the job takes it off after the sending
 * is done (`pastKeeping`, calendar-tidy.ts).
 */

export const WINDOW_DAYS = 7;

/** How many days a workout stays at the provider after its day; then Kadence takes it off. */
export const KEEP_PAST_DAYS = 3;

export type PlanSession = {
  id: string;
  onDate: string;
  /** A bike session with steps: something the provider can hold. */
  sendable: boolean;
};

export type PlanRow = { id: string; plannedSessionId: string | null; scheduledOn: string };

export type PlanStep<S extends PlanSession, R extends PlanRow> =
  { action: "send"; session: S; row: R | null } | { action: "remove"; row: R };

/** The first day whose workouts still stay at the provider: KEEP_PAST_DAYS before today. */
export function keptFrom(today: string): string {
  return addDaysIso(today, -KEEP_PAST_DAYS);
}

/** The rows whose day is more than KEEP_PAST_DAYS before today: Kadence takes those off. */
export function pastKeeping<R extends PlanRow>(rows: readonly R[], today: string): R[] {
  const from = keptFrom(today);
  return rows.filter((row) => row.scheduledOn < from);
}

export function planCalendar<S extends PlanSession, R extends PlanRow>(input: {
  today: string;
  /** The window's last day. */
  end: string;
  sessions: readonly S[];
  rows: readonly R[];
}): Array<PlanStep<S, R>> {
  const { today, end } = input;
  const byId = new Map(input.sessions.map((s) => [s.id, s]));
  const steps: Array<PlanStep<S, R>> = [];
  const covered = new Set<string>();
  const inWindow = (s: S) => s.sendable && s.onDate >= today && s.onDate <= end;

  for (const row of input.rows) {
    const session = row.plannedSessionId ? byId.get(row.plannedSessionId) : undefined;
    if (row.scheduledOn < today) {
      // History, unless its session moved into the window: then the workout goes with it.
      if (session && inWindow(session)) {
        covered.add(session.id);
        steps.push({ action: "send", session, row });
      }
      continue;
    }
    if (session) covered.add(session.id);
    if (!session || !session.sendable || session.onDate < today) {
      steps.push({ action: "remove", row });
    } else if (session.onDate > end) {
      // Moved out of the window, or sent ahead by a press and not yet in it.
      if (row.scheduledOn <= end) steps.push({ action: "remove", row });
    } else {
      steps.push({ action: "send", session, row });
    }
  }

  for (const session of input.sessions) {
    if (covered.has(session.id) || !inWindow(session)) continue;
    steps.push({ action: "send", session, row: null });
  }

  const day = (step: PlanStep<S, R>) =>
    step.action === "send" ? step.session.onDate : step.row.scheduledOn;
  return steps.sort((a, b) => day(a).localeCompare(day(b)));
}
