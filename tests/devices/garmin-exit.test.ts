import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { auth } from "@/core/auth/auth";
import { saveLink } from "@/modules/devices/links";
import { deleteAccountIfAlone } from "@/modules/export/account";
import { deleteWorkspace } from "@/modules/export/workspace";
import { eraseRider } from "@/modules/team/riders";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";
import { fakeFetch, withProviderKeys } from "./fake-fetch";

/**
 * Garmin is told to forget a rider whenever the rider leaves Kadence
 * (docs/adr/0113): before a workspace is deleted, before a coach erases a
 * rider, and before a person deletes their account — not only when they
 * press "Afbryd". The deletion never waits on Garmin and never fails for
 * it, and a token is never written to the log.
 */

const REGISTRATION = "DELETE https://apis.garmin.com/partner-gateway/rest/user/registration";
const NAME = "Garmin-holdet";

let admin: Pool;
let restore: () => void;

async function riderWithGarmin(orgId: string, who: string, role: "owner" | "member" = "member") {
  const person = await seedPerson(admin, orgId, `user_gx_${who}`, role, NAME);
  const q = insertSql("riders", {
    org_id: orgId,
    id: `gx_${who}`,
    user_id: person.userId,
    name: who,
    birth_year: 2008,
  });
  await admin.query(q.text, q.values);
  await saveLink(
    person,
    "garmin",
    `gx-${who}`,
    {
      accessToken: `acc-${who}`,
      refreshToken: `ref-${who}`,
      expiresAt: new Date(Date.now() + 3600_000),
    },
    ["ACTIVITY_EXPORT"],
  );
  return person;
}

const linkCount = async (riderId: string) =>
  (await admin.query("select count(*)::int as n from device_links where rider_id = $1", [riderId]))
    .rows[0].n as number;

beforeAll(async () => {
  restore = withProviderKeys();
  admin = adminPool();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

afterAll(async () => {
  restore();
  await admin.end();
});

describe("deleting a workspace", () => {
  it("tells Garmin about every rider's link first, as each rider", async () => {
    const owner = await seedPerson(admin, "org_gx_ws", "user_gx_ws_owner", "owner", NAME);
    await riderWithGarmin("org_gx_ws", "rina");
    await riderWithGarmin("org_gx_ws", "rune");
    vi.spyOn(auth.api, "getFullOrganization").mockResolvedValue({ name: NAME } as never);
    const calls = fakeFetch({ [REGISTRATION]: () => new Response(null, { status: 204 }) });
    expect(await deleteWorkspace(owner, NAME, new Headers())).toBe("deleted");
    expect(calls.map((c) => c.headers.get("authorization")).sort()).toEqual([
      "Bearer acc-rina",
      "Bearer acc-rune",
    ]);
    expect(await linkCount("gx_rina")).toBe(0);
  });

  it("asks Garmin nothing for a member who is not the owner", async () => {
    await seedPerson(admin, "org_gx_ws2", "user_gx_ws2_owner", "owner", NAME);
    const member = await riderWithGarmin("org_gx_ws2", "sara");
    vi.spyOn(auth.api, "getFullOrganization").mockResolvedValue({ name: NAME } as never);
    const calls = fakeFetch({ [REGISTRATION]: () => new Response(null, { status: 204 }) });
    expect(await deleteWorkspace(member, NAME, new Headers())).toBe("notOwner");
    expect(calls).toHaveLength(0);
    expect(await linkCount("gx_sara")).toBe(1);
  });

  it("goes on when Garmin fails, and logs no token", async () => {
    const owner = { orgId: "org_gx_ws2", userId: "user_gx_ws2_owner" };
    vi.spyOn(auth.api, "getFullOrganization").mockResolvedValue({ name: NAME } as never);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fakeFetch({ [REGISTRATION]: () => new Response("down", { status: 503 }) });
    expect(await deleteWorkspace(owner, NAME, new Headers())).toBe("deleted");
    expect(await linkCount("gx_sara")).toBe(0);
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain("garmin was not told");
    expect(logged).not.toContain("acc-sara");
  });
});

describe("erasing a rider", () => {
  it("tells Garmin first, then erases the rider and the link with them", async () => {
    const coach = await seedPerson(admin, "org_gx_er", "user_gx_er_coach", "owner");
    await riderWithGarmin("org_gx_er", "tor");
    await riderWithGarmin("org_gx_er", "uma");
    const calls = fakeFetch({ [REGISTRATION]: () => new Response(null, { status: 204 }) });
    await eraseRider(coach, "gx_tor");
    expect(calls.map((c) => c.headers.get("authorization"))).toEqual(["Bearer acc-tor"]);
    expect(await linkCount("gx_tor")).toBe(0);
    expect(await linkCount("gx_uma")).toBe(1);
  });

  it("asks Garmin nothing when the caller may not erase", async () => {
    const calls = fakeFetch({ [REGISTRATION]: () => new Response(null, { status: 204 }) });
    await expect(
      eraseRider({ orgId: "org_gx_er", userId: "user_gx_uma" }, "gx_uma"),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(calls).toHaveLength(0);
  });
});

describe("deleting an account", () => {
  it("tells Garmin about the person's link on a team they left, and deletes it", async () => {
    await seedPerson(admin, "org_gx_left", "user_gx_left_coach", "owner");
    const person = await riderWithGarmin("org_gx_left", "vik");
    await admin.query("delete from memberships where user_id = $1", [person.userId]);
    const calls = fakeFetch({ [REGISTRATION]: () => new Response(null, { status: 204 }) });
    expect(await deleteAccountIfAlone(person.userId)).toBe(true);
    expect(calls.map((c) => c.headers.get("authorization"))).toEqual(["Bearer acc-vik"]);
    expect(await linkCount("gx_vik")).toBe(0);
    const rider = await admin.query("select user_id from riders where id = 'gx_vik'");
    expect(rider.rows).toEqual([{ user_id: null }]);
  });
});
