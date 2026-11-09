import { z } from "zod";
import { DeviceHttpError, bearer, requestJson, requestMaybeJson, requestOk } from "./http";
import { GARMIN_MAX_STEPS, garminStepCount, toGarminWorkout } from "./garmin-workout";
import type { WorkoutCalendar } from "./providers";

/**
 * Garmin's Training API, version 2 (docs/adr/0114): a workout is created
 * on the workout portal's path and read, replaced and deleted on the
 * Training API's; a schedule puts a workout on a day and is moved and
 * deleted by its own id. Every call is the rider's, with their token.
 *
 * - Replacing a workout takes its owner's id in the body, which Kadence
 *   does not keep: the workout is read first, and one the rider deleted in
 *   Garmin Connect answers that it is gone, so Kadence creates it anew
 *   instead.
 * - What creating a schedule answers is not described; the id is taken
 *   from a number, a string or an object with `scheduleId`, and when none
 *   comes back, Kadence finds it by the day when it needs it.
 * - A workout or schedule Garmin no longer has (404, 410) is gone, which
 *   is what deleting it wanted anyway.
 *
 * Errors are DeviceHttpError with the status; workout-sync.ts decides what
 * a 401, 403, 412 or 429 means for the link.
 */

const API = "https://apis.garmin.com";
const CREATE = `${API}/workoutportal/workout/v2`;
const workoutUrl = (id: string) => `${API}/training-api/workout/v2/${encodeURIComponent(id)}`;
const SCHEDULES = `${API}/training-api/schedule`;
const scheduleUrl = (id: string) => `${SCHEDULES}/${encodeURIComponent(id)}`;

/** Garmin's ids are longs; anything else that looks like an id is kept as text. */
const Id = z
  .union([
    z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    z.string().regex(/^[\w-]{1,100}$/),
  ])
  .transform(String);

/** An id as Garmin wrote it: a number when it is one. */
function asJsonId(id: string): string | number {
  return /^\d{1,15}$/.test(id) ? Number(id) : id;
}

function headers(accessToken: string) {
  return { ...bearer(accessToken), "Content-Type": "application/json" };
}

function gone(error: unknown): boolean {
  return error instanceof DeviceHttpError && (error.status === 404 || error.status === 410);
}

/** Runs a deletion; something already gone is deleted. */
async function deleted(work: Promise<void>): Promise<void> {
  try {
    await work;
  } catch (error) {
    if (!gone(error)) throw error;
  }
}

async function createWorkout(accessToken: string, workout: object): Promise<string> {
  const created = await requestJson(
    CREATE,
    { method: "POST", headers: headers(accessToken), body: JSON.stringify(workout) },
    z.object({ workoutId: Id }),
  );
  return created.workoutId;
}

async function updateWorkout(
  accessToken: string,
  workoutId: string,
  workout: object,
): Promise<"updated" | "gone"> {
  try {
    const current = await requestJson(
      workoutUrl(workoutId),
      { headers: bearer(accessToken) },
      z.object({ ownerId: z.union([z.number().int(), z.string().regex(/^[\w-]{1,100}$/)]) }),
    );
    await requestOk(workoutUrl(workoutId), {
      method: "PUT",
      headers: headers(accessToken),
      body: JSON.stringify({
        ...workout,
        workoutId: asJsonId(workoutId),
        ownerId: current.ownerId,
      }),
    });
    return "updated";
  } catch (error) {
    if (gone(error)) return "gone";
    throw error;
  }
}

function deleteWorkout(accessToken: string, workoutId: string, timeoutMs?: number) {
  return deleted(
    requestOk(workoutUrl(workoutId), { method: "DELETE", headers: bearer(accessToken) }, timeoutMs),
  );
}

const ScheduleAnswer = z
  .union([Id, z.object({ scheduleId: Id })])
  .transform((answer) => (typeof answer === "string" ? answer : answer.scheduleId));

async function schedule(accessToken: string, workoutId: string, date: string) {
  return requestMaybeJson(
    `${SCHEDULES}/`,
    {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify({ workoutId: asJsonId(workoutId), date }),
    },
    ScheduleAnswer,
  );
}

async function reschedule(
  accessToken: string,
  scheduleId: string,
  workoutId: string,
  date: string,
): Promise<"updated" | "gone"> {
  try {
    await requestOk(scheduleUrl(scheduleId), {
      method: "PUT",
      headers: headers(accessToken),
      body: JSON.stringify({
        scheduleId: asJsonId(scheduleId),
        workoutId: asJsonId(workoutId),
        date,
      }),
    });
    return "updated";
  } catch (error) {
    if (gone(error)) return "gone";
    throw error;
  }
}

function unschedule(accessToken: string, scheduleId: string, timeoutMs?: number) {
  return deleted(
    requestOk(
      scheduleUrl(scheduleId),
      { method: "DELETE", headers: bearer(accessToken) },
      timeoutMs,
    ),
  );
}

async function findSchedule(accessToken: string, workoutId: string, date: string) {
  const query = new URLSearchParams({ startDate: date, endDate: date });
  const schedules = await requestMaybeJson(
    `${SCHEDULES}?${query.toString()}`,
    { headers: bearer(accessToken) },
    z.array(z.object({ scheduleId: Id, workoutId: Id })).max(500),
  );
  return schedules?.find((s) => s.workoutId === workoutId)?.scheduleId ?? null;
}

export const garminTraining: WorkoutCalendar = {
  maxSteps: GARMIN_MAX_STEPS,
  stepCount: garminStepCount,
  build: (workout) =>
    toGarminWorkout(workout.structure, workout.rider, workout.name, workout.description),
  createWorkout,
  updateWorkout,
  deleteWorkout,
  schedule,
  reschedule,
  unschedule,
  findSchedule,
};
