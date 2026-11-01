import { fakeFetch, json, type Call, type Route } from "./fake-fetch";

/**
 * Garmin's Training API, version 2, in memory, for the tests of
 * docs/adr/0114: workouts and schedules kept the way Garmin keeps them,
 * created on the workout portal's path and read, replaced and deleted on
 * the Training API's, every call recorded (fake-fetch.ts). Ids count up
 * from 1001 for workouts and 2001 for schedules, so a test can name them.
 * `overrides` answers a route differently: a refusal, a slow Garmin.
 */

const API = "https://apis.garmin.com";
export const CREATE = `POST ${API}/workoutportal/workout/v2`;
export const SCHEDULE_NEW = `POST ${API}/training-api/schedule/`;
export const SCHEDULES = `GET ${API}/training-api/schedule`;
export const workout = (method: string, id: number | string) =>
  `${method} ${API}/training-api/workout/v2/${id}`;
export const schedule = (method: string, id: number | string) =>
  `${method} ${API}/training-api/schedule/${id}`;

export type GarminCalendar = {
  workouts: Map<string, Record<string, unknown>>;
  schedules: Map<string, { workoutId: string; date: string }>;
  next: { workout: number; schedule: number };
};

export function emptyCalendar(): GarminCalendar {
  return { workouts: new Map(), schedules: new Map(), next: { workout: 1001, schedule: 2001 } };
}

const nothing = (status = 204) => new Response(null, { status });
const body = (call: Call) => JSON.parse(call.body ?? "{}") as Record<string, unknown>;

/** Routes the fake Garmin answers; the calls Kadence made, in order. */
export function fakeCalendar(
  calendar: GarminCalendar = emptyCalendar(),
  overrides: Record<string, Route> = {},
): Call[] {
  const routes: Record<string, Route> = {
    [CREATE]: (call) => {
      const id = String(calendar.next.workout++);
      calendar.workouts.set(id, body(call));
      return json({ ...body(call), workoutId: Number(id), ownerId: 77 });
    },
    [SCHEDULE_NEW]: (call) => {
      const id = calendar.next.schedule++;
      const { workoutId, date } = body(call);
      calendar.schedules.set(String(id), { workoutId: String(workoutId), date: String(date) });
      return json(id);
    },
  };
  for (let n = 1001; n < 1100; n++) {
    const id = String(n);
    routes[workout("GET", id)] = () => {
      const found = calendar.workouts.get(id);
      return found ? json({ ...found, workoutId: n, ownerId: 77 }) : nothing(404);
    };
    routes[workout("PUT", id)] = (call) => {
      if (!calendar.workouts.has(id)) return nothing(404);
      calendar.workouts.set(id, body(call));
      return nothing();
    };
    routes[workout("DELETE", id)] = () => nothing(calendar.workouts.delete(id) ? 204 : 404);
  }
  for (let n = 2001; n < 2100; n++) {
    const id = String(n);
    routes[schedule("PUT", id)] = (call) => {
      if (!calendar.schedules.has(id)) return nothing(404);
      const { workoutId, date } = body(call);
      calendar.schedules.set(id, { workoutId: String(workoutId), date: String(date) });
      return json({ scheduleId: n, workoutId, date });
    };
    routes[schedule("DELETE", id)] = () => nothing(calendar.schedules.delete(id) ? 204 : 404);
  }
  return fakeFetch({ ...routes, ...overrides });
}

/** "METHOD path" of each call, for a test that asserts the order. */
export function called(calls: Call[]): string[] {
  return calls.map((c) => `${c.method} ${new URL(c.url).pathname}`);
}
