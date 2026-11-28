/**
 * Where a person goes after signing in: a path on this site the link asked
 * for (`?next=`), never an address elsewhere; Today otherwise. Pure, for
 * the login and two-factor forms.
 */
export function nextPath(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/today";
}

/**
 * Whether the browser must load `path` whole rather than as a page of the
 * app: an assistant's sign-in (/connect, docs/adr/0118) goes on to
 * Better Auth and then to another site, which no in-app navigation can
 * follow.
 */
export function leavesTheApp(path: string): boolean {
  return path === "/connect" || path.startsWith("/connect?");
}
