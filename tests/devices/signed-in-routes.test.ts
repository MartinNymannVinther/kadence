import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { resetRateLimits } from "@/core/rate-limit";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";
import { encodeRide, steadyHour } from "../fit/fixtures";

/**
 * The three ways in that stand on the session (docs/adr/0029): the share
 * target, the question "which of these do you have?" and the upload. Who
 * is signed in is set by the test; everything after that is the routes'
 * own. A request a page on another site sent is refused before anything
 * is read, a body is counted as it arrives, and nobody is told about a
 * rider they may not write for.
 */

const auth = vi.hoisted(() => ({ session: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => auth.session }));

const { POST: share } = await import("@/app/api/share/route");
const { POST: known } = await import("@/app/api/activities/known/route");
const { POST: upload } = await import("@/app/api/activities/upload/route");

const ORG = "org_routes";
const COACH = { orgId: ORG, userId: "user_rt_coach" };
const IDA = { orgId: ORG, userId: "user_rt_ida" };
const PARENT = { orgId: ORG, userId: "user_rt_parent" };
const BASE = "http://localhost:3000";

let admin: Pool;
const ride = encodeRide(steadyHour());
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const rides = async () =>
  (await admin.query("select count(*)::int as n from activities where rider_id = 'rt_ida'")).rows[0]
    .n as number;

function form(files: Array<[string, Uint8Array]>, fields: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  for (const [name, bytes] of files) data.append("file", new File([new Uint8Array(bytes)], name));
  return data;
}

const post = (path: string, body: BodyInit, headers: Record<string, string> = {}) =>
  new Request(`${BASE}${path}`, { method: "POST", headers, body });

/**
 * A body that must not be read. It holds nothing in advance (a high-water
 * mark of zero), so it is asked for bytes only when somebody reads.
 */
function untouchable() {
  let read = false;
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        read = true;
        controller.close();
      },
    },
    { highWaterMark: 0 },
  );
  return { stream, wasRead: () => read };
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [IDA, PARENT]) await seedPerson(admin, ORG, p.userId, "member");
  const r = insertSql("riders", {
    org_id: ORG,
    id: "rt_ida",
    user_id: IDA.userId,
    name: "Ida",
    birth_year: 2008,
  });
  await admin.query(r.text, r.values);
  const g = insertSql("guardians", {
    org_id: ORG,
    rider_id: "rt_ida",
    user_id: PARENT.userId,
    name: "Mor",
    confirmed_at: new Date(),
  });
  await admin.query(g.text, g.values);
});

beforeEach(() => {
  resetRateLimits();
  auth.session = null;
});

afterAll(async () => {
  await admin.end();
});

describe("a ride shared to the installed app", () => {
  it("sends whoever is not signed in to the login", async () => {
    const response = await share(post("/api/share", form([["a.fit", ride]])));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${BASE}/login`);
    expect(await rides()).toBe(0);
  });

  it("is refused when a page on another site sent it, a sibling's included", async () => {
    auth.session = IDA;
    for (const site of ["cross-site", "same-site"]) {
      const body = untouchable();
      const response = await share(
        new Request(`${BASE}/api/share`, {
          method: "POST",
          headers: { "sec-fetch-site": site, "content-type": "multipart/form-data; boundary=x" },
          body: body.stream,
          duplex: "half",
        } as RequestInit),
      );
      expect(response.status, site).toBe(403);
      expect(body.wasRead(), site).toBe(false);
    }
    expect(await rides()).toBe(0);
  });

  it("tells a coach that a share is a rider's, before it reads a byte", async () => {
    auth.session = COACH;
    const body = untouchable();
    const response = await share(
      new Request(`${BASE}/api/share`, {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=x" },
        body: body.stream,
        duplex: "half",
      } as RequestInit),
    );
    expect(response.headers.get("location")).toBe(`${BASE}/today?shared=not_a_rider`);
    expect(body.wasRead()).toBe(false);
  });

  it("comes in for the rider from the share sheet, and from Kadence's own pages", async () => {
    auth.session = IDA;
    const fromSheet = await share(
      post("/api/share", form([["a.fit", ride]]), { "sec-fetch-site": "none" }),
    );
    expect(fromSheet.status).toBe(303);
    expect(fromSheet.headers.get("location")).toMatch(
      new RegExp(`^${BASE}/activities/[0-9a-f-]{36}$`),
    );
    const again = await share(
      post("/api/share", form([["a.fit", ride]]), { "sec-fetch-site": "same-origin" }),
    );
    expect(again.headers.get("location")).toBe(`${BASE}/today?shared=duplicate`);
    expect(await rides()).toBe(1);
  });
});

describe("asking which files Kadence has", () => {
  const ask = (body: unknown, headers: Record<string, string> = {}) =>
    known(
      post("/api/activities/known", JSON.stringify(body), {
        "content-type": "application/json",
        ...headers,
      }),
    );

  it("answers nobody who is not signed in, and no page on another site", async () => {
    expect((await ask({ riderId: "rt_ida", hashes: [sha(ride)] })).status).toBe(401);
    auth.session = IDA;
    const foreign = await ask(
      { riderId: "rt_ida", hashes: [sha(ride)] },
      { "sec-fetch-site": "same-site" },
    );
    expect(foreign.status).toBe(403);
  });

  it("answers the rider and the coach, and tells a parent nothing", async () => {
    const question = { riderId: "rt_ida", hashes: [sha(ride), "0".repeat(64)] };
    for (const who of [IDA, COACH]) {
      auth.session = who;
      const response = await ask(question, { "sec-fetch-site": "same-origin" });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ known: [sha(ride)] });
    }
    auth.session = PARENT;
    const parent = await ask(question);
    expect(parent.status).toBe(403);
    expect(await parent.json()).toEqual({ error: "forbidden" });
  });

  it("counts a body as it arrives, and stops at its cap", async () => {
    auth.session = IDA;
    let sent = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1;
        controller.enqueue(new TextEncoder().encode("x".repeat(16 * 1024)));
      },
    });
    const response = await known(
      new Request(`${BASE}/api/activities/known`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: endless,
        duplex: "half",
      } as RequestInit),
    );
    expect(response.status).toBe(413);
    // 64 KB is the cap: a handful of chunks, not a body without end.
    expect(sent).toBeLessThan(12);
  });

  it("refuses what is no question", async () => {
    auth.session = IDA;
    for (const body of [
      {},
      { riderId: "rt_ida" },
      { riderId: "rt_ida", hashes: [] },
      { riderId: "rt_ida", hashes: ["not-a-hash"] },
      { riderId: "rt_ida", hashes: Array.from({ length: 501 }, () => "0".repeat(64)) },
    ])
      expect((await ask(body)).status, JSON.stringify(body).slice(0, 60)).toBe(400);
    const notJson = await known(post("/api/activities/known", "{not json"));
    expect(notJson.status).toBe(400);
  });
});

describe("the upload", () => {
  it("is refused when a page on another site sent it", async () => {
    auth.session = IDA;
    const before = await rides();
    const response = await upload(
      post(
        "/api/activities/upload",
        form([["b.fit", encodeRide(steadyHour().map((s) => ({ ...s, s: s.s + 86_400 })))]], {
          riderId: "rt_ida",
        }),
        { "sec-fetch-site": "same-site" },
      ),
    );
    expect(response.status).toBe(403);
    expect(await rides()).toBe(before);
  });

  it("keeps a file from a folder under its own name, not its path on the device", async () => {
    auth.session = IDA;
    const bytes = encodeRide(steadyHour().map((s) => ({ ...s, s: s.s + 2 * 86_400 })));
    const response = await upload(
      post(
        "/api/activities/upload",
        form([["Garmin/Activities/2026-09-03-07-00-00.fit", bytes]], { riderId: "rt_ida" }),
        { "sec-fetch-site": "same-origin" },
      ),
    );
    expect(response.status).toBe(200);
    const { results } = (await response.json()) as {
      results: Array<{ name: string; ok: boolean; activityId: string }>;
    };
    expect(results).toMatchObject([{ name: "2026-09-03-07-00-00.fit", ok: true }]);
    const { rows } = await admin.query(
      `select a.title, f.file_name from activities a join activity_files f on f.activity_id = a.id
       where a.id = $1`,
      [results[0]!.activityId],
    );
    expect(rows).toEqual([{ title: "2026-09-03-07-00-00", file_name: "2026-09-03-07-00-00.fit" }]);
  });
});
