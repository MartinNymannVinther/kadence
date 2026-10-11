import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `/api/health` (backlog S-05) splits into liveness (process up, no
 * database) and readiness (the database must answer within two
 * seconds) — Docker's healthcheck and Coolify's panel both point at the
 * readiness one, so it must not hang when the pool is exhausted. When the
 * database answers, the queue of background jobs is counted beside it
 * (docs/adr/0085), and a count that fails never fails the check. The
 * database is a stand-in here: the behaviour pinned is the route's, not
 * Postgres's.
 */

const db = vi.hoisted(() => ({
  query: vi.fn<(sql?: unknown) => Promise<{ rows: unknown[] }>>(async () => ({
    rows: [{ one: 1 }],
  })),
}));
vi.mock("@/core/db/client", () => ({ appPool: db }));

const { GET } = await import("@/app/api/health/route");

const request = (query = "") =>
  new NextRequest(`http://localhost:3000/api/health${query ? `?${query}` : ""}`);

afterEach(() => {
  vi.useRealTimers();
  db.query.mockReset();
  db.query.mockImplementation(async () => ({ rows: [{ one: 1 }] }));
});

describe("liveness", () => {
  it("answers ok without touching the database", async () => {
    const response = await GET(request("live=1"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe("readiness", () => {
  it("answers ok when the database answers, with the queue's counts", async () => {
    db.query.mockImplementation(async (sql?: unknown) =>
      String(sql).includes("from jobs")
        ? { rows: [{ pending: 2, failed: 1, oldest: 42, last: null }] }
        : { rows: [{ one: 1 }] },
    );
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      checks: { db: "ok" },
      jobs: { pending: 2, failed: 1, oldestPendingSeconds: 42 },
    });
  });

  it("answers ok without the counts when the queue cannot be counted", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    db.query.mockImplementation(async (sql?: unknown) => {
      if (String(sql).includes("from jobs"))
        throw Object.assign(new Error("no"), { code: "42P01" });
      return { rows: [{ one: 1 }] };
    });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", checks: { db: "ok" } });
  });

  it("is degraded, 503, when the database refuses", async () => {
    db.query.mockRejectedValueOnce(
      Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" }),
    );
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "degraded" });
  });

  it("is degraded, 503, rather than hanging, when the database never answers", async () => {
    vi.useFakeTimers();
    db.query.mockImplementation(() => new Promise(() => {}));
    const pending = GET(request());
    await vi.advanceTimersByTimeAsync(2001);
    const response = await pending;
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "degraded" });
  });
});
