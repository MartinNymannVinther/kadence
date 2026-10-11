import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `/api/health` (backlog S-05) splits into liveness (process up, no
 * database) and readiness (the database must answer within two
 * seconds) — Docker's healthcheck and Coolify's panel both point at the
 * readiness one, so it must not hang when the pool is exhausted. The
 * database is a stand-in here: the behaviour pinned is the route's, not
 * Postgres's.
 */

const db = vi.hoisted(() => ({ query: vi.fn(async () => ({ rows: [{ one: 1 }] })) }));
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
  it("answers ok when the database answers", async () => {
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
