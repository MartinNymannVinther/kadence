import { and, eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import { deviceLinks } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { whoAmIIn } from "@/modules/team/access";
import { providerById, type ProviderId } from "./providers";

/**
 * The rider's own choice whether Kadence keeps their planned bike
 * sessions for the next seven days on their Garmin by itself
 * (docs/adr/0114): on by default, changed only by the rider, on their own
 * link. A coach or a parent cannot change it, and the database would not
 * let them write the link anyway (drizzle/0003). Turning it off sends
 * nothing more by itself and leaves what is already on the rider's Garmin
 * where it is; a press on a session still sends it.
 */
export async function setAutoSend(
  ctx: OrgContext,
  providerId: ProviderId,
  on: boolean,
): Promise<void> {
  if (!providerById(providerId).calendar) throw new Refused("invalid", "not_configured");
  await withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me?.rider) throw new Refused("forbidden", "not_a_rider");
    const changed = await tx
      .update(deviceLinks)
      .set({ autoSend: on })
      .where(and(eq(deviceLinks.riderId, me.rider.id), eq(deviceLinks.provider, providerId)))
      .returning({ id: deviceLinks.id });
    if (changed.length === 0) throw new Refused("notFound", "not_connected");
  });
}
