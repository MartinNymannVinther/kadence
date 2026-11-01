import { createHash } from "node:crypto";
import { Refused } from "@/core/action";
import { log } from "@/core/log";
import { BudgetSpent, spendCall } from "./calendar-budget";
import {
  dropRow,
  noteRow,
  saveRow,
  type DeviceWorkoutRow,
  type RowValues,
} from "./device-workouts";
import { DeviceHttpError, loggable } from "./http";
import { accessTokenFor } from "./link-tokens";
import { markLink, type LinkOwner } from "./links";
import { refreshPermissions } from "./permissions";
import type { DeviceProvider, PushWorkout, WorkoutCalendar } from "./providers";

/**
 * The one way a planned session reaches, changes on or leaves a rider's
 * calendar at the provider (docs/adr/0114), for the job and for a press
 * alike. What the provider holds is what `device_workouts` says:
 *
 * - no row: the workout is created, then scheduled on its day;
 * - the workout's hash changed: it is replaced, and moved if its day did;
 * - only the day changed: the schedule is moved;
 * - nothing changed: nothing is called, so pressing again makes no copy;
 * - the session is gone, moved off or no longer a bike session with steps
 *   (`remove`): the schedule and the workout are deleted at the provider
 *   and the row dropped — unless its day has passed, which is the rider's
 *   history there and is left alone;
 * - more steps than the provider takes: nothing is sent, a workout sent
 *   before is taken off, and the row says why.
 *
 * Answers from the provider: a 401 leaves the link for the rider to
 * connect again, as G2's calls do; a 403 is noted on the link
 * (`workouts_refused`) without stopping the rides, and the job leaves the
 * link until the rider connects again or a press gets through; a 412 is a
 * missing permission, read again from Garmin; a 429, or Kadence's own
 * budget spent (calendar-budget.ts), is "busy"; another refusal is
 * remembered against the workout's hash so it is not sent again unchanged
 * except by a press; anything else is tried again on the next run.
 */

export type Desired = { kind: "send"; workout: PushWorkout } | { kind: "remove" };

export type SyncOutcome =
  | "sent"
  | "unchanged"
  | "removed"
  | "too_many_steps"
  | "rejected"
  | "reconnect"
  | "refused"
  | "permission"
  | "busy"
  /** The rider's own calls for the day are spent; others may go on. */
  | "spent"
  | "failed";

export type Sync = {
  owner: LinkOwner;
  provider: DeviceProvider;
  calendar: WorkoutCalendar;
  /** The Copenhagen day: a workout before it is history and stays. */
  today: string;
  /** A press: a workout the provider turned down before is sent again. */
  again: boolean;
  token: () => Promise<string>;
};

export function calendarSync(
  owner: LinkOwner,
  provider: DeviceProvider,
  today: string,
  options: { again?: boolean; accessToken?: string } = {},
): Sync {
  if (!provider.calendar) throw new Error(`${provider.id}: no calendar`);
  let token: Promise<string> | null = options.accessToken
    ? Promise.resolve(options.accessToken)
    : null;
  return {
    owner,
    provider,
    calendar: provider.calendar,
    today,
    again: options.again ?? false,
    // Read once, and only when a call is made.
    token: () => (token ??= accessTokenFor(owner, provider)),
  };
}

/** The hash of a workout as sent: what the rider would ride, targets included. */
export function workoutHash(workout: object): string {
  return createHash("sha256").update(JSON.stringify(workout)).digest("hex");
}

async function call<T>(sync: Sync, work: (token: string) => Promise<T>): Promise<T> {
  await spendCall(sync.provider.id, sync.owner.riderId);
  return work(await sync.token());
}

/** The workout off the rider's calendar, unless its day has passed. */
export async function takeOff(sync: Sync, row: DeviceWorkoutRow, timeoutMs?: number) {
  const workoutId = row.externalWorkoutId;
  if (!workoutId || row.scheduledOn < sync.today) return;
  const scheduleId = row.externalScheduleId;
  if (scheduleId) await call(sync, (t) => sync.calendar.unschedule(t, scheduleId, timeoutMs));
  await call(sync, (t) => sync.calendar.deleteWorkout(t, workoutId, timeoutMs));
}

type State = { row: DeviceWorkoutRow | null; sessionId: string | null; hash: string };

export async function syncWorkout(
  sync: Sync,
  row: DeviceWorkoutRow | null,
  desired: Desired,
): Promise<SyncOutcome> {
  const state: State = { row, sessionId: row?.plannedSessionId ?? null, hash: "" };
  try {
    if (desired.kind === "send") return await send(sync, state, desired.workout);
    if (!row) return "unchanged";
    await takeOff(sync, row);
    await dropRow(sync.owner, row);
    return "removed";
  } catch (error) {
    return failed(sync, state, desired, error);
  }
}

async function send(sync: Sync, state: State, workout: PushWorkout): Promise<SyncOutcome> {
  const { calendar, owner, provider } = sync;
  const day = workout.onDate;
  state.sessionId = workout.sessionId;
  const body = calendar.build(workout);
  const hash = (state.hash = workoutHash(body));
  const row = state.row;
  const record = async (values: RowValues) => {
    state.row = await saveRow(owner, provider.id, workout.sessionId, state.row, values);
  };
  const empty = { externalWorkoutId: null, externalScheduleId: null, sentAt: null };

  if (calendar.stepCount(workout.structure) > calendar.maxSteps) {
    if (row?.lastError === "too_many_steps" && row.contentHash === hash && !row.externalWorkoutId)
      return "too_many_steps";
    if (row) await takeOff(sync, row);
    await record({ ...empty, scheduledOn: day, contentHash: hash, lastError: "too_many_steps" });
    return "too_many_steps";
  }
  if (row?.lastError === "rejected" && row.contentHash === hash && !sync.again) return "rejected";

  let workoutId = row?.externalWorkoutId ?? null;
  let scheduleId = row?.externalScheduleId ?? null;
  let scheduledOn = row?.scheduledOn ?? day;
  const current = workoutId !== null && row?.contentHash === hash;
  if (current && scheduleId && scheduledOn === day) {
    if (row?.lastError) await noteRow(owner, row, "");
    return "unchanged";
  }

  const sent = () => ({ contentHash: hash, sentAt: new Date(), lastError: "" });
  if (workoutId && !current) {
    const id = workoutId;
    if ((await call(sync, (t) => calendar.updateWorkout(t, id, body))) === "gone") {
      workoutId = null;
      scheduleId = null;
    } else {
      await record({
        externalWorkoutId: id,
        externalScheduleId: scheduleId,
        scheduledOn,
        ...sent(),
      });
    }
  }
  if (!workoutId) {
    workoutId = await call(sync, (t) => calendar.createWorkout(t, body));
    scheduleId = null;
    scheduledOn = day;
    await record({
      externalWorkoutId: workoutId,
      externalScheduleId: null,
      scheduledOn,
      ...sent(),
    });
  }

  const id = workoutId;
  if (scheduleId && scheduledOn !== day) {
    const moving = scheduleId;
    if ((await call(sync, (t) => calendar.reschedule(t, moving, id, day))) === "gone")
      scheduleId = null;
  }
  if (!scheduleId) {
    scheduleId =
      (await call(sync, (t) => calendar.schedule(t, id, day))) ??
      (await call(sync, (t) => calendar.findSchedule(t, id, day)));
  }
  await record({
    externalWorkoutId: id,
    externalScheduleId: scheduleId,
    scheduledOn: day,
    ...sent(),
    // Scheduled, but the provider did not say under which id: tried again next time.
    lastError: scheduleId ? "" : "provider_error",
  });
  return "sent";
}

async function failed(
  sync: Sync,
  state: State,
  desired: Desired,
  error: unknown,
): Promise<SyncOutcome> {
  const { owner, provider } = sync;
  if (error instanceof BudgetSpent) return error.scope === "rider" ? "spent" : "busy";
  if (error instanceof Refused)
    return error.detail === "provider_unavailable" ? "failed" : "reconnect";
  if (!(error instanceof DeviceHttpError)) throw error;
  await log.warn("device calendar: a call failed", {
    provider: provider.id,
    error: loggable(error),
  });
  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  const row = state.row;
  switch (error.status) {
    case 401:
      await markLink(riderCtx, owner.riderId, provider.id, {
        status: "error",
        lastError: "unauthorized",
      });
      return "reconnect";
    case 403:
      await markLink(riderCtx, owner.riderId, provider.id, { lastError: "workouts_refused" });
      return "refused";
    case 412:
      // Garmin's list is what counts; read it again, within the budget.
      await spendCall(provider.id, owner.riderId)
        .then(() => refreshPermissions(provider, owner))
        .catch(() => undefined);
      return "permission";
    case 429:
      return "busy";
  }
  if (!error.rejected) {
    if (row) await noteRow(owner, row, "provider_error");
    return "failed";
  }
  if (desired.kind === "remove") {
    // The provider will not delete it; Kadence stops asking.
    if (row) await dropRow(owner, row);
    return "rejected";
  }
  state.row = await saveRow(owner, provider.id, state.sessionId, row, {
    externalWorkoutId: row?.externalWorkoutId ?? null,
    externalScheduleId: row?.externalScheduleId ?? null,
    scheduledOn: row?.scheduledOn ?? desired.workout.onDate,
    contentHash: state.hash,
    sentAt: row?.sentAt ?? null,
    lastError: "rejected",
  });
  return "rejected";
}
