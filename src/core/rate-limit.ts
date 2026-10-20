import { isIP } from "node:net";
import { countOne, currentCount, resetCounters } from "@/core/counters";
import { env } from "@/core/env";

/**
 * The rate limiter: how many times something may happen per key in a
 * window. Most keys are a person (`upload:<user>`); the public endpoints,
 * which have no session to count against, key on the caller's address.
 *
 * The counts live in the database (src/core/counters.ts, docs/adr/0083),
 * so every instance of Kadence shares one count and a restart keeps it.
 * Until October 2026 they lived in this process's memory; the functions
 * kept their names and their answers, and became asynchronous.
 *
 * When the database cannot be asked, the answer is no: a limit that lets
 * everything through while its store is down is no limit, and every door
 * behind one needs the database for its own work anyway. The caller
 * answers as it does for any refusal, with a short Retry-After, and the
 * failure is logged once per refusal by name only.
 *
 * Model calls are counted elsewhere, per user and per workspace in their
 * own table (src/modules/ai/limits.ts), and Better Auth rate-limits its own
 * endpoints in `rate_limits`, which the counters' sweep also cleans.
 */

export type RateLimit = { allowed: boolean; retryAfterSeconds: number };

/** How long a caller refused because the database did not answer is asked to wait. */
const UNAVAILABLE_SECONDS = 5;

function unavailable(error: unknown): RateLimit {
  // A name, never a message: a database error's message carries its parameters.
  console.error(
    "rate-limit: the counters did not answer",
    error instanceof Error ? error.name : "unknown",
  );
  return { allowed: false, retryAfterSeconds: UNAVAILABLE_SECONDS };
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimit> {
  try {
    const { count, retryAfterSeconds } = await countOne(key, windowMs);
    return count > limit
      ? { allowed: false, retryAfterSeconds }
      : { allowed: true, retryAfterSeconds: 0 };
  } catch (error) {
    return unavailable(error);
  }
}

/**
 * Whether one more would be allowed, without counting it. For a limit on
 * what was done rather than on what was tried — stored files, where the
 * same ride sent twice must not use up the hour: ask first, do the work,
 * and count with `rateLimit` only what was kept.
 */
export async function peekRateLimit(key: string, limit: number): Promise<RateLimit> {
  try {
    const now = await currentCount(key);
    if (!now || now.count < limit) return { allowed: true, retryAfterSeconds: 0 };
    return { allowed: false, retryAfterSeconds: now.retryAfterSeconds };
  } catch (error) {
    return unavailable(error);
  }
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

/** Only for tests: forget every count. */
export async function resetRateLimits(): Promise<void> {
  await resetCounters();
}
