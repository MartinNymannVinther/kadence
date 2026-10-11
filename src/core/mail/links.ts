import { env } from "@/core/env";
import type { MailLocale } from "./words";

/**
 * Every link a mail carries that is not an invitation's own (those are
 * made where the invitation is: `joinUrl`, `invitationUrl`) is made here,
 * on the installation's own address (BETTER_AUTH_URL), and nowhere else
 * (docs/adr/0086).
 */

/** A path inside Kadence, in the reader's language, as a full link on the installation's address. */
export function appLink(
  path: string,
  locale: MailLocale,
  params: Record<string, string> = {},
): string {
  const url = new URL(locale === "en" ? `/en${path}` : path, env.BETTER_AUTH_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}
