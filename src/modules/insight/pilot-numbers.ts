import { addDaysIso, mondayOf } from "@/core/dates";

/**
 * Pilotens tre tal (docs/adr/0066): three numbers a week that let the
 * first winter decide what Kadence should be (dogma seven).
 *
 * 1. The share of the week's riders with a check-in on at least four days.
 * 2. The share of the week's planned sessions, up to and including
 *    yesterday, with a receipt.
 * 3. The coaches' planning minutes, estimated from the audit log.
 *
 * A week is a Copenhagen week, Monday to Sunday. Its riders are the ones
 * on the team by its Monday (the day a coach added them) and not
 * archived; a rider who joins in the middle of a week counts from the next
 * one, and an archived rider counts in no week at all, since Kadence does
 * not keep when a rider was archived. Pure: no database, no clock — the
 * caller says what today is. platform_overview() in drizzle/0031 computes
 * the same for the last full week in SQL, and tests/insight/pilot-overview
 * holds the two to the same answer.
 */

/** A rider counts as checking in with a check-in on at least this many days of the week. */
export const CHECKIN_DAYS = 4;
/** A pause shorter than this keeps a coach's planning in one stretch. */
export const STRETCH_GAP_MS = 10 * 60_000;
/** Every stretch counts at least this long, a single save included. */
export const STRETCH_MIN_MS = 2 * 60_000;
/** The tables whose changes count as planning. */
export const PLANNING_TABLES = [
  "planned_sessions",
  "training_blocks",
  "training_block_items",
  "season_plans",
] as const;

export type PilotRider = { id: string; createdAt: Date; archived: boolean };
export type PilotCheckin = { riderId: string; onDate: string };
/**
 * "Udført" makes an activity and links it to the session, an RPE is said
 * on that activity, and a ride that lands links itself — so a session has
 * a receipt exactly when it has a linked activity.
 */
export type PilotSession = { riderId: string; onDate: string; activityId: string | null };
/** One audit row: who changed which table, and when. Nothing of what changed. */
export type PilotEdit = { actorUserId: string | null; entityType: string; createdAt: Date };

export type PilotInput = {
  riders: PilotRider[];
  checkins: PilotCheckin[];
  sessions: PilotSession[];
  edits: PilotEdit[];
  /** The team's coaches (owners and admins); only their edits are planning. */
  coachIds: readonly string[];
};

export type PilotWeek = {
  /** The week's Monday, a Copenhagen day. */
  monday: string;
  /** The week is still going: check-ins count up to today, sessions up to yesterday. */
  inProgress: boolean;
  /** Riders on the team by Monday and not archived. */
  riders: number;
  /** Of those, the riders with a check-in on at least CHECKIN_DAYS days. */
  checkedIn: number;
  /** Their sessions from Monday up to and including yesterday or Sunday. */
  sessions: number;
  /** Of those, the sessions with a receipt. */
  receipts: number;
  /** The coaches' estimated planning minutes, all coaches together. */
  minutes: number;
};

const copenhagen = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Copenhagen",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Copenhagen day a moment falls on. */
export const copenhagenDay = (moment: Date): string => copenhagen.format(moment);

/** A part of a whole, or null when there is no whole to speak of. */
export function share(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

/** The Monday of the last week that has ended. */
export function lastFullWeek(today: string): string {
  return addDaysIso(mondayOf(today), -7);
}

/**
 * Planning time from the moments a person saved something: moments less
 * than STRETCH_GAP_MS apart form one stretch, and a stretch counts from its
 * first moment to its last, at least STRETCH_MIN_MS. In milliseconds.
 */
export function stretchesMs(moments: number[]): number {
  const sorted = [...moments].sort((a, b) => a - b);
  let total = 0;
  let start = sorted[0];
  let last = sorted[0];
  for (const at of sorted.slice(1)) {
    if (at - last! >= STRETCH_GAP_MS) {
      total += Math.max(last! - start!, STRETCH_MIN_MS);
      start = at;
    }
    last = at;
  }
  if (start !== undefined) total += Math.max(last! - start, STRETCH_MIN_MS);
  return total;
}

/**
 * The coaches' planning minutes in the days `from`–`to`: each coach's own
 * stretches, added together, rounded to whole minutes once at the end.
 */
export function planningMinutes(
  edits: PilotEdit[],
  coachIds: readonly string[],
  from: string,
  to: string,
): number {
  const coaches = new Set(coachIds);
  const tables = new Set<string>(PLANNING_TABLES);
  const byCoach = new Map<string, number[]>();
  for (const edit of edits) {
    if (!edit.actorUserId || !coaches.has(edit.actorUserId)) continue;
    if (!tables.has(edit.entityType)) continue;
    const day = copenhagenDay(edit.createdAt);
    if (day < from || day > to) continue;
    const moments = byCoach.get(edit.actorUserId) ?? [];
    moments.push(edit.createdAt.getTime());
    byCoach.set(edit.actorUserId, moments);
  }
  let ms = 0;
  for (const moments of byCoach.values()) ms += stretchesMs(moments);
  return Math.round(ms / 60_000);
}

/** The three numbers for the week starting `monday`, as they stand on `today`. */
export function pilotWeek(monday: string, today: string, input: PilotInput): PilotWeek {
  const sunday = addDaysIso(monday, 6);
  const yesterday = addDaysIso(today, -1);
  const checkinsTo = today < sunday ? today : sunday;
  const sessionsTo = yesterday < sunday ? yesterday : sunday;

  const counted = new Set(
    input.riders
      .filter((r) => !r.archived && copenhagenDay(r.createdAt) <= monday)
      .map((r) => r.id),
  );

  const days = new Map<string, Set<string>>();
  for (const c of input.checkins) {
    if (!counted.has(c.riderId) || c.onDate < monday || c.onDate > checkinsTo) continue;
    const set = days.get(c.riderId) ?? new Set<string>();
    set.add(c.onDate);
    days.set(c.riderId, set);
  }
  const checkedIn = [...days.values()].filter((d) => d.size >= CHECKIN_DAYS).length;

  const due = input.sessions.filter(
    (s) => counted.has(s.riderId) && s.onDate >= monday && s.onDate <= sessionsTo,
  );

  return {
    monday,
    inProgress: monday <= today && today <= sunday,
    riders: counted.size,
    checkedIn,
    sessions: due.length,
    receipts: due.filter((s) => s.activityId !== null).length,
    minutes: planningMinutes(input.edits, input.coachIds, monday, sunday),
  };
}

/** The `count` weeks up to and including today's, newest first. */
export function pilotWeeks(today: string, count: number, input: PilotInput): PilotWeek[] {
  const thisMonday = mondayOf(today);
  return Array.from({ length: count }, (_, i) =>
    pilotWeek(addDaysIso(thisMonday, -7 * i), today, input),
  );
}
