import { env } from "@/core/env";
import { buildInfo } from "@/core/version";
import { readLimited } from "@/modules/devices/http";

/**
 * How the teams page reads a public page or a JSON answer from the UCI or
 * Cykling Danmark (ADR 0072): one request at a time, no redirect
 * followed, the answer capped, and the request saying who is asking —
 * Kadence, and the installation's own address — so the host can see it
 * and say no. The same manners as the results reader (ADR 0039).
 *
 * `FetchLike` is the one seam: the refresh hands in `fetch`, a test hands
 * in a function that answers from fixtures.
 */

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const TIMEOUT_MS = 20_000;
const MAX_BYTES = 2 * 1024 * 1024;

export class SourceError extends Error {
  constructor(
    readonly code: "network" | "timeout" | "status" | "invalid_response",
    readonly status?: number,
  ) {
    super(code);
    this.name = "SourceError";
  }
}

function userAgent(): string {
  return `Kadence/${buildInfo.version} (+${new URL(env.BETTER_AUTH_URL).origin})`;
}

async function request(
  fetchFn: FetchLike,
  url: string,
  init: { method: "GET" | "POST"; accept: string; body?: string; headers?: Record<string, string> },
): Promise<string> {
  let response: Response;
  try {
    response = await fetchFn(url, {
      method: init.method,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: init.body,
      headers: {
        Accept: init.accept,
        "User-Agent": userAgent(),
        ...(init.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    throw new SourceError(name === "TimeoutError" || name === "AbortError" ? "timeout" : "network");
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new SourceError("status", response.status);
  }
  const bytes = await readLimited(response.body, MAX_BYTES, response.headers.get("content-length"));
  return new TextDecoder("utf-8").decode(bytes);
}

/** A page of HTML. */
export async function getHtml(fetchFn: FetchLike, url: string): Promise<string> {
  return request(fetchFn, url, { method: "GET", accept: "text/html" });
}

/** A JSON answer to a GET. */
export async function getJson(fetchFn: FetchLike, url: string): Promise<unknown> {
  return parseJson(await request(fetchFn, url, { method: "GET", accept: "application/json" }));
}

/** A JSON answer to a form POST, as DataRide's grids ask for their data. */
export async function postJson(
  fetchFn: FetchLike,
  url: string,
  form: Record<string, string>,
): Promise<unknown> {
  const body = new URLSearchParams(form).toString();
  return parseJson(
    await request(fetchFn, url, {
      method: "POST",
      accept: "application/json",
      body,
      headers: { "X-Requested-With": "XMLHttpRequest" },
    }),
  );
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SourceError("invalid_response");
  }
}
