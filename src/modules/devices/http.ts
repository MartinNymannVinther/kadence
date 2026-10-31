import type { z } from "zod";
import { MAX_UPLOAD_BYTES } from "./import";

/**
 * Every request Kadence makes to Wahoo, Garmin or Polar goes through here,
 * and everything that comes back is untrusted input (CLAUDE.md, security
 * rules):
 *
 * - every call has a deadline (`AbortSignal.timeout`), so a provider that
 *   hangs costs a request, never a stuck worker;
 * - a body is read up to a cap and no further — a JSON answer to 1 MB, a
 *   file to the upload's own cap — whatever Content-Length claims;
 * - JSON is parsed with a zod schema, and an answer that does not match is
 *   an error, not a guess;
 * - redirects are never followed blindly. An API call that redirects is an
 *   error. A file URL — the one thing a webhook payload tells Kadence to
 *   fetch — must be https, on a host the provider documents, with no
 *   credentials or odd port in it (`allowedUrl`), and a redirect is
 *   followed only to a URL that passes the same test. That is the SSRF
 *   defence: a forged or tampered notification cannot point Kadence at
 *   the database, the metadata service or anyone else's server.
 *
 * Errors carry a short code and the HTTP status, never a body or a token:
 * they end up as `last_error` on a link and in the server log.
 */

export const PROVIDER_TIMEOUT_MS = 15_000;
const MAX_JSON_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 3;

export type DeviceHttpErrorCode =
  "timeout" | "network" | "status" | "too_large" | "invalid_response" | "forbidden_host";

export class DeviceHttpError extends Error {
  constructor(
    readonly code: DeviceHttpErrorCode,
    readonly status?: number,
  ) {
    super(status ? `device http: ${code} ${status}` : `device http: ${code}`);
    this.name = "DeviceHttpError";
  }

  /**
   * The provider refused the token itself (401): the rider has to connect
   * again. A 403 is a permission the rider did not grant, not a dead link.
   */
  get unauthorized(): boolean {
    return this.code === "status" && this.status === 401;
  }

  /** The provider will never hand this over again (410): Garmin's file, already downloaded or too old. */
  get gone(): boolean {
    return this.code === "status" && this.status === 410;
  }

  /**
   * The provider turned the request down on its merits — a 4xx other than
   * too many requests — rather than being unavailable.
   */
  get rejected(): boolean {
    return (
      this.code === "status" &&
      this.status !== undefined &&
      this.status < 500 &&
      this.status !== 429
    );
  }
}

/**
 * What may be logged about a failure: the code and status of a provider
 * call, the name of anything else. Never a message — a database error's
 * message carries the query's parameters, and those can be sealed tokens.
 */
export function loggable(error: unknown): string {
  if (error instanceof DeviceHttpError) return error.message;
  return error instanceof Error ? error.name : "unknown";
}

/** Where a provider's files may be fetched from: exact hosts, documented suffixes, a path. */
export type HostRule = {
  hosts: readonly string[];
  /** A host matches `example.com` when it ends in `.example.com`. */
  suffixes?: readonly string[];
  pathPrefix?: string;
};

/** The URL, if Kadence may fetch it under `rule`; null otherwise. */
export function allowedUrl(raw: unknown, rule: HostRule): URL | null {
  if (typeof raw !== "string" || raw.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const listed =
    rule.hosts.includes(host) ||
    (rule.suffixes ?? []).some((suffix) => host.endsWith(`.${suffix}`));
  if (!listed) return null;
  if (rule.pathPrefix && !url.pathname.startsWith(rule.pathPrefix)) return null;
  return url;
}

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

/** A form body, leaving out what is not set. */
export function formBody(
  values: Record<string, string | number | null | undefined>,
): URLSearchParams {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== null && value !== undefined) body.set(key, String(value));
  return body;
}

async function send(
  url: URL | string,
  init: RequestInit,
  timeoutMs = PROVIDER_TIMEOUT_MS,
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    throw new DeviceHttpError(
      name === "TimeoutError" || name === "AbortError" ? "timeout" : "network",
    );
  }
}

async function discard(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}

/**
 * Reads a body up to `cap` bytes and refuses past it. Content-Length is a
 * hint that lets a large answer be refused early; the count is what holds.
 */
export async function readLimited(
  body: ReadableStream<Uint8Array> | null,
  cap: number,
  declared?: string | null,
): Promise<Uint8Array> {
  const length = Number(declared ?? Number.NaN);
  if (Number.isFinite(length) && length > cap) {
    await body?.cancel().catch(() => undefined);
    throw new DeviceHttpError("too_large");
  }
  if (!body) return new Uint8Array(0);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      throw new DeviceHttpError(
        name === "TimeoutError" || name === "AbortError" ? "timeout" : "network",
      );
    }
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > cap) {
      await reader.cancel().catch(() => undefined);
      throw new DeviceHttpError("too_large");
    }
    chunks.push(chunk.value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

/** A call to a provider's API that answers with JSON of the given shape. */
export async function requestJson<S extends z.ZodType>(
  url: string,
  init: RequestInit,
  schema: S,
): Promise<z.infer<S>> {
  const response = await send(url, init);
  if (!response.ok) {
    await discard(response);
    throw new DeviceHttpError("status", response.status);
  }
  const bytes = await readLimited(
    response.body,
    MAX_JSON_BYTES,
    response.headers.get("content-length"),
  );
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new DeviceHttpError("invalid_response");
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new DeviceHttpError("invalid_response");
  return parsed.data;
}

/** A call whose answer only has to be a success: a deletion, a schedule. */
export async function requestOk(
  url: string,
  init: RequestInit,
  timeoutMs = PROVIDER_TIMEOUT_MS,
): Promise<void> {
  const response = await send(url, init, timeoutMs);
  await discard(response);
  if (!response.ok) throw new DeviceHttpError("status", response.status);
}

/**
 * Downloads a file named by a webhook, from an allowed host only, at most
 * MAX_UPLOAD_BYTES — the same cap as a rider's own upload.
 */
export async function downloadFile(
  raw: string,
  rule: HostRule,
  headers: Record<string, string> = {},
): Promise<Uint8Array> {
  let url = allowedUrl(raw, rule);
  if (!url) throw new DeviceHttpError("forbidden_host");
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await send(url, { method: "GET", headers });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await discard(response);
      let next: URL | null = null;
      try {
        next = location ? allowedUrl(new URL(location, url).toString(), rule) : null;
      } catch {
        next = null;
      }
      if (!next) throw new DeviceHttpError("forbidden_host");
      url = next;
      continue;
    }
    if (!response.ok) {
      await discard(response);
      throw new DeviceHttpError("status", response.status);
    }
    return readLimited(response.body, MAX_UPLOAD_BYTES, response.headers.get("content-length"));
  }
  throw new DeviceHttpError("forbidden_host");
}
