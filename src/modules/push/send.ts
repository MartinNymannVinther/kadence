import { isPushEndpoint, pushService } from "./endpoint";
import { vapidAuthorization, type VapidKeys } from "./vapid";

/**
 * One push to one browser (RFC 8030), with nothing in it (docs/adr/0060).
 * The body is empty: the push only wakes the service worker, which asks
 * Kadence what is new as the person who is signed in. So the push service
 * — Apple's, Google's, Mozilla's or Microsoft's, whichever the browser
 * uses — learns an address, a time and this installation's public key,
 * and not one word of what the reminder says.
 *
 * - `TTL`: a phone that is off for the evening still gets it within six
 *   hours; after that a reminder is old news and the service drops it.
 * - `Urgency: normal`: a reminder, not an alarm.
 * - `Topic`: a newer push replaces one still waiting, so a phone that was
 *   off does not wake to a pile. The text is fetched on waking anyway.
 */

export const PUSH_TTL_SECONDS = 6 * 60 * 60;
const TIMEOUT_MS = 10_000;

export type PushConfig = {
  keys: VapidKeys;
  /** The VAPID `sub`: a mailto: or https: address. */
  subject: string;
  /** Injected in tests; the suite never reaches the network. */
  fetch?: typeof fetch;
};

export type PushResult =
  | { outcome: "sent" }
  /** The browser has gone: unsubscribed, uninstalled, expired. Forget the address. */
  | { outcome: "gone"; status: number }
  /** Something else. `transient` failures are worth trying again on the next run. */
  | { outcome: "failed"; status: number | null; transient: boolean };

export async function sendPush(
  endpoint: string,
  config: PushConfig,
  now: Date = new Date(),
): Promise<PushResult> {
  // Checked when it was saved; checked again before the server posts to it.
  if (!isPushEndpoint(endpoint)) return { outcome: "gone", status: 0 };
  const post = config.fetch ?? fetch;
  let response: Response;
  try {
    response = await post(endpoint, {
      method: "POST",
      headers: {
        Authorization: vapidAuthorization(endpoint, config.keys, config.subject, now),
        TTL: String(PUSH_TTL_SECONDS),
        Urgency: "normal",
        Topic: "kadence",
      },
      // No body: fetch sends `Content-Length: 0` for a POST without one.
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error(
      "reminders: push failed",
      pushService(endpoint),
      error instanceof Error ? error.name : "error",
    );
    return { outcome: "failed", status: null, transient: true };
  }
  // The body says nothing Kadence acts on; read it so the socket is freed.
  await response.arrayBuffer().catch(() => undefined);
  if (response.ok) return { outcome: "sent" };
  if (response.status === 404 || response.status === 410)
    return { outcome: "gone", status: response.status };
  console.error("reminders: push refused", pushService(endpoint), response.status);
  return {
    outcome: "failed",
    status: response.status,
    transient: response.status === 429 || response.status >= 500,
  };
}
