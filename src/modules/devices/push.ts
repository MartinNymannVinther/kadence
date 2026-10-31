import { and, eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import { deviceLinks, plannedSessions, riders } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { log } from "@/core/log";
import { requireWriteFor } from "@/modules/team/access";
import { readStructure } from "@/modules/workouts/structure";
import { DeviceHttpError, loggable } from "./http";
import { accessTokenFor } from "./link-tokens";
import { markLink } from "./links";
import { allowsWorkouts } from "./permission-words";
import { providerById, type ProviderId } from "./providers";

/**
 * Sends a planned bike session to the rider's connected device: a Wahoo
 * plan on its day, or a Garmin Training API workout scheduled on its day.
 * The rider or a coach may send it — the same people who may change the
 * plan — never a parent or a teammate. It needs a bike session with steps
 * and a connected link; the targets are worked out from the rider's own
 * FTP and threshold heart rate, as in the workout files.
 *
 * Sending is a copy: Kadence's plan stays the plan, and a session changed
 * afterwards is sent again by pressing again.
 */

export type PushResult = { provider: ProviderId; externalId: string };

export async function pushSession(
  ctx: OrgContext,
  sessionId: string,
  providerId: ProviderId,
): Promise<PushResult> {
  const provider = providerById(providerId);
  if (!provider.configured() || !provider.pushWorkout)
    throw new Refused("invalid", "not_configured");

  const job = await withOrgContext(ctx, async (tx) => {
    const [session] = await tx
      .select({
        id: plannedSessions.id,
        riderId: plannedSessions.riderId,
        sport: plannedSessions.sport,
        title: plannedSessions.title,
        description: plannedSessions.description,
        onDate: plannedSessions.onDate,
        structure: plannedSessions.structure,
        updatedAt: plannedSessions.updatedAt,
      })
      .from(plannedSessions)
      .where(eq(plannedSessions.id, sessionId));
    if (!session) throw new Refused("notFound");
    await requireWriteFor(tx, ctx, session.riderId);
    if (session.sport !== "bike") throw new Refused("invalid", "not_bike");
    const structure = readStructure(session.structure, "bike");
    if (structure.kind !== "bike" || structure.steps.length === 0)
      throw new Refused("invalid", "no_steps");

    const [rider] = await tx
      .select({ ftp: riders.ftpWatts, thresholdHr: riders.thresholdHr, userId: riders.userId })
      .from(riders)
      .where(eq(riders.id, session.riderId));
    const [link] = await tx
      .select({ status: deviceLinks.status, permissions: deviceLinks.permissions })
      .from(deviceLinks)
      .where(and(eq(deviceLinks.riderId, session.riderId), eq(deviceLinks.provider, providerId)));
    if (!rider?.userId || link?.status !== "connected")
      throw new Refused("notFound", "not_connected");
    // A rider who did not let Kadence put workouts in their Garmin account
    // is not sent one (docs/adr/0113); a list never read lets Garmin answer.
    if (providerId === "garmin" && link.permissions && !allowsWorkouts(link.permissions))
      throw new Refused("forbidden", "provider_permission");
    return { session, structure, rider: { ...rider, userId: rider.userId } };
  });

  const owner = { orgId: ctx.orgId, riderId: job.session.riderId, riderUserId: job.rider.userId };
  const token = await accessTokenFor(owner, provider);
  try {
    const sent = await provider.pushWorkout(token, {
      sessionId: job.session.id,
      name: job.session.title,
      description: job.session.description,
      onDate: job.session.onDate,
      structure: job.structure,
      rider: { ftp: job.rider.ftp, thresholdHr: job.rider.thresholdHr },
      updatedAt: job.session.updatedAt,
    });
    return { provider: providerId, externalId: sent.externalId };
  } catch (error) {
    if (!(error instanceof DeviceHttpError)) throw error;
    await log.error("device push failed", { provider: providerId, error: loggable(error) });
    if (error.unauthorized) {
      await markLink({ orgId: owner.orgId, userId: owner.riderUserId }, owner.riderId, providerId, {
        status: "error",
        lastError: "unauthorized",
      });
      throw new Refused("conflict", "reconnect");
    }
    // Garmin answers 403 when the rider did not grant workout import.
    if (error.status === 403) throw new Refused("forbidden", "provider_permission");
    throw new Refused("conflict", "provider_error");
  }
}
