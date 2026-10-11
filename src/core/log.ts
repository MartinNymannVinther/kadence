import { headers } from "next/headers";

/**
 * A structured log line, replacing bare `console.*` calls in `src/core`
 * and `src/modules`. One JSON line in production (for Docker's log
 * driver and anything reading it later), a short readable line in
 * development.
 *
 * Never pass a token, a password, an e-mail address, a name or anything
 * about a check-in or a measurement in `fields` — that is on the caller
 * to check, the same rule as everywhere else data reaches a log or a
 * prompt (CLAUDE.md).
 */

export type LogFields = Record<string, unknown>;

type Level = "info" | "warn" | "error";

const REQUEST_ID_HEADER = "x-request-id";

/** A short id for pairing log lines with one request. Not a secret. */
export function randomRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * The request id a set of headers already carries (set by Coolify's or
 * Traefik's proxy in front of the app, or by `src/proxy.ts` when nothing
 * in front of it did), or a fresh one. For code that holds the
 * `Headers` directly — a route handler's `request.headers`, `src/proxy.ts`
 * itself, or a framework-free function that takes `Headers` as a
 * parameter instead of reading them through `next/headers`.
 */
export function requestIdFrom(headers: Headers): string {
  return headers.get(REQUEST_ID_HEADER) ?? randomRequestId();
}

/**
 * What is safe to log about a failure that is not one of Kadence's own
 * named errors: the error's name ("TypeError", "Error"), never its
 * message. A database driver's error message carries the query's
 * parameters, and those can be a sealed token or someone's e-mail
 * address — the same reasoning as `loggable` in
 * `src/modules/devices/http.ts`, for failures that are not a provider
 * call.
 */
export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

/**
 * The current request's id, read through `next/headers`. Works in
 * Server Components, Route Handlers and Server Actions — everything that
 * runs while an HTTP request is open. Code that runs outside one (a
 * timer, a background sweep after a response has already gone out) has
 * no request to name, so this answers `undefined` there instead of
 * throwing: `headers()` refuses outside a request scope by design.
 */
async function currentRequestId(): Promise<string | undefined> {
  try {
    return (await headers()).get(REQUEST_ID_HEADER) ?? undefined;
  } catch {
    return undefined;
  }
}

async function write(level: Level, event: string, fields: LogFields): Promise<void> {
  const { requestId: given, ...rest } = fields;
  const requestId = (given as string | undefined) ?? (await currentRequestId());
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;

  if (process.env.NODE_ENV === "production") {
    sink(JSON.stringify({ ts: new Date().toISOString(), level, event, requestId, ...rest }));
    return;
  }

  const tail = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
  sink(`${level.toUpperCase()} ${event}${requestId ? ` [${requestId}]` : ""}${tail}`);
}

/**
 * `log.info/warn/error(event, fields)`. `fields` may carry its own
 * `requestId` (a route handler that already read it off the request);
 * otherwise one is read from the current request, if there is one.
 */
export const log = {
  info: (event: string, fields: LogFields = {}): Promise<void> => write("info", event, fields),
  warn: (event: string, fields: LogFields = {}): Promise<void> => write("warn", event, fields),
  error: (event: string, fields: LogFields = {}): Promise<void> => write("error", event, fields),
};
