import type { CheckinRow } from "@/core/db/schema";
import type { RecentRide } from "@/modules/today/recent-rides";
import type { CalendarSession } from "@/modules/training/sessions";

/**
 * What a tool's answer looks like: Kadence's rows folded into plain
 * objects with English keys, minutes and kilometres, and whatever a person
 * wrote in a field of its own, capped (docs/plan-mcp.md §2.4). Nobody's
 * account id, nothing about other people, no GPS track. A ride that came
 * through Garmin keeps only what Kadence itself holds about it: that it
 * was ridden, the session it was planned as, and what the rider said of
 * it — how hard, how it felt, the note. Garmin's own numbers (time,
 * distance, load, heart rate, power, the day it was recorded) do not go
 * to a model the rider chose (docs/adr/0118, amended 28 November 2026; ADR 0112). Pure.
 */

export const TEXT_CHARS = 2000;
export const TITLE_CHARS = 120;

/** A person's own words, capped and with control characters out; empty stays empty. */
export function text(value: string | null | undefined, max = TEXT_CHARS): string {
  return (value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").slice(0, max);
}

const minutes = (seconds: number | null | undefined) =>
  typeof seconds === "number" ? Math.round(seconds / 60) : null;
const km = (metres: number | null | undefined) =>
  typeof metres === "number" ? Math.round(metres / 100) / 10 : null;
const whole = (n: number | null | undefined) => (typeof n === "number" ? Math.round(n) : null);

export const fromGarmin = (source: string | null | undefined) => source === "garmin";

export function sessionShape(s: CalendarSession) {
  const ride = s.activity;
  return {
    id: s.id,
    date: s.onDate,
    startTime: s.startTime ?? null,
    sport: s.sport,
    title: text(s.title, TITLE_CHARS),
    description: text(s.description),
    plannedMinutes: s.plannedMinutes ?? null,
    plannedKm: s.plannedKm ?? null,
    plannedLoad: whole(s.plannedLoad),
    meetingPlace: text(s.meetingPlace, TITLE_CHARS),
    structure: s.structure ?? null,
    ridden: ride
      ? fromGarmin(ride.source)
        ? { fromGarmin: true, rpe: ride.rpe ?? null }
        : {
            minutes: minutes(ride.movingSeconds),
            km: km(ride.distanceM),
            load: whole(ride.load),
            rpe: ride.rpe ?? null,
          }
      : null,
    comments: s.commentCount,
  };
}

export function rideShape(r: RecentRide) {
  return {
    id: r.id,
    date: r.onDate,
    sport: r.sport,
    title: "title" in r.name ? text(r.name.title, TITLE_CHARS) : "",
    minutes: minutes(r.movingSeconds),
    km: km(r.distanceM),
    load: whole(r.load),
    rpe: r.rpe,
    feel: r.feel,
    note: text(r.note),
    planned: r.planned,
  };
}

/**
 * A ride from Garmin, as the rider's own part of it: what they said of it,
 * and — when it was planned — the session's day and title, which are
 * Kadence's. A ride nobody planned carries no day: the day it was ridden
 * is Garmin's.
 */
export function garminRideShape(r: RecentRide) {
  return {
    id: r.id,
    fromGarmin: true as const,
    planned: r.planned,
    date: r.planned ? r.onDate : null,
    title: r.planned && "title" in r.name ? text(r.name.title, TITLE_CHARS) : "",
    rpe: r.rpe,
    feel: r.feel,
    note: text(r.note),
  };
}

/** Any ride: Kadence's numbers for one of its own, the rider's part for one from Garmin. */
export const anyRideShape = (r: RecentRide) =>
  fromGarmin(r.source) ? garminRideShape(r) : rideShape(r);

export function checkinShape(c: CheckinRow) {
  return {
    date: c.onDate,
    sleepHours: c.sleepHours,
    sleepQuality: c.sleepQuality,
    energy: c.energy,
    mood: c.mood,
    soreness: c.soreness,
    stress: c.stress,
    pain: c.pain,
    painWhere: text(c.painWhere, TITLE_CHARS),
    ill: c.ill === 1,
    note: text(c.note),
  };
}

/** The scales, said once in the tool's description so the model reads the numbers right. */
export const CHECKIN_SCALES =
  "Scales run 1-5 with 5 the good end: sleepQuality, energy, mood, soreness (5 = fresh legs), stress (5 = calm). pain follows Team Danmark's ATK pain ladder: 0 no pain, 1 a little sore after training but it passes, 2 hurts when starting and the next day, 3 hurts during training or in everyday life. ill is true when the rider was ill.";
