import { z } from "zod";
import { Refused } from "@/core/action";
import { openSecret, sealSecret } from "@/core/crypto/secret-box";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { env } from "@/core/env";
import { log } from "@/core/log";
import { whoAmIIn } from "@/modules/team/access";
import { loggable } from "./http";
import { saveLink } from "./links";
import { codeChallenge, randomToken, safeEqual } from "./oauth";
import { providerById, type ProviderId } from "./providers";

/**
 * Connecting a rider's Wahoo, Garmin or Polar account: OAuth 2.0 with
 * state, and PKCE where the provider supports it (Wahoo and Garmin; Polar
 * documents no PKCE and exchanges the code with the client's secret).
 *
 * `startConnect` is for a signed-in rider only — a coach cannot connect a
 * device in a rider's name, and the database refuses the row if one tries.
 * It makes a state and a code verifier, seals both with the secret box
 * bound to the person (so the value opens for nobody else), and hands back
 * the provider's authorize URL and the cookie to set: short-lived,
 * HttpOnly, SameSite=Lax (the provider's redirect back is a top-level GET)
 * and Secure in production.
 *
 * `finishConnect` checks that the callback is this person's, in this
 * team, for this provider, in time, with the same state; exchanges the
 * code with the verifier; asks the provider whose account it is; registers
 * the account where the provider requires it (Polar); and stores the
 * sealed tokens on the rider's link. It answers with where to send the
 * browser: the devices settings, saying connected or naming what
 * went wrong in a short code.
 */

export const OAUTH_COOKIE = "kadence_device_oauth";
export const OAUTH_COOKIE_SECONDS = 10 * 60;
export const SETTINGS_PATH = "/settings/devices";

export type ConnectError =
  | "unauthorized"
  | "not_configured"
  | "not_a_rider"
  | "rate_limited"
  | "state"
  | "denied"
  | "exchange_failed"
  | "already_linked"
  | "failed";

export function settingsUrl(outcome: { connected: ProviderId } | { error: ConnectError }): string {
  const query =
    "connected" in outcome ? `connected=${outcome.connected}` : `error=${outcome.error}`;
  return `${SETTINGS_PATH}?${query}`;
}

/** Where the provider sends the browser back; registered with the provider as is. */
export function redirectUri(provider: ProviderId): string {
  return new URL(`/api/devices/${provider}/callback`, env.BETTER_AUTH_URL).toString();
}

const Pending = z.object({
  provider: z.string(),
  orgId: z.string(),
  state: z.string(),
  verifier: z.string(),
  expiresAt: z.number(),
});

const cookieOwner = (userId: string) => `device-oauth:${userId}`;

export type CookieToSet = { name: string; value: string; maxAge: number; secure: boolean };

export async function startConnect(
  ctx: OrgContext,
  providerId: ProviderId,
  now: Date = new Date(),
): Promise<{ location: string; cookie?: CookieToSet }> {
  const provider = providerById(providerId);
  if (!provider.configured()) return { location: settingsUrl({ error: "not_configured" }) };
  const me = await withOrgContext(ctx, (tx) => whoAmIIn(tx, ctx));
  if (!me?.rider) return { location: settingsUrl({ error: "not_a_rider" }) };

  const state = randomToken();
  const verifier = randomToken();
  const pending: z.infer<typeof Pending> = {
    provider: providerId,
    orgId: ctx.orgId,
    state,
    verifier,
    expiresAt: now.getTime() + OAUTH_COOKIE_SECONDS * 1000,
  };
  return {
    location: provider.authorizeUrl(state, codeChallenge(verifier), redirectUri(providerId)),
    cookie: {
      name: OAUTH_COOKIE,
      value: sealSecret(JSON.stringify(pending), cookieOwner(ctx.userId)),
      maxAge: OAUTH_COOKIE_SECONDS,
      secure: env.NODE_ENV === "production",
    },
  };
}

function openPending(value: string | undefined, userId: string) {
  const plain = openSecret(value, cookieOwner(userId));
  if (!plain) return null;
  try {
    const parsed = Pending.safeParse(JSON.parse(plain));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type CallbackParams = { code?: string | null; state?: string | null; error?: string | null };

export async function finishConnect(
  ctx: OrgContext,
  providerId: ProviderId,
  params: CallbackParams,
  cookieValue: string | undefined,
  now: Date = new Date(),
): Promise<string> {
  const pending = openPending(cookieValue, ctx.userId);
  if (
    !pending ||
    pending.provider !== providerId ||
    pending.orgId !== ctx.orgId ||
    pending.expiresAt < now.getTime() ||
    !params.state ||
    !safeEqual(params.state, pending.state)
  )
    return settingsUrl({ error: "state" });
  if (params.error || !params.code) return settingsUrl({ error: "denied" });

  const provider = providerById(providerId);
  if (!provider.configured()) return settingsUrl({ error: "not_configured" });
  let externalUserId: string;
  let tokens;
  try {
    tokens = await provider.exchangeCode(params.code, pending.verifier, redirectUri(providerId));
    externalUserId = await provider.userId(tokens.accessToken, tokens.externalUserId);
    await provider.register?.(tokens.accessToken, externalUserId);
  } catch (error) {
    await log.error("device connect: exchange failed", {
      provider: providerId,
      error: loggable(error),
    });
    return settingsUrl({ error: "exchange_failed" });
  }
  try {
    await saveLink(ctx, providerId, externalUserId, tokens);
  } catch (error) {
    if (error instanceof Refused && error.detail === "already_linked")
      return settingsUrl({ error: "already_linked" });
    if (error instanceof Refused) return settingsUrl({ error: "not_a_rider" });
    throw error;
  }
  return settingsUrl({ connected: providerId });
}
