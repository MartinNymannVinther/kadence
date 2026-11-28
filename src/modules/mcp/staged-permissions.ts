import { openSecret, sealSecret } from "@/core/crypto/secret-box";
import { cleanPermissions, DEFAULT_PERMISSIONS, type Permission } from "./permissions";

/**
 * The switches a person sets on the consent page (docs/adr/0120), carried
 * to the moment the yes becomes a connection. Better Auth's consent
 * endpoint takes only its own fields, so the page leaves the switches in
 * a short-lived cookie, sealed to the person and the client, just before it
 * says yes; the consent hook reads them back (src/core/auth/mcp-consent.ts).
 * A cookie that does not open, or names another client, gives the
 * defaults: reading only.
 */

export const STAGED_COOKIE = "kadence_mcp_permissions";
export const STAGED_SECONDS = 10 * 60;

const owner = (userId: string) => `mcp-permissions:${userId}`;

export function sealStaged(
  userId: string,
  clientId: string,
  permissions: readonly string[],
): string {
  return sealSecret(
    JSON.stringify({ clientId, permissions: cleanPermissions(permissions) }),
    owner(userId),
  );
}

export function openStaged(
  value: string | null | undefined,
  userId: string,
  clientId: string,
): Permission[] {
  const plain = openSecret(value, owner(userId));
  if (!plain) return [...DEFAULT_PERMISSIONS];
  try {
    const parsed = JSON.parse(plain) as { clientId?: unknown; permissions?: unknown };
    if (parsed.clientId !== clientId || !Array.isArray(parsed.permissions))
      return [...DEFAULT_PERMISSIONS];
    return cleanPermissions(parsed.permissions.filter((p): p is string => typeof p === "string"));
  } catch {
    return [...DEFAULT_PERMISSIONS];
  }
}
