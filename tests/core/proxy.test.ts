import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import proxy from "@/proxy";

/**
 * What the proxy answers before anything renders (backlog P2-09). A
 * parked part's page is rewritten to a path no page matches, which the
 * catch-all in [locale]/[...rest] turns into the localized not-found
 * page with a real 404 — a not-found page streamed from under a loading
 * boundary would be a 200. The suite runs with every part off; a test
 * that wants one on says so.
 *
 * The status itself is the built app's to give, and is checked against
 * `pnpm build && pnpm start` by hand (the pull request says how); what
 * is pinned here is the decision and where it sends the request.
 * next-intl's middleware is stood in for — its ESM build cannot be
 * loaded outside Next's bundler — by one that rewrites to the Danish
 * path the real one would, so a hand-off to it is visible.
 */

const on = vi.hoisted(() => new Set<string>());
vi.mock("@/core/features", async (importOriginal) =>
  (await import("../helpers/features")).featuresWith(await importOriginal(), on),
);
vi.mock("next-intl/middleware", () => ({
  default: () => (request: NextRequest) => {
    const url = request.nextUrl.clone();
    if (!/^\/en(\/|$)/.test(url.pathname)) url.pathname = `/da${url.pathname}`;
    return NextResponse.rewrite(url);
  },
}));

const ORIGIN = "http://localhost:3000";
const request = (path: string, cookie?: string) =>
  new NextRequest(`${ORIGIN}${path}`, {
    headers: cookie ? { cookie } : {},
  });
const rewriteOf = (response: Response) => response.headers.get("x-middleware-rewrite");

beforeEach(() => on.clear());

describe("a parked page while its part is off", () => {
  it.each([
    ["/club", "/da/parked/club"],
    ["/coaches", "/da/parked/coaches"],
    ["/coaches/t1", "/da/parked/coaches/t1"],
    ["/calculators/energy", "/da/parked/calculators/energy"],
    ["/guides/food", "/da/parked/guides/food"],
  ])("%s is rewritten to the catch-all in Danish", (path, target) => {
    const response = proxy(request(path));
    expect(response.status).toBe(200);
    expect(rewriteOf(response)).toBe(`${ORIGIN}${target}`);
  });

  it.each([
    ["/en/club", "/en/parked/club"],
    ["/en/coaches/t1", "/en/parked/coaches/t1"],
    ["/en/guides/food", "/en/parked/guides/food"],
  ])("%s is rewritten to the catch-all in English", (path, target) => {
    expect(rewriteOf(proxy(request(path)))).toBe(`${ORIGIN}${target}`);
  });

  it("answers the same with a session cookie as without: the page is not there", () => {
    const signedIn = proxy(request("/club", "better-auth.session_token=abc"));
    expect(rewriteOf(signedIn)).toBe(`${ORIGIN}/da/parked/club`);
    const signedOut = proxy(request("/club"));
    expect(signedOut.status).toBe(200);
    expect(signedOut.headers.get("location")).toBeNull();
  });

  it("drops the query, so nothing from it reaches the not-found page", () => {
    expect(rewriteOf(proxy(request("/club?round=3")))).toBe(`${ORIGIN}/da/parked/club`);
  });
});

describe("a parked page while its part is on", () => {
  it("goes to the login redirect without a session cookie, like every app page", () => {
    on.add("clubChampionship").add("coachesRoom");
    for (const path of ["/club", "/coaches/t1"]) {
      const response = proxy(request(path));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`${ORIGIN}/login`);
    }
  });

  it("goes on to the locale handling with one", () => {
    on.add("clubChampionship");
    const response = proxy(request("/club", "better-auth.session_token=abc"));
    expect(response.status).toBe(200);
    expect(rewriteOf(response)).toBe(`${ORIGIN}/da/club`);
  });

  it("serves an open page to anyone", () => {
    on.add("foodGuide");
    const response = proxy(request("/en/guides/food"));
    expect(response.status).toBe(200);
    expect(rewriteOf(response)).toBe(`${ORIGIN}/en/guides/food`);
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("the rest of Kadence", () => {
  it("is untouched by the parked check", () => {
    const today = proxy(request("/today", "better-auth.session_token=abc"));
    expect(rewriteOf(today)).toBe(`${ORIGIN}/da/today`);
    const gearing = proxy(request("/calculators/gearing"));
    expect(rewriteOf(gearing)).toBe(`${ORIGIN}/da/calculators/gearing`);
    expect(proxy(request("/today")).headers.get("location")).toBe(`${ORIGIN}/login`);
  });
});
