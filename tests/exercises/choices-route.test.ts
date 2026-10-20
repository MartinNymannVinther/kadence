import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import type { ExerciseChoice } from "@/modules/workouts/exercise-choice";
import { adminPool } from "../helpers/db";
import { seedPerson } from "../helpers/rows";

/**
 * The route the strength builder reads the library's exercises from: a
 * member of a team gets them in the language asked for, each with its
 * reference; nobody signed in gets nothing, and a language the
 * installation does not have falls back to Danish.
 */

const auth = vi.hoisted(() => ({ session: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => auth.session }));

const { GET } = await import("@/app/api/exercises/choices/route");

const ORG = "org_chr";
const RIDER = { orgId: ORG, userId: "user_chr_rider" };

let admin: Pool;

const get = async (query: string) => {
  const response = await GET(
    new NextRequest(`http://localhost:3000/api/exercises/choices?${query}`),
  );
  return { status: response.status, body: (await response.json()) as ExerciseChoice[] };
};

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, RIDER.userId, "member");
});

afterAll(async () => {
  await admin.end();
});

describe("/api/exercises/choices", () => {
  it("answers nobody signed in with 401", async () => {
    auth.session = null;
    expect((await get("locale=da")).status).toBe(401);
  });

  it("gives a member the library's exercises in the language asked for, with references", async () => {
    auth.session = RIDER;
    const da = await get("locale=da");
    const en = await get("locale=en");
    expect(da.status).toBe(200);
    expect(da.body.find((c) => c.ref === "builtin:catCow")?.name).toBe("Kat og ko");
    expect(en.body.find((c) => c.ref === "builtin:catCow")?.name).toBe("Cat-cow");
  });

  it("falls back to Danish for a language it does not have", async () => {
    auth.session = RIDER;
    const { body } = await get("locale=xx");
    expect(body.find((c) => c.ref === "builtin:catCow")?.name).toBe("Kat og ko");
  });
});
