import { and, eq, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import { appDb } from "@/core/db/client";
import { deviceLinks } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { sqlStateOf } from "@/core/db/sql-state";
import { whoAmIIn } from "@/modules/team/access";
import { dropRowsIn } from "./device-workouts";
import { sealed } from "./link-seal";
import { allowsWorkouts, sharesActivities } from "./permission-words";
import {
  PROVIDER_IDS,
  providerById,
  sendsWorkouts,
  type ProviderId,
  type Tokens,
} from "./providers";

/**
 * A rider's connection to Wahoo, Garmin or Polar: the `device_links` row. The
 * rider writes it, a coach may see that it exists and remove it, nobody
 * else sees it (drizzle/0003). Tokens are sealed with the secret box and
 * bound to the rider and provider (link-seal.ts), so a sealed token copied
 * into another row does not open; they leave the server only as the access
 * token a provider call needs (link-tokens.ts), and never towards the
 * interface.
 *
 * Every write to a link is made in the rider's name, whoever set it off:
 * the rider connecting, a webhook importing a ride, or a coach whose push
 * needed a fresh token. The link is the rider's (ADR 0011), the database
 * lets only the rider write it, and a refreshed token that is not stored
 * is a broken link — Wahoo revokes the old token once the new one is used.
 * The caller's own right to act is checked before, in the caller's name.
 */

export type LinkStatus = "connected" | "error" | "revoked";

/**
 * Stores the caller's own connection, connected, replacing an earlier one
 * to the same provider. Only a rider has one: a coach cannot connect a
 * device in a rider's name, and the database would refuse it anyway. An
 * account already linked to another rider is refused as `already_linked`.
 * `permissions` are what the provider said the rider granted, where it
 * says (Garmin); null when they could not be read.
 */
export async function saveLink(
  ctx: OrgContext,
  provider: ProviderId,
  externalUserId: string,
  tokens: Tokens,
  permissions: string[] | null = null,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me?.rider) throw new Refused("forbidden", "not_a_rider");
    const riderId = me.rider.id;
    const values = {
      externalUserId,
      ...sealed(riderId, provider, tokens),
      permissions,
      status: "connected" as const,
      lastError: "",
    };
    try {
      await tx
        .insert(deviceLinks)
        .values({ orgId: ctx.orgId, riderId, provider, ...values })
        .onConflictDoUpdate({ target: [deviceLinks.riderId, deviceLinks.provider], set: values });
    } catch (error) {
      if (sqlStateOf(error) === "23505") throw new Refused("conflict", "already_linked");
      throw error;
    }
  });
}

export type DeviceLinkView = {
  provider: ProviderId;
  /** The installation has the provider's keys. */
  configured: boolean;
  /** The provider can take a planned session — for Garmin, the rider granted workout import. */
  canPush: boolean;
  /**
   * Whether the rider shares their activities with Kadence at the
   * provider (Garmin's ACTIVITY_EXPORT); null where nobody knows.
   */
  sharesActivities: boolean | null;
  /**
   * Whether the rider lets Kadence put workouts on their calendar at the
   * provider (Garmin's WORKOUT_IMPORT); null where nobody knows.
   */
  workoutImport: boolean | null;
  /**
   * For a provider with a calendar (Garmin): whether Kadence keeps the
   * rider's sessions for the next seven days there by itself (docs/adr/0114).
   */
  autoSend: boolean | null;
  status: LinkStatus | null;
  lastSyncAt: Date | null;
  lastError: string;
};

/**
 * One entry per provider for a rider — the caller's own unless a coach
 * names one — with the link's state and never its tokens. A guardian or a
 * teammate sees no link at all: the database does not show them one.
 */
export async function listDeviceLinks(
  ctx: OrgContext,
  riderId?: string,
): Promise<DeviceLinkView[]> {
  const rows = await withOrgContext(ctx, async (tx) => {
    const target = riderId ?? (await whoAmIIn(tx, ctx))?.rider?.id;
    if (!target) return [];
    return tx
      .select({
        provider: deviceLinks.provider,
        status: deviceLinks.status,
        lastSyncAt: deviceLinks.lastSyncAt,
        lastError: deviceLinks.lastError,
        permissions: deviceLinks.permissions,
        autoSend: deviceLinks.autoSend,
      })
      .from(deviceLinks)
      .where(eq(deviceLinks.riderId, target));
  });
  return PROVIDER_IDS.map((id) => {
    const provider = providerById(id);
    const row = rows.find((r) => r.provider === id);
    // Garmin says what the rider granted (docs/adr/0113); a link whose
    // permissions were never read offers no push until they are.
    const granted = id !== "garmin" || allowsWorkouts(row?.permissions ?? null);
    const known = id === "garmin" && row?.status === "connected" && row.permissions !== null;
    return {
      provider: id,
      configured: provider.configured(),
      canPush: provider.configured() && sendsWorkouts(provider) && granted,
      sharesActivities:
        id === "garmin" && row?.status === "connected"
          ? sharesActivities(row.permissions ?? null)
          : null,
      workoutImport: known ? allowsWorkouts(row.permissions ?? null) : null,
      autoSend: provider.calendar && row ? row.autoSend : null,
      status: (row?.status as LinkStatus | undefined) ?? null,
      lastSyncAt: row?.lastSyncAt ?? null,
      lastError: row?.lastError ?? "",
    };
  });
}

export type LinkOwner = { orgId: string; riderId: string; riderUserId: string };

/**
 * Whose connected link a provider's user id is, for a webhook that
 * arrives with nobody signed in: `device_link_owner` (drizzle/0005), the
 * one definer that answers it, with three ids and nothing else.
 */
export async function linkOwner(
  provider: ProviderId,
  externalUserId: string,
): Promise<LinkOwner | null> {
  const result = await appDb.execute(
    sql`select org_id, rider_id, rider_user_id from device_link_owner(${provider}, ${externalUserId})`,
  );
  const row = result.rows[0] as
    { org_id: string; rider_id: string; rider_user_id: string } | undefined;
  return row ? { orgId: row.org_id, riderId: row.rider_id, riderUserId: row.rider_user_id } : null;
}

/** Changes a link's state, in the rider's name. */
export async function markLink(
  riderCtx: OrgContext,
  riderId: string,
  provider: ProviderId,
  patch: { status?: LinkStatus; lastError?: string; lastSyncAt?: Date },
): Promise<void> {
  await withOrgContext(riderCtx, (tx) =>
    tx
      .update(deviceLinks)
      .set(patch)
      .where(and(eq(deviceLinks.riderId, riderId), eq(deviceLinks.provider, provider))),
  );
}

/** Clears a link's last error when it is still `code`, in the rider's name; nothing else changes. */
export async function clearLinkError(
  riderCtx: OrgContext,
  riderId: string,
  provider: ProviderId,
  code: string,
): Promise<void> {
  await withOrgContext(riderCtx, (tx) =>
    tx
      .update(deviceLinks)
      .set({ lastError: "" })
      .where(
        and(
          eq(deviceLinks.riderId, riderId),
          eq(deviceLinks.provider, provider),
          eq(deviceLinks.lastError, code),
        ),
      ),
  );
}

/** The provider's id for the account on a rider's link, read as the rider; null without one. */
export async function linkExternalUserId(
  owner: LinkOwner,
  provider: ProviderId,
): Promise<string | null> {
  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  const [row] = await withOrgContext(riderCtx, (tx) =>
    tx
      .select({ externalUserId: deviceLinks.externalUserId })
      .from(deviceLinks)
      .where(and(eq(deviceLinks.riderId, owner.riderId), eq(deviceLinks.provider, provider))),
  );
  return row?.externalUserId ?? null;
}

/** Removes the caller's own link, and what Kadence remembers sending through it; false when there was none. */
export async function deleteOwnLink(ctx: OrgContext, provider: ProviderId): Promise<boolean> {
  return withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me?.rider) throw new Refused("forbidden", "not_a_rider");
    await dropRowsIn(tx, me.rider.id, provider);
    const gone = await tx
      .delete(deviceLinks)
      .where(and(eq(deviceLinks.riderId, me.rider.id), eq(deviceLinks.provider, provider)))
      .returning({ id: deviceLinks.id });
    return gone.length > 0;
  });
}

/** The caller as the owner of their own links: their rider row and account. */
export async function ownLinkOwner(ctx: OrgContext): Promise<LinkOwner> {
  const me = await withOrgContext(ctx, (tx) => whoAmIIn(tx, ctx));
  if (!me?.rider) throw new Refused("forbidden", "not_a_rider");
  return { orgId: ctx.orgId, riderId: me.rider.id, riderUserId: ctx.userId };
}
