import { isIP } from "node:net";
import { env } from "@/core/env";

/**
 * A small in-process rate limiter for public endpoints — the ones with no
 * session to count against, where the only handle is the caller's address.
 *
 * Deliberately in memory. Kadence runs as one container behind one proxy, so
 * one process is the whole installation and a shared store would be a
 * dependency bought for nothing. The honest limits of that: the counters
 * reset when the app restarts, and an installation that is ever scaled to
 * several instances gets a limit per instance rather than a limit. If that
 * day comes, this is the one file to replace, and the call sites do not
 * change.
 *
 * The authenticated surface does not use this: model calls are counted in
 * the database per user and per workspace (see modules/ai/limits.ts), and
 * Better Auth rate-limits its own endpoints.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

/** Drops expired buckets now and then, so a long-running process stays flat. */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

export type RateLimit = { allowed: boolean; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimit {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit)
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Whether one more would be allowed, without counting it. For a limit on
 * what was done rather than on what was tried — stored files, where the
 * same ride sent twice must not use up the hour: ask first, do the work,
 * and count with `rateLimit` only what was kept.
 */
export function peekRateLimit(key: string, limit: number): RateLimit {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now || bucket.count < limit)
    return { allowed: true, retryAfterSeconds: 0 };
  return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
}

/**
 * The one bucket every caller shares when no address can be trusted. It
 * fails closed rather than open, which is the right way round for a
 * public endpoint: a flood from one place slows everyone for a minute
 * instead of buying the flooder a fresh bucket a request.
 */
export const SHARED_BUCKET = "unknown";

/** An IPv4 or IPv6 address and nothing else: a proxy writes addresses, so anything else was written by someone else. */
function isAddress(value: string): boolean {
  return isIP(value) !== 0;
}

/**
 * The caller's address, read from the right.
 *
 * X-Forwarded-For is a list a proxy *appends* to, so the leftmost entry is
 * whatever the caller sent - which is to say, whatever the caller felt
 * like sending. `curl -H "X-Forwarded-For: $RANDOM"` would otherwise buy a
 * fresh bucket on every request and every limit here would be decoration.
 *
 * The entry our own proxy wrote is TRUSTED_PROXY_HOPS from the end: one
 * for the usual Coolify/Traefik deployment. At 0 — nothing in front —
 * every entry is the caller's own, so no forwarded header is read at
 * all. Next does not hand a route the connection's address (NextRequest
 * lost `ip` in 15; it is "provided by your hosting provider"), so with
 * nothing in front the whole installation shares one bucket. So does an
 * installation whose proxy left no header, or whose entry is not an
 * address (backlog P2-08).
 */
export function clientAddress(headers: Headers): string {
  return addressBehind(headers, env.TRUSTED_PROXY_HOPS);
}

/** The address `hops` proxies in front leave in the headers. Pure, for the tests. */
export function addressBehind(headers: Headers, hops: number): string {
  if (hops < 1) return SHARED_BUCKET;
  const list = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const trusted = list.length >= hops ? list[list.length - hops] : undefined;
  if (trusted !== undefined) return isAddress(trusted) ? trusted : SHARED_BUCKET;
  // Too short a list for the hops: the proxy's own X-Real-Ip, if it set
  // one and it is an address; otherwise the shared bucket.
  const real = headers.get("x-real-ip")?.trim() ?? "";
  return isAddress(real) ? real : SHARED_BUCKET;
}

export function callerKey(headers: Headers, prefix: string): string {
  return `${prefix}:${clientAddress(headers)}`;
}

/** Only for tests: forget every bucket. */
export function resetRateLimits() {
  buckets.clear();
  lastSweep = 0;
}
