import type { ChecklistFacts } from "@/components/today/rider-checklist";
import type { RideToRate } from "@/components/today/rpe-prompt";
import { rideToRate, RPE_WINDOW_DAYS } from "@/components/today/rpe-pick";
import { toTodayCard } from "@/components/today/to-today-card";
import { guardianState } from "@/components/team/guardian-state";
import { dayLong } from "@/components/training/day-label";
import { checkinValues } from "@/components/wellbeing/checkin-values";
import { addDaysIso } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { listDeviceLinks } from "@/modules/devices/links";
import { hasAnyRide, recentRides } from "@/modules/today/recent-rides";
import { listGuardians } from "@/modules/team/guardians";
import { getRider } from "@/modules/team/riders";
import { listSessions } from "@/modules/training/sessions";
import { getCheckin, getLastCheckin } from "@/modules/wellbeing/checkins";
import { checkinStart } from "@/modules/wellbeing/prefill";

/**
 * What a rider's Today shows (docs/adr/0063): today's and tomorrow's
 * sessions, today's check-in — and, for a new one, the answers behind
 * "Mere" from the last (backlog P2-11) — the ride to say "how hard" about,
 * and what the first steps need to know. The rest of the rider's picture is on Mig.
 */
export async function riderDay(
  ctx: OrgContext,
  riderId: string,
  today: string,
  words: { today: string; yesterday: string; locale: string },
) {
  const tomorrow = addDaysIso(today, 1);
  const [sessions, checkin, last, rides, rider, guardians, links] = await Promise.all([
    listSessions(ctx, { from: today, to: tomorrow, riderIds: [riderId] }),
    getCheckin(ctx, riderId, today),
    getLastCheckin(ctx, riderId, today),
    recentRides(ctx, riderId, { from: addDaysIso(today, -(RPE_WINDOW_DAYS - 1)), to: today }),
    getRider(ctx, riderId),
    listGuardians(ctx, riderId),
    listDeviceLinks(ctx),
  ]);
  const cards = sessions.map(toTodayCard);
  const ride = rideToRate(rides, today);
  const when = (date: string) =>
    date === today
      ? words.today
      : date === addDaysIso(today, -1)
        ? words.yesterday
        : dayLong(date, words.locale);
  const toRate: RideToRate | null = ride
    ? {
        id: ride.id,
        title: ride.title,
        sport: ride.sport,
        when: when(ride.onDate),
        movingSeconds: ride.movingSeconds,
        feel: ride.feel,
        note: ride.note,
      }
    : null;
  const checklist: ChecklistFacts = {
    userId: ctx.userId,
    thresholdsSet: Boolean(rider?.ftpWatts || rider?.thresholdHr),
    guardians: rider
      ? guardians.flatMap((g) => {
          const state = guardianState(g, rider.birthYear, new Set());
          return state === "waiting" || state === "lapsed"
            ? [{ id: g.id, name: g.accountName || g.name, adult: state === "lapsed" }]
            : [];
        })
      : [],
    configured: links.filter((l) => l.configured).map((l) => l.provider),
    connected: links.some((l) => l.status === "connected"),
    hasRides: rides.length > 0 || (await hasAnyRide(ctx, riderId)),
  };
  return {
    today: cards.filter((s) => s.onDate === today),
    tomorrow: cards.filter((s) => s.onDate === tomorrow),
    checkin: checkinValues(checkin),
    checkinStart: checkinStart(
      last ? { onDate: last.onDate, answers: checkinValues(last)! } : null,
      today,
    ),
    toRate,
    checklist,
  };
}

export type RiderDay = Awaited<ReturnType<typeof riderDay>>;
