import { sealSecret } from "@/core/crypto/secret-box";
import type { ProviderId, Tokens } from "./providers";

/**
 * A link's tokens, sealed with the secret box and bound to the rider and
 * the provider, so a sealed token copied into another row does not open
 * (links.ts). They are opened only where a provider call needs one
 * (link-tokens.ts), and never towards the interface.
 */

export const sealOwner = (riderId: string, provider: ProviderId) =>
  `device-link:${riderId}:${provider}`;

/** The token columns of a link, sealed. */
export function sealed(riderId: string, provider: ProviderId, tokens: Tokens) {
  const owner = sealOwner(riderId, provider);
  return {
    accessTokenSealed: sealSecret(tokens.accessToken, owner),
    refreshTokenSealed: tokens.refreshToken ? sealSecret(tokens.refreshToken, owner) : null,
    expiresAt: tokens.expiresAt,
    refreshExpiresAt: tokens.refreshExpiresAt ?? null,
  };
}

/**
 * The token columns of a link the provider has let go (a deregistration):
 * nothing that opens. `access_token_sealed` is required, so it is empty,
 * which never opens either.
 */
export const NO_TOKENS = {
  accessTokenSealed: "",
  refreshTokenSealed: null,
  expiresAt: null,
  refreshExpiresAt: null,
} as const;
