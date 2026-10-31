import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { formBody, requestJson } from "./http";
import type { Tokens } from "./providers";

/**
 * The OAuth 2.0 mechanics Wahoo and Garmin share: PKCE (RFC 7636, S256),
 * the state that ties a callback to the browser that started it, the
 * token request, and a constant-time comparison for anything secret
 * (Polar's webhook signature included).
 */

/** 32 random bytes, base64url: 43 characters, inside PKCE's 43–128. */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/**
 * Equal strings in constant time. Both sides are hashed first, so the
 * comparison takes the same time whatever the lengths — a length that
 * differs says nothing either.
 */
export function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(left, right) && a.length === b.length;
}

const TokenResponse = z.object({
  access_token: z.string().min(1).max(4096),
  refresh_token: z.string().min(1).max(4096).nullish(),
  expires_in: z.coerce
    .number()
    .int()
    .positive()
    .max(10 * 365 * 86_400)
    .nullish(),
  // Garmin says when the refresh token runs out (docs/adr/0113); an answer
  // that does not is read as not saying.
  refresh_token_expires_in: z.coerce
    .number()
    .int()
    .positive()
    .max(10 * 365 * 86_400)
    .nullish()
    .catch(null),
});

/**
 * POSTs a token request as a form, the way both providers document it,
 * and reads the answer: an access token, maybe a refresh token (both
 * rotate them), when the access token runs out, and when the refresh
 * token does, for a provider that says.
 */
export async function tokenRequest(
  url: string,
  params: Record<string, string | undefined>,
  now: Date = new Date(),
): Promise<Tokens> {
  const answer = await requestJson(
    url,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody(params),
    },
    TokenResponse,
  );
  return {
    accessToken: answer.access_token,
    refreshToken: answer.refresh_token ?? null,
    expiresAt: answer.expires_in ? new Date(now.getTime() + answer.expires_in * 1000) : null,
    refreshExpiresAt: answer.refresh_token_expires_in
      ? new Date(now.getTime() + answer.refresh_token_expires_in * 1000)
      : null,
  };
}
