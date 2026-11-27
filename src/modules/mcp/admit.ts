import { verifyJwsAccessToken } from "@better-auth/core/oauth2";
import { eq } from "drizzle-orm";
import { auth } from "@/core/auth/auth";
import { AUTH_ISSUER, MCP_RESOURCE, MCP_SCOPES, mcpOn, ORG_CLAIM } from "@/core/auth/mcp";
import { stillAMember } from "@/core/auth/session";
import { mustVerifyFirst } from "@/core/auth/verify-first";
import { todayInCopenhagen } from "@/core/dates";
import { authDb } from "@/core/db/client";
import { users } from "@/core/db/schema";
import type { OrgContext } from "@/core/db/tenant";
import { callerKey, rateLimit } from "@/core/rate-limit";
import { connectionFor } from "./connections";
import { connectingRider } from "./eligibility";
import type { McpScope } from "@/core/auth/mcp";
import type { Caller } from "./tool";

/**
 * Who is calling /api/mcp (docs/adr/0118), settled before any message is
 * read. A token Kadence signed for this resource, a workspace named on it,
 * a connection the person still has, membership of the workspace, an
 * address confirmed where it must be, and a rider of 15 or more. Any of
 * these missing is 401 with the challenge that tells an assistant where to
 * sign in, so a connection removed on "Din AI" stops at the next call.
 */

const MINUTE = 60_000;
/** Every request from one address. */
const PER_ADDRESS = { count: 600, windowMs: 10 * MINUTE };
/** Calls for one person, whichever assistant. */
const PER_PERSON = { count: 300, windowMs: 10 * MINUTE };

/** The same object every call: Better Auth caches the keys under it. */
const JWKS_CACHE = {};

export function protectedResourceMetadataUrl(resource: string): string {
  const url = new URL(resource);
  return `${url.origin}/.well-known/oauth-protected-resource${url.pathname}`;
}

function challenge(status: 401 | 403, error?: string): Response {
  const parts = [
    `resource_metadata="${MCP_RESOURCE ? protectedResourceMetadataUrl(MCP_RESOURCE) : ""}"`,
    `scope="${MCP_SCOPES.join(" ")}"`,
  ];
  if (error) parts.push(`error="${error}"`);
  return new Response(null, {
    status,
    headers: { "WWW-Authenticate": `Bearer ${parts.join(", ")}`, "Cache-Control": "no-store" },
  });
}

function tooMany(retryAfterSeconds: number): Response {
  return new Response(null, {
    status: 429,
    headers: { "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" },
  });
}

function bearerOf(headers: Headers): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(headers.get("authorization")?.trim() ?? "");
  return match?.[1] ?? null;
}

type Claims = { sub: string; azp: string; org: string; scopes: string[] };

async function claimsOf(token: string): Promise<Claims | null> {
  if (!MCP_RESOURCE) return null;
  try {
    const payload = await verifyJwsAccessToken(token, {
      jwksFetch: async () => auth.api.getJwks(),
      jwksCacheKey: JWKS_CACHE,
      verifyOptions: { issuer: AUTH_ISSUER, audience: MCP_RESOURCE },
    });
    const { sub, azp, scope } = payload as { sub?: unknown; azp?: unknown; scope?: unknown };
    const org = (payload as Record<string, unknown>)[ORG_CLAIM];
    if (typeof sub !== "string" || typeof azp !== "string" || typeof org !== "string") return null;
    return { sub, azp, org, scopes: typeof scope === "string" ? scope.split(" ") : [] };
  } catch {
    return null;
  }
}

async function confirmedEnough(userId: string): Promise<boolean> {
  const [user] = await authDb
    .select({ id: users.id, emailVerified: users.emailVerified, selfSignup: users.selfSignup })
    .from(users)
    .where(eq(users.id, userId));
  return user ? !(await mustVerifyFirst(user)) : false;
}

export async function admit(
  request: Request,
): Promise<{ caller: Caller; scopes: McpScope[] } | Response> {
  if (!mcpOn()) return new Response(null, { status: 404 });
  const address = await rateLimit(
    callerKey(request.headers, "mcp"),
    PER_ADDRESS.count,
    PER_ADDRESS.windowMs,
  );
  if (!address.allowed) return tooMany(address.retryAfterSeconds);

  const token = bearerOf(request.headers);
  if (!token) return challenge(401);
  const claims = await claimsOf(token);
  if (!claims) return challenge(401, "invalid_token");

  const person = await rateLimit(`mcp-person:${claims.sub}`, PER_PERSON.count, PER_PERSON.windowMs);
  if (!person.allowed) return tooMany(person.retryAfterSeconds);

  const ctx: OrgContext = { orgId: claims.org, userId: claims.sub, channel: "mcp" };
  if (!(await stillAMember(ctx.userId, ctx.orgId)) || !(await confirmedEnough(ctx.userId)))
    return challenge(401, "invalid_token");
  const connection = await connectionFor(ctx, claims.azp);
  if (!connection) return challenge(401, "invalid_token");

  const today = todayInCopenhagen();
  const rider = await connectingRider(ctx, Number(today.slice(0, 4)));
  if ("refused" in rider) return challenge(403, "insufficient_scope");

  // What the token says and what the person said yes to, both.
  const scopes = connection.scopes.filter((s) => claims.scopes.includes(s));
  return { caller: { ctx, riderId: rider.riderId, today }, scopes };
}
