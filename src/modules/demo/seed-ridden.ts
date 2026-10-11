import { addDaysIso, diffDays, mondayOf } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { importFit } from "@/modules/devices/import";
import { completeSession } from "@/modules/training/complete";
import { listSessions, type CalendarSession } from "@/modules/training/sessions";
import { saveCheckin } from "@/modules/wellbeing/checkins";
import { kindOf, rideFit, routeFor } from "./rides";
import { sampleRideFit } from "./sample-ride";
import { NOTES, pick, RIDERS, type L } from "./seed-data";

/** The weeks whose rides are real files; earlier ones are ticked off by hand. */
const RIDE_WEEKS = 3;
/** Check-ins run six weeks back, so the pilot's three numbers (ADR 0066) have more than a fortnight to show. */
const CHECKIN_DAYS = 42;

/**
 * What was ridden of the weeks the demo planned, and the check-ins beside
 * them: shared by the team (seed.ts) and the person alone (seed-alone.ts).
 * `riderIds[i]` rides at `RIDERS[i]`'s thresholds. Returns the sessions
 * before today, for what is written about them afterwards.
 */
export async function ridePast(
  ctx: OrgContext,
  l: L,
  args: { riderIds: string[]; firstMonday: string; today: string; rnd: () => number },
): Promise<CalendarSession[]> {
  const { riderIds, firstMonday, today, rnd } = args;
  // What was ridden: most sessions, a little shorter or longer, a few missed.
  const past = await listSessions(ctx, { from: firstMonday, to: addDaysIso(today, -1) });
  const longRide = past.findLast(
    (s) => s.riderId === riderIds[0] && s.sport === "bike" && s.plannedMinutes >= 90,
  );
  const thresholds = new Map(riderIds.map((id, i) => [id, RIDERS[i]!]));
  const ridesFrom = addDaysIso(mondayOf(today), -7 * (RIDE_WEEKS - 1));
  let rideNo = 0;
  for (const s of past) {
    if (s === longRide) continue;
    if (rnd() < 0.1) continue;
    const factor = 0.85 + rnd() * 0.25;
    const rider = thresholds.get(s.riderId);
    if (s.sport === "bike" && s.onDate >= ridesFrom && rider) {
      rideNo++;
      const route = routeFor(diffDays(firstMonday, s.onDate), s.plannedMinutes);
      const weekend = [0, 6].includes(new Date(`${s.onDate}T12:00:00Z`).getUTCDay());
      await importFit(
        ctx,
        s.riderId,
        `${pick(route.name, l)}.fit`,
        rideFit(
          {
            route,
            kind: kindOf(s.title),
            minutes: s.plannedMinutes,
            ftp: rider.ftp,
            thresholdHr: rider.thr,
            factor,
            seed: 100 + rideNo,
            stopSeconds: s.plannedMinutes >= 120 && rnd() < 0.5 ? 12 * 60 : undefined,
          },
          Date.parse(`${s.onDate}T${weekend ? "07" : "14"}:30:00Z`),
        ),
      );
      continue;
    }
    const base =
      s.sport === "strength" ? 6 : s.title.includes("VO2") ? 8 : s.title.includes("AT") ? 7 : 3;
    await completeSession(ctx, s.id, {
      minutes: Math.max(20, Math.round(s.plannedMinutes * factor)),
      distanceKm:
        s.sport === "bike" ? Math.round((s.plannedMinutes / 60) * (28 + rnd() * 6)) : null,
      rpe: Math.min(10, Math.max(1, base + (rnd() < 0.3 ? 1 : 0))),
      feel: 3 + (rnd() < 0.5 ? 1 : 0),
      note: "",
    });
  }

  if (longRide)
    await importFit(
      ctx,
      longRide.riderId,
      `${pick({ da: "Lang tur med bakker", en: "Long ride with hills" }, l)}.fit`,
      sampleRideFit(Date.parse(`${longRide.onDate}T08:00:00Z`)),
    );

  return past;
}

/**
 * Six weeks of check-ins. In a team, one rider is tired, one has a sore
 * knee and one a stressful week; a person alone is the first, and fine.
 */
export async function seedCheckins(
  ctx: OrgContext,
  l: L,
  riderIds: string[],
  today: string,
  rnd: () => number,
): Promise<void> {
  for (const [i, riderId] of riderIds.entries()) {
    for (let d = CHECKIN_DAYS - 1; d >= 0; d--) {
      const tired = i === 1 && d < 6;
      const knee = i === 3 && d < 3;
      await saveCheckin(ctx, {
        riderId,
        onDate: addDaysIso(today, -d),
        sleepHours: tired ? 6.5 : 8 + Math.round(rnd() * 10) / 10,
        sleepQuality: tired ? 2 : 4,
        energy: tired ? 2 : 3 + (rnd() < 0.5 ? 1 : 0),
        mood: tired ? 3 : 4,
        soreness: tired ? 2 : 4,
        stress: i === 2 && d < 4 ? 2 : 4,
        pain: knee ? 2 : 0,
        painWhere: knee ? pick({ da: "Højre knæ", en: "Right knee" }, l) : "",
        ill: 0,
        note:
          tired && d === 0 ? pick(NOTES.soreLegs, l) : knee && d === 0 ? pick(NOTES.knee, l) : "",
      });
    }
  }
}
