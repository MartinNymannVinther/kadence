import { vi } from "vitest";
import { env } from "@/core/env";

/**
 * A stand-in for the providers: `fetch` is replaced by a router keyed on
 * "METHOD https://host/path" (the query left off), every call is recorded
 * with its headers and body, and anything unrouted answers 404 — so a
 * test that expects no call to a host can say so, and a call Kadence
 * should never make shows up as a failure rather than a network request.
 */

export type Call = { url: string; method: string; headers: Headers; body: string | null };
export type Route = (call: Call) => Response | Promise<Response>;

export function fakeFetch(routes: Record<string, Route>): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method ?? "GET").toUpperCase();
      const raw = init?.body;
      const body =
        raw === undefined || raw === null
          ? null
          : typeof raw === "string"
            ? raw
            : raw instanceof URLSearchParams
              ? raw.toString()
              : String(raw);
      const call = { url, method, headers: new Headers(init?.headers), body };
      calls.push(call);
      const route = routes[`${method} ${url.split("?")[0]}`];
      return route ? route(call) : new Response("not routed", { status: 404 });
    }),
  );
  return calls;
}

export const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const bytes = (value: Uint8Array) =>
  new Response(new Uint8Array(value), {
    status: 200,
    headers: { "Content-Type": "application/octet-stream" },
  });

export const WEBHOOK_TOKEN = "wahoo-webhook-token-for-tests";
export const POLAR_SECRET = "polar-signature-secret-for-tests";

const KEYS = {
  WAHOO_CLIENT_ID: "wahoo-client",
  WAHOO_CLIENT_SECRET: "wahoo-secret",
  WAHOO_WEBHOOK_TOKEN: WEBHOOK_TOKEN,
  GARMIN_CLIENT_ID: "garmin-client",
  GARMIN_CLIENT_SECRET: "garmin-secret",
  POLAR_CLIENT_ID: "polar-client",
  POLAR_CLIENT_SECRET: "polar-secret",
  POLAR_WEBHOOK_SECRET: POLAR_SECRET,
} as const;

/**
 * Gives every provider keys for the length of a test file. The suite's
 * environment has none (vitest.config.mts), which is the shipped default;
 * `env` is read at call time by the adapters, so setting it here is
 * enough, and it is put back afterwards.
 */
export function withProviderKeys(): () => void {
  const before = Object.fromEntries(Object.keys(KEYS).map((k) => [k, env[k as keyof typeof KEYS]]));
  Object.assign(env, KEYS);
  return () => Object.assign(env, before);
}

/** Form fields of a recorded call, as a plain object. */
export function formOf(call: Call): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(call.body ?? ""));
}
