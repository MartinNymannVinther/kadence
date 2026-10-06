import { addDaysIso, mondayOf } from "@/core/dates";
import type { PushKind } from "@/core/db/schema/push";

/**
 * When a reminder is due, and which (docs/adr/0060). Pure: the job reads
 * the facts as the person, and these decide. All times are Copenhagen
 * time, the day the person lives in.
 *
 * - checkin: a rider who has not checked in today, once a day from 19.00.
 * - comment: a comment by someone else, in a thread the person can read,
 *   since the last reminder.
 * - plan: a session of the rider's in the next seven days laid or changed
 *   by someone else since the last reminder.
 * - week: a parent, once a week, on Sunday from 18.00.
 *
 * Nothing goes out in the quiet hours, 21.30 to 7.00; what is due waits.
 * One reminder at a time: when several are due, the first in that order
 * goes now and the next on a later run.
 */

export const QUIET_FROM = 21 * 60 + 30;
export const QUIET_UNTIL = 7 * 60;
export const CHECKIN_FROM = 19 * 60;
export const WEEK_FROM = 18 * 60;
/** "The next seven days": today and the six after it. */
export const PLAN_DAYS = 7;

/** The order a person's choices are shown and stored in. */
export const KIND_ORDER: readonly PushKind[] = ["checkin", "comment", "plan", "week"];

export type Clock = {
  /** yyyy-mm-dd in Copenhagen. */
  date: string;
  /** Minutes since midnight in Copenhagen. */
  minutes: number;
  /** 1 Monday … 7 Sunday. */
  weekday: number;
};

const CLOCK = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Copenhagen",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function copenhagenClock(now: Date): Clock {
  const parts = Object.fromEntries(CLOCK.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    weekday: WEEKDAYS.indexOf(parts.weekday ?? "") + 1,
  };
}

export function isQuiet(clock: Clock): boolean {
  return clock.minutes >= QUIET_FROM || clock.minutes < QUIET_UNTIL;
}

/** The days a plan change counts for: today through the sixth day after. */
export function planWindow(today: string): { from: string; to: string } {
  return { from: today, to: addDaysIso(today, PLAN_DAYS - 1) };
}

/** Which reminders mean anything to a person with these roles on the team. */
export function kindsFor(roles: { isCoach: boolean; isRider: boolean; isParent: boolean }) {
  const kinds = new Set<PushKind>();
  if (roles.isRider) for (const kind of ["checkin", "comment", "plan"] as const) kinds.add(kind);
  if (roles.isCoach) kinds.add("comment");
  if (roles.isParent) for (const kind of ["week", "comment"] as const) kinds.add(kind);
  return KIND_ORDER.filter((kind) => kinds.has(kind));
}

/** What the job knows about one person on one team, read as that person. */
export type Facts = {
  isRider: boolean;
  checkedInToday: boolean;
  isParent: boolean;
  /** When the newest comment by someone else that the person can read was written. */
  newestComment: Date | null;
  /** When a session in the rider's next seven days was last laid or changed by someone else. */
  newestPlanChange: Date | null;
};

/** One subscription's state, as the job reads it. */
export type SubscriptionState = {
  kinds: readonly string[];
  toldUpTo: Date;
  checkinRemindedOn: string | null;
  weekToldOn: string | null;
};

/** What the job writes when a reminder goes out, so it never goes out twice. */
export type Mark =
  | { slot: "news"; toldUpTo: Date }
  | { slot: "checkin"; checkinRemindedOn: string }
  | { slot: "week"; weekToldOn: string };

export type Decision = { kind: PushKind; mark: Mark };

/** The one reminder due now for this subscription, or null. */
export function decide(sub: SubscriptionState, facts: Facts, now: Date): Decision | null {
  const clock = copenhagenClock(now);
  if (isQuiet(clock)) return null;
  const wants = (kind: PushKind) => sub.kinds.includes(kind);

  // Comments and plan changes are news: one reminder tells all of it up
  // to now, about whichever came last.
  const comment =
    wants("comment") && facts.newestComment && facts.newestComment > sub.toldUpTo
      ? facts.newestComment
      : null;
  const plan =
    wants("plan") &&
    facts.isRider &&
    facts.newestPlanChange &&
    facts.newestPlanChange > sub.toldUpTo
      ? facts.newestPlanChange
      : null;
  if (comment || plan) {
    const kind = plan && (!comment || plan > comment) ? "plan" : "comment";
    return { kind, mark: { slot: "news", toldUpTo: now } };
  }

  if (
    wants("checkin") &&
    facts.isRider &&
    !facts.checkedInToday &&
    clock.minutes >= CHECKIN_FROM &&
    sub.checkinRemindedOn !== clock.date
  )
    return { kind: "checkin", mark: { slot: "checkin", checkinRemindedOn: clock.date } };

  const monday = mondayOf(clock.date);
  if (
    wants("week") &&
    facts.isParent &&
    clock.weekday === 7 &&
    clock.minutes >= WEEK_FROM &&
    sub.weekToldOn !== monday
  )
    return { kind: "week", mark: { slot: "week", weekToldOn: monday } };

  return null;
}

/**
 * Which reminder a subscription was last sent, read back from what the
 * job wrote: news moves `told_up_to` and `updated_at` to the same moment;
 * a check-in or a week reminder moves `updated_at` and its own day. What
 * the service worker shows is computed from this, so the text matches the
 * reminder without the push ever carrying it.
 */
export function lastTold(
  sub: SubscriptionState & { updatedAt: Date },
): "news" | "checkin" | "week" | null {
  if (sub.toldUpTo.getTime() === sub.updatedAt.getTime()) return "news";
  const told = copenhagenClock(sub.updatedAt);
  if (sub.kinds.includes("checkin") && sub.checkinRemindedOn === told.date) return "checkin";
  if (sub.kinds.includes("week") && told.weekday === 7 && sub.weekToldOn === mondayOf(told.date))
    return "week";
  return null;
}
