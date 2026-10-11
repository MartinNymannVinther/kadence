import { randomBytes } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { installationHasOwner } from "@/core/access/service";
import { auth } from "@/core/auth/auth";
import { authDb } from "@/core/db/client";
import { demoWorkspaces } from "@/core/db/schema";
import { markWorkspacePersonal } from "@/core/auth/register-personal";
import { DEMO_HEADER, demoSignupHeaderValue } from "@/core/auth/signup";
import { env } from "@/core/env";
import { errorName, log } from "@/core/log";
import { organizationSlug } from "@/lib/slug";
import { arrivalOrigin } from "./origin";
import { createDemoRoles } from "./roles";
import { seedDemoTeam } from "./seed";
import { ALONE_RIDER, seedDemoAlone } from "./seed-alone";
import { ALONE_NAME, TEAM_NAME } from "./seed-data";

/**
 * A demo is a real workspace with a throwaway account in it and a date on
 * which it stops existing. Everything a visitor touches is the product:
 * the same tables, the same policies, the same services, so nothing shown
 * here can quietly differ from what a customer would get. A demo opens
 * on a U19 team in full swing (seed.ts), written through the same
 * services a person uses, with a rider and a parent beside the coach so
 * the visitor can see all three roles (roles.ts). `/demo?alene=1` opens
 * on one U19 rider alone instead, a personal workspace whose owner and
 * rider is the visitor (seed-alone.ts, docs/adr/0080).
 *
 * Nothing here runs unless DEMO=on. On an installation that has not asked
 * for it, the route below answers 404 and this file is dead code.
 */

export const DEMO_TTL_HOURS = 24;
/** A ceiling on how many demo workspaces may exist at once. */
export const MAX_LIVE_DEMOS = 200;

export function demoEnabled(): boolean {
  return env.DEMO === "on";
}

/**
 * Whether a visitor may open a demo now: the installation has asked for
 * demos and somebody already owns it. Until the first real account exists,
 * /demo answers 404 and the front page offers no demo, so a demo can never
 * be the first account on an installation (backlog P1-09, docs/launch.md).
 */
export async function demoReady(): Promise<boolean> {
  return demoEnabled() && (await installationHasOwner());
}

/**
 * Where a new demo lands, as a URL the browser can follow: on the public
 * origin the visitor came in by, `host` (`origin.ts`).
 *
 * Never built from the request's own URL, because behind the proxy the
 * request does not know the public address: Next hands a route handler
 * `https://0.0.0.0:3000/...`, the container's own listen address, and a
 * redirect built on that sends the visitor to a place that does not
 * exist. BETTER_AUTH_URL is the installation's declared public origin,
 * the same one passkeys and share links are bound to; a visitor who came
 * in by another origin the installation trusts — a developer's machine on
 * the home network — lands back on that one, where the session's cookie
 * was set.
 */
export function demoLandingUrl(locale: "da" | "en", host: string | null = null): URL {
  const prefix = locale === "da" ? "" : `/${locale}`;
  return new URL(
    `${prefix}/today`,
    arrivalOrigin(host, env.BETTER_AUTH_URL, env.AUTH_TRUSTED_ORIGINS),
  );
}

/**
 * Whether the demo's session cookie carries the Secure flag. Decided by
 * the public origin the visitor came in by, for the same reason as above:
 * the request's own protocol is `http:` inside the container even when
 * every visitor arrives over TLS, and a session cookie without Secure on
 * a public installation is a cookie that may be sent in the clear.
 */
export function demoCookieSecure(host: string | null = null): boolean {
  return arrivalOrigin(host, env.BETTER_AUTH_URL, env.AUTH_TRUSTED_ORIGINS).protocol === "https:";
}

export type DemoSession = { headers: Headers } | null;

/** A team in full swing with three people, or one rider alone (`/demo?alene=1`, ADR 0080). */
export type DemoVariant = "team" | "alone";

/** Turns the set-cookie headers of an API response into a cookie header. */
function cookieHeaderFrom(responseHeaders: Headers): Headers {
  const cookie = responseHeaders
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  return new Headers({ cookie });
}

/** The cookies in `request`, with those `response` set in place of the old. */
function withNewCookies(request: Headers, response: Headers): Headers {
  const jar = new Map<string, string>();
  const pairs = [
    ...(request.get("cookie")?.split("; ") ?? []),
    ...response.getSetCookie().map((c) => c.split(";")[0]!),
  ];
  for (const pair of pairs) {
    const at = pair.indexOf("=");
    if (at > 0) jar.set(pair.slice(0, at), pair.slice(at + 1));
  }
  return new Headers({ cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") });
}

/**
 * Deletes every demo whose time is up. Called every hour by the worker
 * (`demo.cleanup`, job.ts, docs/adr/0085) and before each new demo, which
 * counts the live ones right after; `scripts/cleanup-demos.ts` and the
 * endpoint do it on demand.
 *
 * `delete_expired_demo()` (drizzle/0042) does each one in the database:
 * the organization, whose cascades take the workspace's rows with it; the
 * throwaway users — the visitor, the demo's rider and parent — because a
 * demo that leaves accounts behind is a demo that leaks addresses nobody
 * gave; and every audit row about either, because a stranger's sandbox
 * is not the installation's history (ADR 0084). It refuses anything that
 * is not a demo past its time, so the auth role cannot point it at a club.
 */
export async function cleanupExpiredDemos(): Promise<number> {
  const expired = await authDb
    .select({ organizationId: demoWorkspaces.organizationId })
    .from(demoWorkspaces)
    // The database's clock, the one delete_expired_demo() checks again.
    .where(lt(demoWorkspaces.expiresAt, sql`now()`));
  let deleted = 0;
  for (const row of expired) {
    try {
      const result = await authDb.execute<{ deleted: boolean }>(
        sql`select delete_expired_demo(${row.organizationId}) as deleted`,
      );
      // False when another clean-up got there first: nothing was touched.
      if (result.rows[0]?.deleted) deleted += 1;
    } catch (error) {
      // One stuck demo must not stop the others being cleaned up.
      await log.error("demo: cleanup failed", {
        orgId: row.organizationId,
        error: errorName(error),
      });
    }
  }
  return deleted;
}

async function liveDemoCount(): Promise<number> {
  const [row] = await authDb.select({ n: sql<number>`count(*)::int` }).from(demoWorkspaces);
  return Number(row?.n ?? 0);
}

/**
 * Builds a demo and returns the cookie that signs the visitor into it.
 * The account is created through the ordinary sign-up path rather than by
 * writing rows, so a demo session is a session like any other and every
 * guard behaves the way it will for a real user.
 */
export async function createDemoWorkspace(
  locale: "da" | "en",
  variant: DemoVariant = "team",
): Promise<DemoSession> {
  if (!(await demoReady())) return null;
  await cleanupExpiredDemos();
  if ((await liveDemoCount()) >= MAX_LIVE_DEMOS) return null;

  const alone = variant === "alone";
  const key = randomBytes(9).toString("hex");
  const email = `demo-${key}@demo.invalid`;
  const password = randomBytes(24).toString("base64url");
  // Alone, the visitor is the rider, so the menu greets them by her name.
  const name = alone ? ALONE_RIDER.name : locale === "da" ? "Gæst" : "Guest";
  const workspaceName = (alone ? ALONE_NAME : TEAM_NAME)[locale];

  let sessionHeaders: Headers;
  let userId: string;
  try {
    const { headers: responseHeaders, response } = await auth.api.signUpEmail({
      body: { name, email, password },
      // The demo bypasses the admission gate on purpose: this account is
      // not a person asking to be let in, it is a session that expires.
      headers: new Headers({ [DEMO_HEADER]: demoSignupHeaderValue() }),
      returnHeaders: true,
    });
    sessionHeaders = cookieHeaderFrom(responseHeaders);
    userId = response.user!.id;
  } catch (error) {
    await log.error("demo: could not create the visitor's account", { error: errorName(error) });
    return null;
  }

  const organization = await auth.api.createOrganization({
    body: { name: workspaceName, slug: organizationSlug(`${workspaceName}-${key}`) },
    headers: sessionHeaders,
  });
  if (!organization) return null;
  const { headers: activeHeaders } = await auth.api.setActiveOrganization({
    body: { organizationId: organization.id },
    headers: sessionHeaders,
    returnHeaders: true,
  });
  // The session's cookie cache now names the team (docs/adr/0083). The
  // sign-up's named none; the roles' invitations and the visitor's browser
  // get this one.
  sessionHeaders = withNewCookies(sessionHeaders, activeHeaders);

  await authDb.insert(demoWorkspaces).values({
    organizationId: organization.id,
    userId,
    expiresAt: new Date(Date.now() + DEMO_TTL_HOURS * 60 * 60 * 1000),
  });

  if (alone) {
    // One person's own workspace (docs/adr/0080), set as the registration
    // sets it; the visitor is its owner and its one rider, and there is
    // nobody to switch to.
    try {
      await markWorkspacePersonal(organization.id);
      await seedDemoAlone({ orgId: organization.id, userId }, locale);
    } catch (error) {
      console.error("demo: could not seed the person alone", error);
    }
    return { headers: sessionHeaders };
  }

  try {
    await seedDemoTeam({ orgId: organization.id, userId }, locale);
    await createDemoRoles({
      key,
      orgId: organization.id,
      coach: { userId, email, password },
      coachHeaders: sessionHeaders,
      locale,
    });
  } catch (error) {
    // An empty demo, or one with only the coach, is still a demo.
    await log.error("demo: could not seed the team", {
      orgId: organization.id,
      error: errorName(error),
    });
  }

  return { headers: sessionHeaders };
}

/** True when the workspace the caller is in is a demo. */
export async function isDemoWorkspace(orgId: string): Promise<boolean> {
  const [row] = await authDb
    .select({ id: demoWorkspaces.id })
    .from(demoWorkspaces)
    .where(sql`${demoWorkspaces.organizationId} = ${orgId}`)
    .limit(1);
  return Boolean(row);
}
