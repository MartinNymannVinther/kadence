import { and, eq, gte, inArray, lte, or } from "drizzle-orm";
import { appPool } from "@/core/db/client";
import { plannedSessions, riders } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { payload } from "@/core/jobs/payload";
import { handle, jobKind } from "@/core/jobs/registry";
import { SCHEDULE } from "@/core/jobs/schedule";
import { errorName, log } from "@/core/log";
import { planIn } from "@/modules/billing/state";
import { readStructure, type BikeStructure } from "@/modules/workouts/structure";
import { calendarTurn } from "./calendar-budget";
import { planCalendar, WINDOW_DAYS, type PlanSession } from "./calendar-plan";
import { dropPastRows, rowsOf } from "./device-workouts";
import type { LinkOwner } from "./links";
import { providerById, type DeviceProvider } from "./providers";
import { calendarSync, syncWorkout, type SyncOutcome } from "./workout-sync";

/**
 * Keeps riders' planned bike sessions on their Garmin calendar
 * (docs/adr/0114), every quarter of an hour. For every Garmin link whose
 * rider sends automatically and granted workout import, the rider's
 * sessions from today through the sixth day after (Copenhagen days) are
 * compared with what was sent (calendar-plan.ts), and only what differs is
 * created, changed or taken off (workout-sync.ts) — a run in which nothing
 * changed calls Garmin not once. Rows for days that have passed are
 * dropped without a call, for every link that has any.
 *
 * `device_links_to_sync()` (drizzle/0062) names the links, three ids and
 * one answer each, for this job with nobody signed in; everything after it
 * runs as the rider, under the ordinary policies. A workspace that may
 * only be read sends nothing. Garmin's limits are kept by the budgets in
 * calendar-budget.ts: a spent app budget, or Garmin's 429, ends the run,
 * and the rest waits for the next one; a rider's spent day waits for
 * tomorrow. The log gets counts only.
 */

export const deviceWorkoutsJob = jobKind("device.workouts", payload({}), {
  every: SCHEDULE.deviceWorkouts,
  timeoutMs: 10 * 60_000,
});

export type WorkoutsRun = {
  links: number;
  sent: number;
  removed: number;
  unchanged: number;
  refused: number;
  failed: number;
  dropped: number;
  /** The run stopped for Garmin's sake; the rest waits for the next one. */
  stopped: boolean;
};

type Listed = { org_id: string; rider_id: string; rider_user_id: string; send: boolean };
type Session = PlanSession & {
  title: string;
  description: string;
  updatedAt: Date;
  structure: BikeStructure | null;
};

/** Whether the rider's workspace may only be read (docs/adr/0090): then nothing is sent. */
async function readOnly(owner: LinkOwner): Promise<boolean> {
  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  const plan = await withOrgContext(riderCtx, (tx) => planIn(tx, owner.orgId));
  return plan.plan === "expired";
}

/** The rider's sessions in the window, and those the rows name wherever they are. */
async function sessionsOf(owner: LinkOwner, today: string, end: string, named: string[]) {
  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  return withOrgContext(riderCtx, async (tx) => {
    const rows = await tx
      .select({
        id: plannedSessions.id,
        sport: plannedSessions.sport,
        title: plannedSessions.title,
        description: plannedSessions.description,
        onDate: plannedSessions.onDate,
        structure: plannedSessions.structure,
        updatedAt: plannedSessions.updatedAt,
      })
      .from(plannedSessions)
      .where(
        and(
          eq(plannedSessions.riderId, owner.riderId),
          or(
            and(gte(plannedSessions.onDate, today), lte(plannedSessions.onDate, end)),
            named.length > 0 ? inArray(plannedSessions.id, named) : undefined,
          ),
        ),
      );
    const [rider] = await tx
      .select({ ftp: riders.ftpWatts, thresholdHr: riders.thresholdHr })
      .from(riders)
      .where(eq(riders.id, owner.riderId));
    const sessions = rows.map((row): Session => {
      const read = row.sport === "bike" ? readStructure(row.structure, "bike") : null;
      const structure = read?.kind === "bike" && read.steps.length > 0 ? read : null;
      return { ...row, structure, sendable: structure !== null };
    });
    return { sessions, rider: rider ?? { ftp: null, thresholdHr: null } };
  });
}

/** One rider's calendar brought in line; the last outcome that ends the link's turn, if any. */
async function syncRider(
  owner: LinkOwner,
  provider: DeviceProvider,
  today: string,
  run: WorkoutsRun,
  signal?: AbortSignal,
): Promise<SyncOutcome | null> {
  const end = addDaysIso(today, WINDOW_DAYS - 1);
  const rows = await rowsOf(owner, provider.id);
  const named = rows.flatMap((row) => (row.plannedSessionId ? [row.plannedSessionId] : []));
  const { sessions, rider } = await sessionsOf(owner, today, end, named);
  const sync = calendarSync(owner, provider, today);
  for (const step of planCalendar({ today, end, sessions, rows })) {
    if (signal?.aborted) return "busy";
    const outcome =
      step.action === "remove"
        ? await syncWorkout(sync, step.row, { kind: "remove" })
        : await syncWorkout(sync, step.row, {
            kind: "send",
            workout: {
              sessionId: step.session.id,
              name: step.session.title,
              description: step.session.description,
              onDate: step.session.onDate,
              structure: step.session.structure!,
              rider,
              updatedAt: step.session.updatedAt,
            },
          });
    if (outcome === "sent") run.sent++;
    else if (outcome === "removed") run.removed++;
    else if (outcome === "unchanged") run.unchanged++;
    else if (outcome === "too_many_steps" || outcome === "rejected") run.refused++;
    else {
      run.failed++;
      // A link Garmin refuses, a missing permission or a spent budget ends
      // the rider's turn; a provider that failed once is tried for the rest.
      if (outcome !== "failed") return outcome;
    }
  }
  return null;
}

export async function syncGarminCalendars(
  now: Date = new Date(),
  signal?: AbortSignal,
): Promise<WorkoutsRun> {
  const run: WorkoutsRun = {
    links: 0,
    sent: 0,
    removed: 0,
    unchanged: 0,
    refused: 0,
    failed: 0,
    dropped: 0,
    stopped: false,
  };
  const garmin = providerById("garmin");
  if (!garmin.configured() || !garmin.calendar) return run;
  const today = todayInCopenhagen(now);
  const { rows } = await appPool.query<Listed>("select * from device_links_to_sync($1, $2)", [
    "garmin",
    today,
  ]);
  for (const link of rows) {
    if (signal?.aborted || run.stopped) break;
    const owner: LinkOwner = {
      orgId: link.org_id,
      riderId: link.rider_id,
      riderUserId: link.rider_user_id,
    };
    const key = `garmin:${owner.riderId}`;
    try {
      run.dropped += await dropPastRows(owner, "garmin", today);
      if (!link.send) continue;
      if (await readOnly(owner)) continue;
      // A press for the same rider is under way; this rider waits for the next run.
      if (!(await calendarTurn.enter(key))) continue;
      run.links++;
      try {
        const ended = await syncRider(owner, garmin, today, run, signal);
        if (ended === "busy") run.stopped = true;
      } finally {
        await calendarTurn.leave(key);
      }
    } catch (error) {
      run.failed++;
      await log.warn("device workouts: a rider was not synced", { error: errorName(error) });
    }
  }
  await log.info("device workouts: garmin calendars", run);
  return run;
}

export const deviceWorkoutsHandler = handle(deviceWorkoutsJob, (_payload, { signal }) =>
  syncGarminCalendars(new Date(), signal),
);
