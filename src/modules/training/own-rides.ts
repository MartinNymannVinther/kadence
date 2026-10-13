import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { todayInCopenhagen } from "@/core/dates";
import { activities, plannedSessions, riders } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { compliance, type ComplianceColour, type LoadMethod } from "@/modules/load";

/**
 * "Dine ture" on Mig (docs/backlog.md P2-02): the rider's own rides, the
 * newest first, twenty at a time. Always the caller's own: the rider is
 * found from the session, never from an id the browser sends, and the
 * read runs under the caller's RLS, so a teammate's rides cannot come
 * back even by mistake.
 *
 * The next page starts after a cursor of the last ride's start and id.
 * The start is the ride's own moment, so two rides on one day come in the
 * order they were ridden; the id breaks a tie. Postgres keeps
 * microseconds and a JavaScript date milliseconds, so both sides compare
 * at milliseconds, or a ride could be skipped or shown twice.
 */

export const RIDES_PAGE = 20;

export const RideCursor = z.object({
  startedAt: z.iso.datetime(),
  id: z.string().min(1).max(100),
});
export type RideCursorT = z.infer<typeof RideCursor>;

export type OwnRide = {
  id: string;
  onDate: string;
  sport: string;
  /** The ride's own title, or the session it was ridden for; may be empty. */
  title: string;
  movingSeconds: number;
  distanceM: number | null;
  /** How close it came to its session; "none" for a ride nobody planned. */
  colour: ComplianceColour;
};

export type OwnRidesPage = { rides: OwnRide[]; next: RideCursorT | null };

const startedMs = sql`date_trunc('milliseconds', ${activities.startedAt})`;

export async function listOwnRides(
  ctx: OrgContext,
  options: { before?: RideCursorT; today?: string } = {},
): Promise<OwnRidesPage> {
  const today = options.today ?? todayInCopenhagen();
  const rows = await withOrgContext(ctx, async (tx) => {
    const [rider] = await tx
      .select({ id: riders.id })
      .from(riders)
      .where(and(eq(riders.userId, ctx.userId), eq(riders.archived, false)))
      .limit(1);
    if (!rider) throw new Refused("forbidden");
    const before = options.before;
    return tx
      .select({
        id: activities.id,
        onDate: activities.onDate,
        startedAt: activities.startedAt,
        sport: activities.sport,
        title: activities.title,
        movingSeconds: activities.movingSeconds,
        distanceM: activities.distanceM,
        load: activities.load,
        loadMethod: activities.loadMethod,
        sessionTitle: plannedSessions.title,
        sessionDate: plannedSessions.onDate,
        plannedMinutes: plannedSessions.plannedMinutes,
        plannedLoad: plannedSessions.plannedLoad,
      })
      .from(activities)
      .leftJoin(plannedSessions, eq(plannedSessions.activityId, activities.id))
      .where(
        and(
          eq(activities.riderId, rider.id),
          before
            ? sql`(${startedMs}, ${activities.id}) < (${before.startedAt}::timestamptz, ${before.id})`
            : undefined,
        ),
      )
      .orderBy(desc(startedMs), desc(activities.id))
      .limit(RIDES_PAGE + 1);
  });
  const page = rows.slice(0, RIDES_PAGE);
  const last = page.at(-1);
  return {
    rides: page.map((r) => ({
      id: r.id,
      onDate: r.onDate,
      sport: r.sport,
      title: r.title || r.sessionTitle || "",
      movingSeconds: r.movingSeconds,
      distanceM: r.distanceM,
      colour:
        r.sessionDate === null
          ? "none"
          : compliance(
              { minutes: r.plannedMinutes ?? 0, load: r.plannedLoad },
              {
                minutes: r.movingSeconds / 60,
                load: r.load,
                method: r.loadMethod as LoadMethod,
              },
              r.sessionDate,
              today,
            ),
    })),
    next:
      rows.length > RIDES_PAGE && last
        ? { startedAt: last.startedAt.toISOString(), id: last.id }
        : null,
  };
}
