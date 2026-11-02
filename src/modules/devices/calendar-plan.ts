/**
 * What the job does with one rider's calendar at the provider (docs/adr/
 * 0114), worked out from the rider's sessions and what was sent before,
 * before anything is called. Pure.
 *
 * The window is today and the six days after it, Copenhagen days. In it,
 * every bike session with steps is to be on the calendar. A workout that
 * was sent is taken off when its session is gone, is no longer a bike
 * session with steps, or has moved out of the window — into the past, or
 * from inside the window to beyond it. A workout sent by a press for a day
 * beyond the window, whose session is still beyond it, is left alone
 * until the window reaches it. Rows for days before today are not here:
 * the job drops them first without asking the provider
 * (device-workouts.ts `dropPastRows`).
 */

export const WINDOW_DAYS = 7;

export type PlanSession = {
  id: string;
  onDate: string;
  /** A bike session with steps: something the provider can hold. */
  sendable: boolean;
};

export type PlanRow = { id: string; plannedSessionId: string | null; scheduledOn: string };

export type PlanStep<S extends PlanSession, R extends PlanRow> =
  { action: "send"; session: S; row: R | null } | { action: "remove"; row: R };

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

  for (const row of input.rows) {
    if (row.scheduledOn < today) continue;
    const session = row.plannedSessionId ? byId.get(row.plannedSessionId) : undefined;
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
    if (covered.has(session.id) || !session.sendable) continue;
    if (session.onDate < today || session.onDate > end) continue;
    steps.push({ action: "send", session, row: null });
  }

  const day = (step: PlanStep<S, R>) =>
    step.action === "send" ? step.session.onDate : step.row.scheduledOn;
  return steps.sort((a, b) => day(a).localeCompare(day(b)));
}
