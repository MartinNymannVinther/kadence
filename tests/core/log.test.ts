import { afterEach, describe, expect, it, vi } from "vitest";
import { errorName, log, randomRequestId, requestIdFrom } from "@/core/log";

/**
 * `src/core/log.ts` is what replaced the bare `console.*` calls in
 * `src/core` and `src/modules` (backlog S-05). Pinned here: it never
 * throws for want of a request id, it reads one off a header when it has
 * one, it is readable in development and one JSON line in production.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("requestIdFrom", () => {
  it("reads the header a request already carries", () => {
    expect(requestIdFrom(new Headers({ "x-request-id": "abc123" }))).toBe("abc123");
  });

  it("makes a fresh one when there is none", () => {
    const id = requestIdFrom(new Headers());
    expect(id.length).toBeGreaterThan(0);
  });
});

describe("randomRequestId", () => {
  it("is not the same twice in a row", () => {
    expect(randomRequestId()).not.toBe(randomRequestId());
  });
});

describe("errorName", () => {
  it("never carries a message — only the error's name", () => {
    expect(errorName(new TypeError("the user's address was x@y.dk"))).toBe("TypeError");
    expect(errorName("a string is not an Error")).toBe("unknown");
    expect(errorName(undefined)).toBe("unknown");
  });
});

describe("log in development", () => {
  it("prints a readable line with the event and the given request id", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await log.error("thing: failed", { requestId: "req-1", detail: "why" });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0]![0] as string;
    expect(line).toContain("ERROR thing: failed");
    expect(line).toContain("[req-1]");
    expect(line).toContain('"detail":"why"');
  });

  it("has no request id section outside a request, and still logs", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // No `requestId` field, and this test runs outside any HTTP request,
    // so there is nothing for `next/headers` to read — the line still
    // comes out, just without a request id.
    await log.warn("thing: odd", { count: 3 });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0]![0] as string;
    expect(line).toBe('WARN thing: odd {"count":3}');
  });

  it("drops the trailing object when there are no fields", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await log.info("thing: started");
    expect(spy).toHaveBeenCalledWith("INFO thing: started");
  });
});

describe("log in production", () => {
  it("prints one JSON line with ts, level, event, requestId and the fields", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await log.error("thing: failed", { requestId: "req-2", code: "ECONN" });
    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(parsed).toMatchObject({
      level: "error",
      event: "thing: failed",
      requestId: "req-2",
      code: "ECONN",
    });
    expect(typeof parsed.ts).toBe("string");
  });
});
