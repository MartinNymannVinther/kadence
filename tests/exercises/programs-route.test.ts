import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { resetRateLimits } from "@/core/rate-limit";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The download route (docs/plan-ovelser-og-programmer.md): a built-in
 * programme or a "sammensæt dit eget" composition needs no session; a
 * team's own does, and only for a member of that team — a link never
 * says whether a programme exists to anyone else, signed in or not.
 */

const auth = vi.hoisted(() => ({ session: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => auth.session }));

const { GET } = await import("@/app/api/programs/download/route");

const ORG = "org_prx";
const OTHER = "org_prx_other";
const COACH = { orgId: ORG, userId: "user_prx_coach" };
const STRANGER = { orgId: OTHER, userId: "user_prx_stranger" };

let admin: Pool;
let teamProgramId: string;

const get = (query: string) =>
  GET(new NextRequest(`http://localhost:3000/api/programs/download?${query}`));

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, OTHER, STRANGER.userId, "owner");
  teamProgramId = randomUUID();
  const q = insertSql("team_programs", {
    id: teamProgramId,
    org_id: ORG,
    name: "Holdets morgenrutine",
    description: "Fem minutter før træning.",
    parts: [{ key: "any", items: [{ exercise: "builtin:plank" }] }],
  });
  await admin.query(q.text, q.values);
});

beforeEach(async () => {
  await resetRateLimits();
  auth.session = null;
});

afterAll(async () => {
  await admin.end();
});

describe("a built-in programme", () => {
  it("downloads with no session at all", async () => {
    const response = await get("program=builtin:mobilityDay");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="bevaegelighed-hele-dagen.html"',
    );
    const html = await response.text();
    expect(html).toContain("Bevægelighed hele dagen");
  });

  it("is in English with locale=en", async () => {
    const html = await (await get("program=builtin:mobilityDay&locale=en")).text();
    expect(html).toContain("Mobility through the day");
  });

  it("is not found for an id Kadence does not have", async () => {
    expect((await get("program=builtin:nope")).status).toBe(404);
  });
});

describe("a composition", () => {
  it("downloads with no session, built-in exercises only", async () => {
    const response = await get("c=any=plank-t45x2");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Planke");
    expect(html).toContain("2 × 45 sek");
  });

  it("is not found for a composition that does not fit the contract", async () => {
    expect((await get("c=not-a-part=x"))!.status).toBe(404);
  });
});

describe("a team's own programme", () => {
  it("is not found with no session at all", async () => {
    auth.session = null;
    expect((await get(`program=team:${teamProgramId}`)).status).toBe(404);
  });

  it("is not found for somebody on another team", async () => {
    auth.session = STRANGER;
    expect((await get(`program=team:${teamProgramId}`)).status).toBe(404);
  });

  it("is not found for an id that does not exist", async () => {
    auth.session = COACH;
    expect((await get(`program=team:${randomUUID()}`)).status).toBe(404);
  });

  it("downloads for a member of the team", async () => {
    auth.session = COACH;
    const response = await get(`program=team:${teamProgramId}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Holdets morgenrutine");
    expect(html).toContain("Fem minutter før træning.");
  });
});

describe("what is missing or too much", () => {
  it("is a bad request with neither a programme nor a composition", async () => {
    expect((await get("")).status).toBe(400);
  });

  it("is counted per caller", async () => {
    for (let i = 0; i < 120; i++) await get("program=builtin:mobilityDay");
    expect((await get("program=builtin:mobilityDay")).status).toBe(429);
  });
});
