import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { appPool } from "@/core/db/client";
import {
  addressBehind,
  callerKey,
  peekRateLimit,
  rateLimit,
  resetRateLimits,
  SHARED_BUCKET,
} from "@/core/rate-limit";
import { adminPool } from "../helpers/db";

/**
 * The limiter guarding the doors. Its counts live in the database
 * (src/core/counters.ts, docs/adr/0083), so these run against it: the
 * window, its end, asking without counting, two instances sharing one
 * count, and the answer when the database does not answer.
 */

const admin = adminPool();
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => resetRateLimits());
afterAll(() => admin.end());

describe("rateLimit", () => {
  it("allows up to the limit and refuses the one after", async () => {
    for (let i = 0; i < 5; i++) expect((await rateLimit("a", 5, 60_000)).allowed).toBe(true);
    const refused = await rateLimit("a", 5, 60_000);
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
    expect(refused.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("counts each key on its own", async () => {
    for (let i = 0; i < 5; i++) await rateLimit("a", 5, 60_000);
    expect((await rateLimit("b", 5, 60_000)).allowed).toBe(true);
  });

  it("forgets a key once its window has passed", async () => {
    expect((await rateLimit("c", 1, 50)).allowed).toBe(true);
    expect((await rateLimit("c", 1, 50)).allowed).toBe(false);
    await pause(80);
    expect((await rateLimit("c", 1, 50)).allowed).toBe(true);
  });

  it("keeps its count in the database, where every instance reads it", async () => {
    await rateLimit("shared", 3, 60_000);
    await rateLimit("shared", 3, 60_000);
    const { rows } = await admin.query(
      "select count, reset_at > now() as open from app_rate_limits where key = 'shared'",
    );
    expect(rows).toEqual([{ count: 2, open: true }]);
  });

  it("is one count for two instances: a second copy of the module goes on from the first", async () => {
    const first = await import("@/core/rate-limit");
    await first.rateLimit("two", 2, 60_000);
    vi.resetModules();
    const second = await import("@/core/rate-limit");
    expect(second).not.toBe(first);
    expect((await second.rateLimit("two", 2, 60_000)).allowed).toBe(true);
    expect((await first.rateLimit("two", 2, 60_000)).allowed).toBe(false);
    expect((await second.peekRateLimit("two", 2)).allowed).toBe(false);
  });

  it("counts every one of many at once, with none lost between them", async () => {
    const answers = await Promise.all(
      Array.from({ length: 20 }, () => rateLimit("crowd", 10, 60_000)),
    );
    expect(answers.filter((a) => a.allowed)).toHaveLength(10);
  });

  it("refuses, with a short wait, when the database does not answer", async () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const sweep = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const down = vi.spyOn(appPool, "query").mockRejectedValue(new Error("connection refused"));
    try {
      expect(await rateLimit("down", 100, 60_000)).toEqual({
        allowed: false,
        retryAfterSeconds: 5,
      });
      expect(await peekRateLimit("down", 100)).toEqual({ allowed: false, retryAfterSeconds: 5 });
      // By name only: a database error's message carries its parameters.
      expect(quiet).toHaveBeenCalledWith("rate-limit: the counters did not answer", "Error");
    } finally {
      down.mockRestore();
      quiet.mockRestore();
      sweep.mockRestore();
    }
  });
});

describe("peekRateLimit", () => {
  it("answers without counting, so asking is free", async () => {
    for (let i = 0; i < 20; i++) expect((await peekRateLimit("p", 2)).allowed).toBe(true);
    expect((await rateLimit("p", 2, 60_000)).allowed).toBe(true);
    expect((await rateLimit("p", 2, 60_000)).allowed).toBe(true);
    const full = await peekRateLimit("p", 2);
    expect(full.allowed).toBe(false);
    expect(full.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("opens again once the window has passed", async () => {
    await rateLimit("q", 1, 50);
    expect((await peekRateLimit("q", 1)).allowed).toBe(false);
    await pause(80);
    expect((await peekRateLimit("q", 1)).allowed).toBe(true);
  });
});

describe("callerKey", () => {
  /**
   * Read from the right, not the left. X-Forwarded-For is a list a proxy
   * appends to, so the leftmost entry is whatever the caller sent. This
   * test used to assert the opposite, and while it did, one header on
   * one curl bought a fresh bucket on every request and every limit in
   * the app was decoration.
   */
  it("reads the address our own proxy appended, not the one the caller sent", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" });
    expect(callerKey(headers, "share")).toBe("share:203.0.113.7");
  });

  it("is not fooled by a caller who supplies a whole chain of their own", () => {
    const forged = new Headers({
      "x-forwarded-for": "9.9.9.9, 8.8.8.8, 7.7.7.7, 203.0.113.7",
    });
    // The last entry is the one Traefik wrote; everything before it is
    // the caller's fiction, and changing it must not change the bucket.
    expect(callerKey(forged, "share")).toBe("share:203.0.113.7");
  });

  it("takes a single entry as the proxy's own", () => {
    expect(callerKey(new Headers({ "x-forwarded-for": "203.0.113.7" }), "share")).toBe(
      "share:203.0.113.7",
    );
  });

  it("falls back to x-real-ip, and then to one shared bucket", () => {
    expect(callerKey(new Headers({ "x-real-ip": "203.0.113.9" }), "share")).toBe(
      "share:203.0.113.9",
    );
    // No header at all: everyone shares a bucket, which fails closed.
    expect(callerKey(new Headers(), "share")).toBe(`share:${SHARED_BUCKET}`);
  });
});

/**
 * The hops, one at a time (backlog P2-08). TRUSTED_PROXY_HOPS used to
 * treat 0 as 1, so an installation with nothing in front believed the
 * one entry the caller sent — a bucket of the caller's choosing on every
 * public route, the upload key's door included. And no entry was ever
 * checked to be an address.
 */
describe("addressBehind", () => {
  const forwarded = (value: string) => new Headers({ "x-forwarded-for": value });

  describe("with no proxy in front (0 hops)", () => {
    it("reads no forwarded header at all: every entry is the caller's own", () => {
      expect(addressBehind(forwarded("203.0.113.7"), 0)).toBe(SHARED_BUCKET);
      expect(addressBehind(forwarded("9.9.9.9, 203.0.113.7"), 0)).toBe(SHARED_BUCKET);
      expect(addressBehind(new Headers({ "x-real-ip": "203.0.113.9" }), 0)).toBe(SHARED_BUCKET);
    });

    it("gives every caller the same bucket, so a forged header buys nothing", () => {
      const keys = new Set(
        ["1.1.1.1", "2.2.2.2", "3.3.3.3"].map((ip) => addressBehind(forwarded(ip), 0)),
      );
      expect(keys).toEqual(new Set([SHARED_BUCKET]));
    });
  });

  describe("behind one proxy (1 hop)", () => {
    it("takes the last entry, the one the proxy appended", () => {
      expect(addressBehind(forwarded("203.0.113.7"), 1)).toBe("203.0.113.7");
      expect(addressBehind(forwarded("9.9.9.9, 8.8.8.8, 203.0.113.7"), 1)).toBe("203.0.113.7");
    });

    it("takes an IPv6 address as it is", () => {
      expect(addressBehind(forwarded("2001:db8::1"), 1)).toBe("2001:db8::1");
      expect(addressBehind(forwarded("1.2.3.4, ::ffff:203.0.113.7"), 1)).toBe("::ffff:203.0.113.7");
    });

    it("falls back to x-real-ip when the list is empty", () => {
      expect(
        addressBehind(new Headers({ "x-forwarded-for": "", "x-real-ip": "203.0.113.9" }), 1),
      ).toBe("203.0.113.9");
      expect(addressBehind(new Headers(), 1)).toBe(SHARED_BUCKET);
    });
  });

  describe("behind two proxies (2 hops)", () => {
    it("takes the second entry from the end", () => {
      expect(addressBehind(forwarded("9.9.9.9, 203.0.113.7, 10.0.0.2"), 2)).toBe("203.0.113.7");
      expect(addressBehind(forwarded("203.0.113.7, 10.0.0.2"), 2)).toBe("203.0.113.7");
    });

    it("does not let the caller's own entry stand in for a missing proxy", () => {
      // One entry only: one proxy wrote it, the other is missing, so the
      // list is shorter than the hops. The caller's fiction is never
      // reached for; x-real-ip or the shared bucket instead.
      expect(addressBehind(forwarded("9.9.9.9"), 2)).toBe(SHARED_BUCKET);
      expect(
        addressBehind(new Headers({ "x-forwarded-for": "9.9.9.9", "x-real-ip": "203.0.113.9" }), 2),
      ).toBe("203.0.113.9");
    });
  });

  describe("garbage in the header", () => {
    it.each([
      ["a word", "evil"],
      ["an address with a port", "203.0.113.7:4321"],
      ["a bracketed IPv6", "[2001:db8::1]"],
      ["a number", "12345"],
      ["an address with a prefix length", "203.0.113.0/24"],
      ["a hostname", "proxy.example.com"],
      ["nonsense", "' or 1=1 --"],
    ])("%s lands in the shared bucket rather than in a bucket of its own", (_, value) => {
      expect(addressBehind(forwarded(value), 1)).toBe(SHARED_BUCKET);
      expect(addressBehind(forwarded(`1.2.3.4, ${value}`), 1)).toBe(SHARED_BUCKET);
      expect(addressBehind(forwarded(`${value}, 10.0.0.2`), 2)).toBe(SHARED_BUCKET);
    });

    it("does not fall back to x-real-ip past a proxy entry that is not an address", () => {
      // The entry at the proxy's place is there but unusable, so the
      // proxy did not write it; x-real-ip is not believed instead.
      expect(
        addressBehind(new Headers({ "x-forwarded-for": "evil", "x-real-ip": "203.0.113.9" }), 1),
      ).toBe(SHARED_BUCKET);
    });

    it("checks x-real-ip the same way", () => {
      expect(addressBehind(new Headers({ "x-real-ip": "evil" }), 1)).toBe(SHARED_BUCKET);
      expect(addressBehind(new Headers({ "x-real-ip": "203.0.113.9:80" }), 1)).toBe(SHARED_BUCKET);
    });
  });
});
