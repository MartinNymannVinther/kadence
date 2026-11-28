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
import {
  keptFrom,
  pastKeeping,
  planCalendar,
  WINDOW_DAYS,
  type PlanSession,
} from "./calendar-plan";
import { tidyCalendar } from "./calendar-tidy";
import { rowsOf } from "./device-workouts";
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
 * changed calls Garmin not once.
 *
 * Once every rider's upcoming sessions are seen to, the run tidies: a
 * workout whose day is more than KEEP_PAST_DAYS behind is taken off Garmin
 * and its row dropped (calendar-tidy.ts, docs/adr/0115), for every link
 * that holds one, whatever the rider's switch says, and also in a
 * workspace that may only be read, which sends nothing.
 *
 * `device_links_to_sync()` (drizzle/0062) names the links, three ids and
 * one answer each, for this job with nobody signed in; everything after it
 * runs as the rider, under the ordinary policies. It is given the first
 * day whose workouts are kept as its "today", so a link that does not send
 * is named only while it holds rows older than that: the ones to tidy.
 * Garmin's limits are kept by the budgets in calendar-budget.ts: a spent
 * app budget, or Garmin's 429, ends the run, and the rest waits for the
 * next one; a rider's spent day waits for tomorrow. The log gets counts
 * only.
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
  /** Workouts whose days were up, taken off Garmin. */
  tidied: number;
  /** Rows whose days were up, dropped without taking anything off: nothing there, or Kadence no longer may. */
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
        skippedAt: plannedSessions.skippedAt,
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
    const sessions = rows.map(({ skippedAt, ...row }): Session => {
      const read = row.sport === "bike" ? readStructure(row.structure, "bike") : null;
      const structure = read?.kind === "bike" && read.steps.length > 0 ? read : null;
      // A skipped session is taken off the device like a deleted one (docs/adr/0117).
      return { ...row, structure, sendable: structure !== null && skippedAt === null };
    });
    return { sessions, rider: rider ?? { ftp: null, thresholdHr: null } };
  });
}

type Synced = {
  /** The last outcome that ended the rider's turn, if any. */
  ended: SyncOutcome | null;
  /** The rider held rows whose days are up when the turn began. */
  tidy: boolean;
};

/** One rider's calendar brought in line. */
async function syncRider(
  owner: LinkOwner,
  provider: DeviceProvider,
  today: string,
  run: WorkoutsRun,
  signal?: AbortSignal,
): Promise<Synced> {
  const end = addDaysIso(today, WINDOW_DAYS - 1);
  const rows = await rowsOf(owner, provider.id);
  const tidy = pastKeeping(rows, today).length > 0;
  const named = rows.flatMap((row) => (row.plannedSessionId ? [row.plannedSessionId] : []));
  const { sessions, rider } = await sessionsOf(owner, today, end, named);
  const sync = calendarSync(owner, provider);
  for (const step of planCalendar({ today, end, sessions, rows })) {
    if (signal?.aborted) return { ended: "busy", tidy };
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
      if (outcome !== "failed") return { ended: outcome, tidy };
    }
  }
  return { ended: null, tidy };
}

/** A rider's turn at their calendar, or false when a press for them is under way. */
async function inTurn<T>(owner: LinkOwner, work: () => Promise<T>): Promise<T | false> {
  const key = `garmin:${owner.riderId}`;
  if (!(await calendarTurn.enter(key))) return false;
  try {
    return await work();
  } finally {
    await calendarTurn.leave(key);
  }
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
    tidied: 0,
    dropped: 0,
    stopped: false,
  };
  const garmin = providerById("garmin");
  if (!garmin.configured() || !garmin.calendar) return run;
  const today = todayInCopenhagen(now);
  const { rows } = await appPool.query<Listed>("select * from device_links_to_sync($1, $2)", [
    "garmin",
    keptFrom(today),
  ]);
  const toTidy: LinkOwner[] = [];

  // The upcoming sessions first, for the riders who send by themselves.
  for (const link of rows) {
    if (signal?.aborted || run.stopped) break;
    const owner: LinkOwner = {
      orgId: link.org_id,
      riderId: link.rider_id,
      riderUserId: link.rider_user_id,
    };
    try {
      // A link that does not send is named for its old rows; one in a workspace
      // that may only be read sends nothing, and is tidied all the same.
      if (!link.send || (await readOnly(owner))) {
        toTidy.push(owner);
        continue;
      }
      // A press for the same rider is under way; this rider waits for the next run.
      const synced = await inTurn(owner, () => syncRider(owner, garmin, today, run, signal));
      if (synced === false) continue;
      run.links++;
      if (synced.ended === "busy") run.stopped = true;
      if (synced.tidy) toTidy.push(owner);
    } catch (error) {
      run.failed++;
      await log.warn("device workouts: a rider was not synced", { error: errorName(error) });
    }
  }

  // Then what Kadence put there whose days are up, within what sending left.
  for (const owner of toTidy) {
    if (signal?.aborted || run.stopped) break;
    try {
      const ended = await inTurn(owner, () => tidyCalendar(owner, garmin, today, run, signal));
      if (ended === "busy") run.stopped = true;
    } catch (error) {
      run.failed++;
      await log.warn("device workouts: a rider's calendar was not tidied", {
        error: errorName(error),
      });
    }
  }
  await log.info("device workouts: garmin calendars", run);
  return run;
}

export const deviceWorkoutsHandler = handle(deviceWorkoutsJob, (_payload, { signal }) =>
  syncGarminCalendars(new Date(), signal),
);
