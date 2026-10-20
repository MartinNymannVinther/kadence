import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { auth, TEAM_INVITATION_DAYS } from "@/core/auth/auth";
import { registerUserWithOrganization } from "@/core/auth/register";
import type { OrgContext } from "@/core/db/tenant";
import { inviteMember } from "@/core/team/service";
import { bulkInvite } from "@/modules/team/bulk-invite";
import { adminPool } from "../helpers/db";

/**
 * An invitation link works for a week (docs/adr/0064, backlog P2-15), not
 * Better Auth's 48 hours: one at a time, from "Inviter hele holdet", and
 * in the row the "Del" text and "Links, der venter" read the date from.
 */

const PASSWORD = "en-meget-lang-kode-123";
const DAY_MS = 24 * 60 * 60 * 1000;
let admin: Pool;
let coach: OrgContext;
let headers: Headers;

beforeAll(async () => {
  admin = adminPool();
  const email = "expiry-coach@example.com";
  await registerUserWithOrganization(new Headers(), {
    name: "Træner",
    email,
    password: PASSWORD,
    organizationName: "Ugelinks U17",
  });
  const signedIn = await auth.api.signInEmail({
    body: { email, password: PASSWORD },
    returnHeaders: true,
  });
  const cookie = signedIn.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  headers = new Headers({ cookie });
  const org = await admin.query("select id from organizations where name = 'Ugelinks U17'");
  const user = await admin.query("select id from users where email = $1", [email]);
  coach = { orgId: org.rows[0].id, userId: user.rows[0].id };
});

afterAll(async () => {
  await admin.end();
});

/** Whether `at` is a week after `from`, give or take the minute a test takes. */
function aWeekAfter(from: number, at: Date) {
  const days = (at.getTime() - from) / DAY_MS;
  expect(days).toBeGreaterThan(TEAM_INVITATION_DAYS - 0.01);
  expect(days).toBeLessThan(TEAM_INVITATION_DAYS + 0.01);
}

describe("an invitation link", () => {
  it("is a week", () => {
    expect(TEAM_INVITATION_DAYS).toBe(7);
  });

  it("expires a week out, one at a time", async () => {
    const before = Date.now();
    const result = await inviteMember(headers, { email: "expiry-one@example.com", role: "member" });
    if (!result.ok) throw new Error(result.error);
    aWeekAfter(before, result.invitation.expiresAt);
    const row = await admin.query("select expires_at from invitations where id = $1", [
      result.invitation.id,
    ]);
    aWeekAfter(before, row.rows[0].expires_at);
  });

  it("expires a week out from the whole team's list, as the share text says", async () => {
    const before = Date.now();
    const outcome = await bulkInvite(coach, headers, {
      text: "Uge Rytter, 2010, expiry-rider@example.com; Uge Mor, expiry-mor@example.com",
      sharedYear: null,
    });
    if (!outcome.done) throw new Error(JSON.stringify(outcome));
    const [line] = outcome.lines;
    const links = [line?.rider.link, line?.parents[0]?.link];
    expect(links.every(Boolean)).toBe(true);
    for (const link of links) aWeekAfter(before, new Date(link!.expiresAt));
  });
});
