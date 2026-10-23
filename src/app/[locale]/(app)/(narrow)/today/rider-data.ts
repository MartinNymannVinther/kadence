import { toEventCard } from "@/components/calendar/to-card";
import type { ChecklistFacts } from "@/components/today/rider-checklist";
import type { RideToRate } from "@/components/today/rpe-prompt";
import { rideToRate, RPE_WINDOW_DAYS } from "@/components/today/rpe-pick";
import { toTodayCard } from "@/components/today/to-today-card";
import { guardianState } from "@/components/team/guardian-state";
import { dayLong } from "@/components/training/day-label";
import { checkinValues } from "@/components/wellbeing/checkin-values";
import { addDaysIso } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { holdsHealthConsent, isHealthConsentWithdrawn } from "@/modules/consent/service";
import { listDeviceLinks } from "@/modules/devices/links";
import { hasAnyRide, recentRides } from "@/modules/today/recent-rides";
import { listGuardians } from "@/modules/team/guardians";
import { getRider } from "@/modules/team/riders";
import { listEvents } from "@/modules/training/events";
import { listSessions } from "@/modules/training/sessions";
import { workspaceKind } from "@/modules/team/workspace-kind";
import { getCheckin, getLastCheckin } from "@/modules/wellbeing/checkins";
import { knownPainView, listKnownPains } from "@/modules/wellbeing/known-pains";
import { checkinStart } from "@/modules/wellbeing/prefill";

/**
 * What a rider's Today shows (docs/adr/0063): today's and tomorrow's
 * sessions and the races, exams and other days in the calendar on them —
 * a race tomorrow is what today's session is for — today's check-in — and,
 * for a new one, the answers behind
 * "Mere" from the last (backlog P2-11), with the rider's known pains and
 * whether a coach reads it (docs/adr/0097) — the ride to say "how hard" about,
 * and what the first steps need to know. The rest of the rider's picture is on Mig.
 */
export async function riderDay(
  ctx: OrgContext,
  riderId: string,
  today: string,
  words: { today: string; yesterday: string; locale: string },
) {
  const tomorrow = addDaysIso(today, 1);
  const [sessions, events, checkin, last, rides, rider, guardians, links, consentOff, pains, kind] =
    await Promise.all([
      listSessions(ctx, { from: today, to: tomorrow, riderIds: [riderId] }),
      listEvents(ctx, { from: today, to: tomorrow, riderIds: [riderId] }),
      getCheckin(ctx, riderId, today),
      getLastCheckin(ctx, riderId, today),
      recentRides(ctx, riderId, { from: addDaysIso(today, -(RPE_WINDOW_DAYS - 1)), to: today }),
      getRider(ctx, riderId),
      listGuardians(ctx, riderId),
      listDeviceLinks(ctx),
      isHealthConsentWithdrawn(ctx),
      listKnownPains(ctx, riderId),
      workspaceKind(ctx.orgId, ctx.userId),
    ]);
  const cards = sessions.map(toTodayCard);
  const eventCards = events.map(toEventCard);
  const on = (date: string) => eventCards.filter((e) => e.startsOn <= date && e.endsOn >= date);
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
        name: ride.name,
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
    events: { today: on(today), tomorrow: on(tomorrow) },
    checkin: checkinValues(checkin),
    checkinStart: checkinStart(
      last ? { onDate: last.onDate, answers: checkinValues(last)! } : null,
      today,
    ),
    knownPains: pains.map(knownPainView),
    club: kind !== "personal",
    toRate,
    checklist,
    // Check-in is off once the consent to health data is withdrawn (ADR
    // 0088); the one who holds the consent can give it again from here.
    consent: consentOff
      ? { off: true as const, canGive: await holdsHealthConsent(ctx) }
      : { off: false as const, canGive: false },
  };
}

export type RiderDay = Awaited<ReturnType<typeof riderDay>>;
