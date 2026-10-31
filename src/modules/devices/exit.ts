import { and, eq, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import { appDb } from "@/core/db/client";
import { deviceLinks, riders } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { errorName, log } from "@/core/log";
import { loggable } from "./http";
import { accessTokenFor } from "./link-tokens";
import type { LinkOwner } from "./links";
import { providerById } from "./providers";

/**
 * Garmin is told to forget a rider whenever the rider leaves Kadence in
 * any way (docs/adr/0113), not only when they press "Afbryd"
 * (disconnect.ts): before a workspace is deleted, before a coach erases a
 * rider, and before a person deletes their account. Those deletions take
 * the link with them by cascade, and with it the only token that can ask.
 *
 * It is a courtesy the person's deletion never waits long for and never
 * fails over: every rider at once, each with a short deadline, a failure
 * logged by its code and never with a token, and the deletion goes on.
 * The token is read, and refreshed if it must be, in the rider's name, as
 * every use of a link is (link-tokens.ts).
 */

/** How long Garmin gets to answer the deregistration itself. */
export const EXIT_TIMEOUT_MS = 5_000;
/** How long the whole of one rider's deregistration may hold a deletion up, a refresh included. */
const EXIT_DEADLINE_MS = 8_000;

function withDeadline<T>(work: Promise<T>, ms: number, late: () => T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(late()), ms);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

/** One rider's Garmin account told to forget Kadence; true when Garmin said yes. Never throws. */
async function forgetAtGarmin(owner: LinkOwner, externalUserId: string): Promise<boolean> {
  const garmin = providerById("garmin");
  if (!garmin.configured() || !garmin.deregister) return false;
  const deregister = garmin.deregister;
  const work = (async () => {
    const token = await accessTokenFor(owner, garmin);
    await deregister(token, externalUserId, EXIT_TIMEOUT_MS);
    return true;
  })().catch(async (error: unknown) => {
    if (!(error instanceof Refused))
      await log.warn("device exit: garmin was not told", { error: loggable(error) });
    return false;
  });
  return withDeadline(work, EXIT_DEADLINE_MS, () => {
    void log.warn("device exit: garmin did not answer in time");
    return false;
  });
}

/**
 * Garmin told about the connected links in the caller's workspace — one
 * rider's, or every rider's — before they go. For a coach, who may see
 * that a link exists (drizzle/0003). How many Garmin confirmed.
 */
export async function deregisterGarminIn(ctx: OrgContext, riderId?: string): Promise<number> {
  if (!providerById("garmin").configured()) return 0;
  try {
    const links = await withOrgContext(ctx, (tx) =>
      tx
        .select({
          riderId: deviceLinks.riderId,
          riderUserId: riders.userId,
          externalUserId: deviceLinks.externalUserId,
        })
        .from(deviceLinks)
        .innerJoin(riders, eq(riders.id, deviceLinks.riderId))
        .where(
          and(
            eq(deviceLinks.provider, "garmin"),
            eq(deviceLinks.status, "connected"),
            riderId ? eq(deviceLinks.riderId, riderId) : undefined,
          ),
        ),
    );
    const told = await Promise.all(
      links.flatMap((link) =>
        link.riderUserId
          ? [
              forgetAtGarmin(
                { orgId: ctx.orgId, riderId: link.riderId, riderUserId: link.riderUserId },
                link.externalUserId,
              ),
            ]
          : [],
      ),
    );
    return told.filter(Boolean).length;
  } catch (error) {
    await log.error("device exit: links not read", { error: errorName(error) });
    return 0;
  }
}

/**
 * Before an account goes ("Slet min konto"): Garmin told about the
 * person's own Garmin links in every workspace — a team they left keeps
 * their rider row, and the link on it — and those links deleted, tokens
 * and all, in the person's name. `own_device_links()` (drizzle/0061)
 * names them and nothing else. How many Garmin confirmed.
 */
export async function deregisterOwnGarmin(userId: string): Promise<number> {
  try {
    const rows = await appDb.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
      const result = await tx.execute(sql`select org_id, rider_id from own_device_links('garmin')`);
      return result.rows as { org_id: string; rider_id: string }[];
    });
    const told = await Promise.all(
      rows.map(async (row) => {
        const ctx = { orgId: row.org_id, userId };
        const owner = { orgId: row.org_id, riderId: row.rider_id, riderUserId: userId };
        const where = and(
          eq(deviceLinks.riderId, row.rider_id),
          eq(deviceLinks.provider, "garmin"),
        );
        const [link] = await withOrgContext(ctx, (tx) =>
          tx
            .select({ status: deviceLinks.status, externalUserId: deviceLinks.externalUserId })
            .from(deviceLinks)
            .where(where),
        );
        const confirmed =
          link?.status === "connected" ? await forgetAtGarmin(owner, link.externalUserId) : false;
        await withOrgContext(ctx, (tx) => tx.delete(deviceLinks).where(where));
        return confirmed;
      }),
    );
    return told.filter(Boolean).length;
  } catch (error) {
    await log.error("device exit: own links not ended", { error: errorName(error) });
    return 0;
  }
}
