/**
 * The public origin a visitor came in by, for the demo to land them back
 * on: the installation's declared origin (BETTER_AUTH_URL), or another it
 * trusts (AUTH_TRUSTED_ORIGINS) when the request's host names that one — a
 * developer's machine reached on the home network or over Tailscale.
 *
 * Only an origin the installation was told about is ever returned. A host
 * header naming anything else lands on the declared one, so no header can
 * send a visitor anywhere. The protocol is always the configured
 * origin's, never the request's: behind the proxy the request knows only
 * the container's own address, and speaks http there even when the
 * visitor spoke https. Pure.
 */
export function arrivalOrigin(
  host: string | null,
  declared: string,
  trusted: readonly string[],
): URL {
  const own = new URL(declared);
  const wanted = host?.split(",")[0]?.trim().toLowerCase();
  if (!wanted) return own;
  for (const origin of [declared, ...trusted]) {
    const url = new URL(origin);
    if (url.host.toLowerCase() === wanted) return url;
  }
  return own;
}

/** The host a request came in by: the one a proxy forwarded first, else its own. */
export function arrivalHost(headers: Headers): string | null {
  return headers.get("x-forwarded-host") ?? headers.get("host");
}
