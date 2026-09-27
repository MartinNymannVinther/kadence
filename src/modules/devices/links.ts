import { and, eq, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import { openSecret, sealSecret } from "@/core/crypto/secret-box";
import { appDb } from "@/core/db/client";
import { deviceLinks } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { sqlStateOf } from "@/modules/export/workspace";
import { whoAmIIn } from "@/modules/team/access";
import { DeviceHttpError } from "./http";
import {
  PROVIDER_IDS,
  providerById,
  type DeviceProvider,
  type ProviderId,
  type Tokens,
} from "./providers";

/**
 * A rider's connection to Wahoo, Garmin or Polar: the `device_links` row. The
 * rider writes it, a coach may see that it exists and remove it, nobody
 * else sees it (drizzle/0003). Tokens are sealed with the secret box and
 * bound to the rider and provider, so a sealed token copied into another
 * row does not open; they leave this file only as the access token a
 * provider call needs, and never towards the interface.
 *
 * Every write to a link is made in the rider's name, whoever set it off:
 * the rider connecting, a webhook importing a ride, or a coach whose push
 * needed a fresh token. The link is the rider's (ADR 0011), the database
 * lets only the rider write it, and a refreshed token that is not stored
 * is a broken link — Wahoo revokes the old token once the new one is used.
 * The caller's own right to act is checked before, in the caller's name.
 */

/** Refresh this long before the provider says a token runs out (Garmin asks for 600 s). */
const REFRESH_MARGIN_MS = 10 * 60 * 1000;

type Status = "connected" | "error" | "revoked";

const sealOwner = (riderId: string, provider: ProviderId) => `device-link:${riderId}:${provider}`;

function sealed(riderId: string, provider: ProviderId, tokens: Tokens) {
  const owner = sealOwner(riderId, provider);
  return {
    accessTokenSealed: sealSecret(tokens.accessToken, owner),
    refreshTokenSealed: tokens.refreshToken ? sealSecret(tokens.refreshToken, owner) : null,
    expiresAt: tokens.expiresAt,
  };
}

/**
 * Stores the caller's own connection, connected, replacing an earlier one
 * to the same provider. Only a rider has one: a coach cannot connect a
 * device in a rider's name, and the database would refuse it anyway. An
 * account already linked to another rider is refused as `already_linked`.
 */
export async function saveLink(
  ctx: OrgContext,
  provider: ProviderId,
  externalUserId: string,
  tokens: Tokens,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me?.rider) throw new Refused("forbidden", "not_a_rider");
    const riderId = me.rider.id;
    const values = {
      externalUserId,
      ...sealed(riderId, provider, tokens),
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
  /** The provider can take a planned session. */
  canPush: boolean;
  status: Status | null;
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
      })
      .from(deviceLinks)
      .where(eq(deviceLinks.riderId, target));
  });
  return PROVIDER_IDS.map((id) => {
    const provider = providerById(id);
    const row = rows.find((r) => r.provider === id);
    return {
      provider: id,
      configured: provider.configured(),
      canPush: provider.configured() && Boolean(provider.pushWorkout),
      status: (row?.status as Status | undefined) ?? null,
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
  patch: { status?: Status; lastError?: string; lastSyncAt?: Date },
): Promise<void> {
  await withOrgContext(riderCtx, (tx) =>
    tx
      .update(deviceLinks)
      .set(patch)
      .where(and(eq(deviceLinks.riderId, riderId), eq(deviceLinks.provider, provider))),
  );
}

/**
 * The link's access token, refreshed first when it has run out or is about
 * to. A provider that refuses the refresh leaves the link in "error" with
 * `refresh_failed` — the rider connects again — and one that is merely
 * unavailable leaves it connected with `provider_unavailable`. Either way
 * the caller gets a refusal it can name, never a stale token.
 */
export async function accessTokenFor(
  owner: LinkOwner,
  provider: DeviceProvider,
  now: Date = new Date(),
): Promise<string> {
  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  const [row] = await withOrgContext(riderCtx, (tx) =>
    tx
      .select()
      .from(deviceLinks)
      .where(and(eq(deviceLinks.riderId, owner.riderId), eq(deviceLinks.provider, provider.id))),
  );
  if (!row || row.status !== "connected") throw new Refused("notFound", "not_connected");

  const seal = sealOwner(owner.riderId, provider.id);
  const access = openSecret(row.accessTokenSealed, seal);
  const fresh = !row.expiresAt || row.expiresAt.getTime() - REFRESH_MARGIN_MS > now.getTime();
  if (access && fresh) return access;

  const refreshToken = openSecret(row.refreshTokenSealed, seal);
  const fail = async (status: Status | undefined, code: string) => {
    await markLink(riderCtx, owner.riderId, provider.id, {
      ...(status ? { status } : {}),
      lastError: code,
    });
    return new Refused("conflict", status === "error" ? "reconnect" : code);
  };
  if (!refreshToken) throw await fail("error", "refresh_failed");

  let tokens: Tokens;
  try {
    tokens = await provider.refresh(refreshToken);
  } catch (error) {
    if (error instanceof DeviceHttpError && error.rejected)
      throw await fail("error", "refresh_failed");
    if (error instanceof DeviceHttpError) throw await fail(undefined, "provider_unavailable");
    throw error;
  }
  const next = sealed(owner.riderId, provider.id, tokens);
  await withOrgContext(riderCtx, (tx) =>
    tx
      .update(deviceLinks)
      .set({
        ...next,
        // Wahoo and Garmin rotate refresh tokens; keep the old one if none came back.
        refreshTokenSealed: next.refreshTokenSealed ?? row.refreshTokenSealed,
        status: "connected",
        lastError: "",
      })
      .where(and(eq(deviceLinks.riderId, owner.riderId), eq(deviceLinks.provider, provider.id))),
  );
  return tokens.accessToken;
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

/** Removes the caller's own link; false when there was none. */
export async function deleteOwnLink(ctx: OrgContext, provider: ProviderId): Promise<boolean> {
  return withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me?.rider) throw new Refused("forbidden", "not_a_rider");
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
