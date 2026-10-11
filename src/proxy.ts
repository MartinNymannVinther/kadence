import { getSessionCookie } from "better-auth/cookies";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { features, parkedPath } from "./core/features";
import { requestIdFrom } from "./core/log";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const REQUEST_ID_HEADER = "x-request-id";

const PROTECTED_PREFIXES = [
  "/today",
  "/calendar",
  "/riders",
  "/library",
  "/season",
  "/activities",
  "/parents",
  "/me",
  "/settings",
  "/help",
  "/onboarding",
  "/rulle",
  "/club",
  "/coaches",
];

/** Pathname with any locale prefix removed, e.g. /en/login → /login. */
function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

function localizedPath(pathname: string, target: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      if (locale !== routing.defaultLocale) return `/${locale}${target}`;
      break;
    }
  }
  return target;
}

/** The locale a pathname is prefixed with, or the default when it has none. */
function localeOf(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) return locale;
  }
  return routing.defaultLocale;
}

/**
 * A parked page answers 404 before anything renders (docs/adr/0057,
 * backlog P2-09). The page calls notFound() itself too, but under
 * (app)/(narrow) a loading boundary has started streaming by then, and
 * a response that has started streaming is a 200 whatever is thrown
 * afterwards (node_modules/next/dist/docs, loading.md, "Status codes").
 * So the request is rewritten here, before any rendering, to a path no
 * page matches: the catch-all in [locale]/[...rest] turns it into the
 * localized not-found page with a real 404. Same page, right status, and
 * no session read for a page that is not there.
 */
function parkedResponse(request: NextRequest): NextResponse {
  const original = request.nextUrl.pathname;
  const url = request.nextUrl.clone();
  url.pathname = `/${localeOf(original)}/parked${stripLocale(original)}`;
  url.search = "";
  return NextResponse.rewrite(url);
}

/**
 * Carries `requestId` on to the rendered page, where `headers()` (used by
 * `src/core/log.ts`) can read it, and on to the client for support. This
 * is the same contract `NextResponse.next({ request: { headers } })`
 * builds under the hood (`x-middleware-request-*` plus
 * `x-middleware-override-headers`, see
 * node_modules/next/dist/server/web/spec-extension/response.js) — applied
 * here directly because next-intl's middleware has already built the
 * response by the time this function sees it.
 *
 * The override list is the whole list: Next replaces the request's
 * headers with exactly the names in it (server/lib/router-utils/
 * resolve-routes.js), so a list of one name would strip the cookie and
 * every page would see no session. Every request header goes on the list
 * as `NextResponse.next` does, and the request id is added to it; a list
 * another middleware already wrote is extended, not replaced.
 */
function withRequestId(request: NextRequest, response: NextResponse, requestId: string) {
  const existing = response.headers.get("x-middleware-override-headers");
  const names = new Set<string>();
  if (existing) {
    for (const name of existing.split(",")) if (name.trim()) names.add(name.trim());
  } else {
    for (const [name, value] of request.headers) {
      response.headers.set(`x-middleware-request-${name}`, value);
      names.add(name);
    }
  }
  names.add(REQUEST_ID_HEADER);
  response.headers.set(`x-middleware-request-${REQUEST_ID_HEADER}`, requestId);
  response.headers.set("x-middleware-override-headers", [...names].join(","));
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

/**
 * Optimistic auth redirect based on the presence of the session cookie.
 * This is UX only — the (app) layout verifies the session for real, and RLS
 * is the actual isolation boundary.
 *
 * Deliberately one-directional: users WITHOUT a cookie are kept away from
 * app pages, but users WITH a cookie are never bounced away from the auth
 * pages. A stale cookie (expired or revoked session, reset database) would
 * otherwise loop: proxy pushes /login -> /flows on the cookie alone,
 * while the app layout pushes it back on the real session check.
 */
export default function proxy(request: NextRequest) {
  const requestId = requestIdFrom(request.headers);
  const pathname = stripLocale(request.nextUrl.pathname);
  if (parkedPath(pathname, features())) {
    return withRequestId(request, parkedResponse(request), requestId);
  }

  const hasSessionCookie = Boolean(getSessionCookie(request));

  if (!hasSessionCookie && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = localizedPath(request.nextUrl.pathname, "/login");
    url.search = "";
    return withRequestId(request, NextResponse.redirect(url), requestId);
  }

  return withRequestId(request, intlMiddleware(request), requestId);
}

export const config = {
  // Skip API routes, Next.js internals and static files.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
