import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { auth } from "@/core/auth/auth";
import { registerUserWithOrganization } from "@/core/auth/register";
import type { OrgContext } from "@/core/db/tenant";
import { registerInvited } from "@/core/team/register";
import { inviteMember } from "@/core/team/service";
import { whoAmI } from "@/modules/team/access";
import {
  addGuardian,
  attachGuardianInvitation,
  confirmGuardian,
  listGuardians,
} from "@/modules/team/guardians";
import {
  attachRiderInvitation,
  createRider,
  getRiders,
  setSharing,
  setThresholds,
} from "@/modules/team/riders";
import { adminPool } from "../helpers/db";

/**
 * The team end to end, through the real Better Auth instance: a coach
 * registers, adds a rider and a parent and sends each an invitation; the
 * rider and the parent join through their links and land on the rows
 * prepared for them; the rider confirms the parent. Then the services'
 * own checks: who may add a rider, set thresholds, change the sharing and
 * confirm a guardian (docs/adr/0010, 0011).
 */

const PASSWORD = "en-meget-lang-kode-123";
let admin: Pool;
let coachHeaders: Headers;
let coach: OrgContext;
let rider: OrgContext;
let parent: OrgContext;
let riderId: string;
let otherRiderId: string;
let guardianId: string;

function cookieHeaderFrom(responseHeaders: Headers): Headers {
  const cookie = responseHeaders
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  return new Headers({ cookie });
}

async function userId(email: string): Promise<string> {
  const row = await admin.query("select id from users where email = $1", [email]);
  return row.rows[0].id;
}

beforeAll(async () => {
  admin = adminPool();
  await registerUserWithOrganization(new Headers(), {
    name: "Træner",
    email: "roles-coach@example.com",
    password: PASSWORD,
    organizationName: "Rollehold U19",
  });
  const { headers } = await auth.api.signInEmail({
    body: { email: "roles-coach@example.com", password: PASSWORD },
    returnHeaders: true,
  });
  coachHeaders = cookieHeaderFrom(headers);
  const org = await admin.query("select id from organizations where name = 'Rollehold U19'");
  coach = { orgId: org.rows[0].id, userId: await userId("roles-coach@example.com") };
});

afterAll(async () => {
  await admin.end();
});

describe("joining as a rider and as a parent", () => {
  it("links the rider to the row the coach prepared", async () => {
    riderId = (
      await createRider(coach, { name: "Emma", birthYear: 2009, sex: null, categoryOverride: null })
    ).id;
    otherRiderId = (
      await createRider(coach, {
        name: "Oskar",
        birthYear: 2008,
        sex: null,
        categoryOverride: null,
      })
    ).id;
    const invited = await inviteMember(coachHeaders, {
      email: "roles-emma@example.com",
      role: "member",
    });
    if (!invited.ok) throw new Error(invited.error);
    await attachRiderInvitation(coach, riderId, invited.invitation.id);

    const joined = await registerInvited(new Headers(), {
      invitationId: invited.invitation.id,
      name: "Emma",
      password: PASSWORD,
    });
    expect(joined.ok).toBe(true);
    rider = { orgId: coach.orgId, userId: await userId("roles-emma@example.com") };

    const me = await whoAmI(rider.orgId, rider.userId);
    expect(me).toMatchObject({
      role: "member",
      isCoach: false,
      rider: { id: riderId, name: "Emma" },
    });
    expect((await getRiders(rider)).map((r) => r.id)).toEqual([riderId]);
  });

  it("links the parent, who sees nothing until the rider confirms", async () => {
    guardianId = (await addGuardian(coach, { riderId, name: "Mor", relation: "mother" })).id;
    const invited = await inviteMember(coachHeaders, {
      email: "roles-mor@example.com",
      role: "member",
    });
    if (!invited.ok) throw new Error(invited.error);
    await attachGuardianInvitation(coach, guardianId, invited.invitation.id);
    await registerInvited(new Headers(), {
      invitationId: invited.invitation.id,
      name: "Mor",
      password: PASSWORD,
    });
    parent = { orgId: coach.orgId, userId: await userId("roles-mor@example.com") };

    const before = await whoAmI(parent.orgId, parent.userId);
    expect(before?.children).toEqual([{ guardianId, riderId, name: null, confirmed: false }]);
    expect(await getRiders(parent)).toEqual([]);

    await confirmGuardian(rider, guardianId);
    const after = await whoAmI(parent.orgId, parent.userId);
    expect(after?.children).toEqual([{ guardianId, riderId, name: "Emma", confirmed: true }]);
    expect((await getRiders(parent)).map((r) => r.name)).toEqual(["Emma"]);
  });
});

describe("the services' own checks", () => {
  it("lets only a coach add a rider", async () => {
    await expect(
      createRider(rider, { name: "x", birthYear: 2009, sex: null, categoryOverride: null }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      createRider(parent, { name: "x", birthYear: 2009, sex: null, categoryOverride: null }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("lets a rider set their own thresholds and nobody else's", async () => {
    const t = {
      ftpWatts: 250,
      thresholdHr: 178,
      maxHr: 200,
      restingHr: 45,
      thresholdsOn: "2026-10-01",
    };
    await setThresholds(rider, riderId, t);
    await expect(setThresholds(rider, otherRiderId, t)).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(setThresholds(parent, riderId, t)).rejects.toMatchObject({ code: "forbidden" });
    await setThresholds(coach, otherRiderId, t);
  });

  it("lets only the rider decide what the parents see", async () => {
    await setSharing(rider, { shareTraining: true, shareWellbeing: true });
    await expect(
      setSharing(coach, { shareTraining: false, shareWellbeing: false }),
    ).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(
      setSharing(parent, { shareTraining: true, shareWellbeing: true }),
    ).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("lets only the rider confirm a parent, and only one who has joined", async () => {
    const other = (await addGuardian(coach, { riderId, name: "Far", relation: "father" })).id;
    await expect(confirmGuardian(coach, other)).rejects.toMatchObject({ code: "forbidden" });
    await expect(confirmGuardian(parent, other)).rejects.toMatchObject({ code: "forbidden" });
    await expect(confirmGuardian(rider, other)).rejects.toMatchObject({
      code: "conflict",
      detail: "notJoined",
    });
    const links = await listGuardians(coach, riderId);
    expect(links.filter((g) => g.confirmedAt !== null)).toHaveLength(1);
    expect(links.find((g) => g.id === guardianId)?.accountEmail).toBe("roles-mor@example.com");
  });
});
