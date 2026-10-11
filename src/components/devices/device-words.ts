/**
 * The short codes the devices module leaves behind, as keys of
 * `devices.*`: a link's last error (src/modules/devices/links.ts,
 * webhooks.ts, push.ts), an upload key's (ingest.ts), the connect flow's
 * `?error=` (connect.ts), and a push's refusal. Anything unknown reads as
 * the generic word. Pure.
 */

const LAST_ERRORS = [
  "refresh_failed",
  "unauthorized",
  "deregistered",
  "provider_unavailable",
  "invalid_file",
  "quota",
] as const;

export function lastErrorKey(code: string): string | null {
  if (!code) return null;
  if (code.startsWith("download_")) return "download";
  return (LAST_ERRORS as readonly string[]).includes(code) ? code : "unknown";
}

/** What an upload key noted about the last file it was used for (ingest.ts). */
const KEY_ERRORS = ["invalid_file", "quota"] as const;

export function keyErrorKey(code: string): string | null {
  if (!code) return null;
  return (KEY_ERRORS as readonly string[]).includes(code) ? code : "unknown";
}

const CONNECT_ERRORS = [
  "unauthorized",
  "not_configured",
  "not_a_rider",
  "rate_limited",
  "state",
  "denied",
  "exchange_failed",
  "already_linked",
  "failed",
] as const;

export function connectErrorKey(code: string | undefined): string | null {
  if (!code) return null;
  return (CONNECT_ERRORS as readonly string[]).includes(code) ? code : "failed";
}

const PUSH_ERRORS = [
  "not_bike",
  "no_steps",
  "not_connected",
  "reconnect",
  "provider_permission",
  "provider_error",
  "not_configured",
] as const;

export function pushErrorKey(detail: string | undefined): string {
  return detail && (PUSH_ERRORS as readonly string[]).includes(detail) ? detail : "generic";
}
