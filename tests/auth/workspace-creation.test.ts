import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { auth } from "@/core/auth/auth";
import { registerUserWithOrganization } from "@/core/auth/register";
import { adminPool } from "../helpers/db";

/**
 * Better Auth's own endpoint holds the rule (docs/adr/0048): a person who
 * already has a club cannot create another, and the installation's owner
 * can. The registration that creates a person's first club still works.
 */

const PASSWORD = "en-meget-lang-kode-123";
let admin: Pool;

async function signIn(email: string): Promise<Headers> {
  const { headers } = await auth.api.signInEmail({
    body: { email, password: PASSWORD },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

const create = (headers: Headers, name: string) =>
  auth.api.createOrganization({ body: { name, slug: `${name}-${Date.now()}` }, headers });

beforeAll(async () => {
  admin = adminPool();
  for (const [email, org] of [
    ["wc-owner@example.com", "Ejerens hold"],
    ["wc-coach@example.com", "Trænerens hold"],
  ] as const) {
    const result = await registerUserWithOrganization(new Headers(), {
      name: "Tester",
      email,
      password: PASSWORD,
      organizationName: org,
    });
    expect(result).toEqual({ ok: true });
  }
  await admin.query(
    `update users set platform_role = 'owner' where email = 'wc-owner@example.com'`,
  );
});

afterAll(async () => {
  await admin?.end();
});

describe("creating a workspace through Better Auth", () => {
  it("registration created each person's first club", async () => {
    const rows = await admin.query(
      `select count(*)::int as n from memberships m join users u on u.id = m.user_id
       where u.email in ('wc-owner@example.com', 'wc-coach@example.com')`,
    );
    expect(rows.rows[0].n).toBe(2);
  });

  it("a coach with a club cannot create another", async () => {
    const headers = await signIn("wc-coach@example.com");
    await expect(create(headers, "andet-hold")).rejects.toThrow();
  });

  it("the installation's owner can, and the club opened last is remembered", async () => {
    const headers = await signIn("wc-owner@example.com");
    const org = await create(headers, "nyt-hold");
    expect(org?.id).toBeTruthy();
    await auth.api.setActiveOrganization({ body: { organizationId: org!.id }, headers });
    const rows = await admin.query(
      `select last_active_at from memberships where organization_id = $1`,
      [org!.id],
    );
    expect(rows.rows[0].last_active_at).not.toBeNull();
  });
});
