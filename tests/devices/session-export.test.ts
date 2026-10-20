import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { rateLimit, resetRateLimits } from "@/core/rate-limit";
import { decodeFit } from "@/modules/fit";
import { versionSerial } from "@/modules/workouts/export";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A planned session as a file for the bike computer (docs/adr/0031),
 * through the export route: named by its day and its place in the day, a
 * FIT workout whose name begins with the day and whose serial is this
 * version of the session, counted per person, and nothing for whoever may
 * not read the session.
 */

const auth = vi.hoisted(() => ({ session: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => auth.session }));

const { GET } = await import("@/app/api/sessions/[id]/export/route");

const ORG = "org_sx";
const OTHER = "org_sx_other";
const COACH = { orgId: ORG, userId: "user_sx_coach" };
const IDA = { orgId: ORG, userId: "user_sx_ida" };
const STRANGER = { orgId: OTHER, userId: "user_sx_stranger" };
const DAY = "2026-10-06";

const steps = {
  kind: "bike",
  steps: [
    { kind: "step", intent: "warmup", seconds: 600, target: { kind: "zone", zone: 2 } },
    { kind: "step", intent: "work", seconds: 1200, target: { kind: "ftp_pct", low: 88, high: 94 } },
  ],
};

let admin: Pool;

async function session(id: string, values: Record<string, unknown>) {
  const q = insertSql("planned_sessions", {
    org_id: ORG,
    id,
    rider_id: "sx_ida",
    on_date: DAY,
    sport: "bike",
    structure: steps,
    ...values,
  });
  await admin.query(q.text, q.values);
}

const get = (id: string, format = "fit") =>
  GET(new NextRequest(`http://localhost:3000/api/sessions/${id}/export?format=${format}`), {
    params: Promise.resolve({ id }),
  });
const fileName = (response: Response) =>
  /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1];

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, IDA.userId, "member");
  await seedPerson(admin, OTHER, STRANGER.userId, "owner");
  const r = insertSql("riders", {
    org_id: ORG,
    id: "sx_ida",
    user_id: IDA.userId,
    name: "Ida",
    birth_year: 2009,
  });
  await admin.query(r.text, r.values);
  // The day's order: a strength session, then two rides with steps, then one without.
  await session("sx_strength", {
    sport: "strength",
    title: "Styrke",
    sort: 0,
    structure: { kind: "strength", warmup: "", exercises: [], progression: [], minutes: 45 },
  });
  await session("sx_tempo", { title: "Tempo", sort: 1 });
  await session("sx_sprint", { title: "Sprint på bakken", sort: 2 });
  await session("sx_free", { title: "Fri tur", sort: 3, structure: { kind: "bike", steps: [] } });
});

beforeEach(async () => {
  await resetRateLimits();
  auth.session = IDA;
});

afterAll(async () => {
  await admin.end();
});

describe("a session for the bike computer", () => {
  it("is a FIT workout named by its day, the first ride of the day without a number", async () => {
    const response = await get("sx_tempo");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/vnd.ant.fit");
    expect(fileName(response)).toBe("2026-10-06-tempo.fit");
    const fit = decodeFit(new Uint8Array(await response.arrayBuffer()), { strictCrc: true });
    expect(fit.workout?.name).toBe("06.10 Tempo");
  });

  it("gives the day's second ride with steps its number, so the two never meet", async () => {
    const response = await get("sx_sprint");
    expect(fileName(response)).toBe("2026-10-06-2-sprint-paa-bakken.fit");
    const fit = decodeFit(new Uint8Array(await response.arrayBuffer()));
    expect(fit.workout?.name).toBe("06.10-2 Sprint på bakken");
  });

  it("carries a serial for this version, and a new one when the session changes", async () => {
    const before = decodeFit(new Uint8Array(await (await get("sx_tempo")).arrayBuffer()));
    const { rows } = await admin.query(
      "select updated_at from planned_sessions where id = 'sx_tempo'",
    );
    expect(before.serialNumber).toBe(versionSerial("sx_tempo", rows[0].updated_at.getTime()));

    await admin.query(
      "update planned_sessions set updated_at = updated_at + interval '1 minute' where id = 'sx_tempo'",
    );
    const after = decodeFit(new Uint8Array(await (await get("sx_tempo")).arrayBuffer()));
    expect(after.serialNumber).not.toBe(before.serialNumber);
    expect(after.workout?.name).toBe(before.workout?.name);
  });

  it("is named by its day in every format", async () => {
    expect(fileName(await get("sx_tempo", "zwo"))).toBe("2026-10-06-tempo.zwo");
    expect(fileName(await get("sx_sprint", "mrc"))).toBe("2026-10-06-2-sprint-paa-bakken.mrc");
  });

  it("is nothing for a ride without steps, and nothing for another sport", async () => {
    expect((await get("sx_free")).status).toBe(400);
    expect((await get("sx_strength")).status).toBe(400);
  });
});

describe("who may have it", () => {
  it("is the rider and the coach, and nobody who is not signed in or not on the team", async () => {
    auth.session = COACH;
    expect((await get("sx_tempo")).status).toBe(200);
    auth.session = null;
    expect((await get("sx_tempo")).status).toBe(401);
    auth.session = STRANGER;
    expect((await get("sx_tempo")).status).toBe(404);
  });

  it("is counted: a week is seven files, three hundred an hour is not a week", async () => {
    for (let i = 0; i < 300; i++)
      await rateLimit(`session-export:${IDA.userId}`, 300, 60 * 60 * 1000);
    expect((await get("sx_tempo")).status).toBe(429);
    auth.session = COACH;
    expect((await get("sx_tempo")).status).toBe(200);
  });
});
