import { and, eq } from "drizzle-orm";
import { activityFiles, plannedSessions } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import type { Me } from "@/modules/team/access";
import { getRider } from "@/modules/team/riders";
import { getSession, listSessions, type CalendarSession } from "@/modules/training/sessions";
import type { BikeStructure } from "@/modules/workouts/structure";
import { rideableStructure } from "./rideable";

/**
 * What Rulle's page starts from (ADR 0033): the session to ride and the
 * thresholds its watts come from. A rider opening /rulle gets today's
 * first bike session with steps that is not yet done; one arriving from
 * a session's "Kør indendørs" gets that session. Nothing here is Rulle's
 * own data: the sessions, the rider and the thresholds are read through
 * the services every page uses, under the same RLS, so a rider sees only
 * their own sessions and a coach any rider's on the team.
 *
 * A session that is not the viewer's own — a coach trying a rider's
 * session on the trainer — is a trial: ridden with the rider's watts,
 * never saved, since a coach's legs are not the rider's ride. The page
 * tells which it is by comparing the session's rider with `riderId`.
 */

export type RulleSession = {
  id: string;
  riderId: string;
  onDate: string;
  title: string;
  description: string;
  plannedMinutes: number;
  structure: BikeStructure;
  done: boolean;
};

export type RiderThresholds = { ftp: number | null; thresholdHr: number | null };

export type RulleStart = {
  /** The viewer's own rider row, when they ride. */
  riderId: string | null;
  /** The viewer's bike sessions today that have steps to ride. */
  today: RulleSession[];
  chosen: RulleSession | null;
  /** The thresholds the watts come from, by rider: the viewer's own, and the chosen session's rider. */
  thresholds: Record<string, RiderThresholds>;
  /** A session was asked for that cannot be ridden here: not found, or no steps. */
  missing: boolean;
};

function toRulleSession(session: CalendarSession): RulleSession | null {
  const structure = rideableStructure(session.sport, session.structure);
  if (!structure) return null;
  return {
    id: session.id,
    riderId: session.riderId,
    onDate: session.onDate,
    title: session.title,
    description: session.description,
    plannedMinutes: session.plannedMinutes,
    structure,
    done: session.activity !== null,
  };
}

export async function rulleStart(
  ctx: OrgContext,
  me: Me | null,
  askedId: string | null,
  today: string,
): Promise<RulleStart> {
  const riderId = me?.rider?.id ?? null;
  const own = riderId
    ? (await listSessions(ctx, { from: today, to: today, riderIds: [riderId] }))
        .map(toRulleSession)
        .filter((s): s is RulleSession => s !== null)
    : [];
  const asked = askedId ? await getSession(ctx, askedId.slice(0, 100)) : null;
  // Someone else's session is a coach's to try; a parent reads a child's sessions, and rides none.
  const allowed = asked && (asked.riderId === riderId || me?.isCoach) ? asked : null;
  const askedRideable = allowed ? toRulleSession(allowed) : null;
  const chosen = askedRideable ?? own.find((s) => !s.done) ?? own[0] ?? null;
  const thresholds: Record<string, RiderThresholds> = {};
  for (const id of new Set([riderId, chosen?.riderId].filter((x): x is string => Boolean(x)))) {
    const rider = await getRider(ctx, id);
    if (rider) thresholds[id] = { ftp: rider.ftpWatts, thresholdHr: rider.thresholdHr };
  }
  return {
    riderId,
    today: own,
    chosen,
    thresholds,
    missing: askedId !== null && askedRideable === null,
  };
}

/**
 * The ride a file already became, for a save that is sent again after
 * the answer to the first one was lost: the rider's own file, found by
 * its hash, and the session it landed on.
 */
export async function rideByHash(
  ctx: OrgContext,
  riderId: string,
  sha256: string,
): Promise<{ activityId: string; sessionId: string | null; sessionTitle: string | null } | null> {
  return withOrgContext(ctx, async (tx) => {
    const [file] = await tx
      .select({ activityId: activityFiles.activityId })
      .from(activityFiles)
      .where(and(eq(activityFiles.riderId, riderId), eq(activityFiles.sha256, sha256)));
    if (!file) return null;
    const [session] = await tx
      .select({ id: plannedSessions.id, title: plannedSessions.title })
      .from(plannedSessions)
      .where(eq(plannedSessions.activityId, file.activityId));
    return {
      activityId: file.activityId,
      sessionId: session?.id ?? null,
      sessionTitle: session?.title ?? null,
    };
  });
}
