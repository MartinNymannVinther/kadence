import { and, eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import { openSecret } from "@/core/crypto/secret-box";
import { deviceLinks, type DeviceLinkRow } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { DeviceHttpError } from "./http";
import { sealOwner, sealed } from "./link-seal";
import { markLink, type LinkOwner, type LinkStatus } from "./links";
import type { DeviceProvider, Tokens } from "./providers";

/**
 * A link's access token, for a call to the provider, and the refresh that
 * keeps it alive. Every read and write is made in the rider's name,
 * whoever set it off (links.ts): the link is the rider's, and a refreshed
 * token that is not stored is a broken link, since Wahoo and Garmin
 * revoke the old one once the new one is used.
 */

/** Refresh this long before the provider says a token runs out (Garmin asks for 600 s). */
const REFRESH_MARGIN_MS = 10 * 60 * 1000;

async function readLink(owner: LinkOwner, provider: DeviceProvider): Promise<DeviceLinkRow> {
  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  const [row] = await withOrgContext(riderCtx, (tx) =>
    tx
      .select()
      .from(deviceLinks)
      .where(and(eq(deviceLinks.riderId, owner.riderId), eq(deviceLinks.provider, provider.id))),
  );
  if (!row || row.status !== "connected") throw new Refused("notFound", "not_connected");
  return row;
}

/**
 * Trades the link's refresh token for new tokens and stores them. A
 * provider that refuses leaves the link in "error" with `refresh_failed`
 * — the rider connects again — and one that is merely unavailable leaves
 * it connected with `provider_unavailable`. Either way the caller gets a
 * refusal it can name.
 */
async function refreshLink(
  owner: LinkOwner,
  provider: DeviceProvider,
  row: DeviceLinkRow,
): Promise<string> {
  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  const fail = async (status: LinkStatus | undefined, code: string) => {
    await markLink(riderCtx, owner.riderId, provider.id, {
      ...(status ? { status } : {}),
      lastError: code,
    });
    return new Refused("conflict", status === "error" ? "reconnect" : code);
  };
  const refreshToken = openSecret(row.refreshTokenSealed, sealOwner(owner.riderId, provider.id));
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
        refreshExpiresAt: next.refreshExpiresAt ?? row.refreshExpiresAt,
        status: "connected",
        lastError: "",
      })
      .where(and(eq(deviceLinks.riderId, owner.riderId), eq(deviceLinks.provider, provider.id))),
  );
  return tokens.accessToken;
}

/**
 * The link's access token, refreshed first when it has run out or is
 * about to. Never a stale token: a refusal the caller can name instead.
 */
export async function accessTokenFor(
  owner: LinkOwner,
  provider: DeviceProvider,
  now: Date = new Date(),
): Promise<string> {
  const row = await readLink(owner, provider);
  const access = openSecret(row.accessTokenSealed, sealOwner(owner.riderId, provider.id));
  const fresh = !row.expiresAt || row.expiresAt.getTime() - REFRESH_MARGIN_MS > now.getTime();
  if (access && fresh) return access;
  return refreshLink(owner, provider, row);
}

/**
 * A refresh whether or not the access token is still good: what keeps a
 * link alive through a long break, before its refresh token runs out
 * (refresh-job.ts). Refreshing asks Garmin for no data.
 */
export async function renewLink(owner: LinkOwner, provider: DeviceProvider): Promise<void> {
  await refreshLink(owner, provider, await readLink(owner, provider));
}
