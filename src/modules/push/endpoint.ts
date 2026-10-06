/**
 * Where a push may go (docs/adr/0059). A browser hands Kadence its push
 * address when a person turns reminders on, and Kadence later posts to
 * it with nobody watching. Taking any https address on trust would let
 * a signed-in person aim the server at a host of their choosing, so the
 * address must belong to one of the push services the browsers use —
 * the ones named in docs/subprocessors.md — and nothing else.
 *
 * Pure: the tests and the zod schema both use it.
 */

/** Hosts, or the end of a host after a dot, that run a browser's push service. */
const PUSH_HOSTS = [
  // Chrome, Edge on Android, Opera, Samsung Internet and Brave (Google's FCM).
  "fcm.googleapis.com",
  "android.googleapis.com",
  // Firefox (Mozilla's autopush).
  "push.services.mozilla.com",
  // Safari on macOS, iPhone and iPad (Apple).
  "push.apple.com",
  // Edge on Windows (Microsoft's WNS).
  "notify.windows.com",
] as const;

export const MAX_ENDPOINT_LENGTH = 1000;

function hostMatches(host: string, allowed: string): boolean {
  return host === allowed || host.endsWith(`.${allowed}`);
}

/** Whether `endpoint` is an https address at a known push service. */
export function isPushEndpoint(endpoint: string): boolean {
  if (endpoint.length > MAX_ENDPOINT_LENGTH) return false;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return PUSH_HOSTS.some((allowed) => hostMatches(host, allowed));
}

/** The push service's host, for a log line that must not carry the address itself. */
export function pushService(endpoint: string): string {
  try {
    return new URL(endpoint).hostname;
  } catch {
    return "invalid";
  }
}
