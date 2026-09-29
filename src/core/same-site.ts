/**
 * Whether a browser says the request came from somewhere else.
 *
 * A route that changes something on the strength of the session cookie
 * is guarded by the cookie being SameSite=Lax: another site cannot send
 * it along. "Site" is wider than "origin", though. Every tool in the
 * family lives under the same registrable domain, so a page on a sibling
 * is the same site to the cookie and a different origin to everything
 * else. Browsers stamp the difference on every request as
 * `Sec-Fetch-Site`, and a page cannot set that header itself.
 *
 * `same-origin` is Kadence's own pages. `none` is the person, not a
 * page: an address typed, a bookmark, a file shared from the phone's
 * share sheet. No header at all is an old browser or a program, where
 * the cookie is the guard as before. Anything else is refused.
 */
export function fromAnotherSite(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  return site !== null && site !== "same-origin" && site !== "none";
}
