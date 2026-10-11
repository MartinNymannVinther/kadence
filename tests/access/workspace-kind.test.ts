import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { auth, bodyNamesKind } from "@/core/auth/auth";
import { adminPool } from "../helpers/db";

/**
 * What a workspace is — a club or one person's own training
 * (docs/adr/0080) — is set by our own code only: Better Auth refuses a
 * body that names it, on create and on update.
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

beforeAll(() => {
  admin = adminPool();
});

afterAll(async () => {
  await admin.query(
    `delete from organizations where id in (
       select organization_id from memberships m join users u on u.id = m.user_id
       where u.email = 'uden@workspace-kind.example')`,
  );
  await admin.query("delete from users where email = 'uden@workspace-kind.example'");
  await admin.end();
});

describe("what a workspace is", () => {
  it("is never taken from a request body", () => {
    expect(bodyNamesKind({ name: "x", kind: "personal" })).toBe(true);
    expect(bodyNamesKind({ data: { kind: "club" }, organizationId: "o" })).toBe(true);
    expect(bodyNamesKind({ name: "x", slug: "x" })).toBe(false);
    expect(bodyNamesKind(null)).toBe(false);
  });

  it("Better Auth refuses to create or update a workspace with a kind in the body", async () => {
    await auth.api.signUpEmail({
      body: { name: "Uden Hold", email: "uden@workspace-kind.example", password: PASSWORD },
    });
    const headers = await signIn("uden@workspace-kind.example");
    await expect(
      auth.api.createOrganization({
        body: { name: "Snyd", slug: `snyd-${Date.now()}`, kind: "personal" } as never,
        headers,
      }),
    ).rejects.toMatchObject({ body: { code: "WORKSPACE_KIND_NOT_SETTABLE" } });
    const created = await auth.api.createOrganization({
      body: { name: "Ærligt", slug: `aerligt-${Date.now()}` },
      headers,
    });
    const { rows } = await admin.query("select kind from organizations where id = $1", [
      created!.id,
    ]);
    expect(rows[0].kind).toBe("club");
    await expect(
      auth.api.updateOrganization({
        body: { organizationId: created!.id, data: { kind: "personal" } as never },
        headers,
      }),
    ).rejects.toMatchObject({ body: { code: "WORKSPACE_KIND_NOT_SETTABLE" } });
    const after = await admin.query("select kind from organizations where id = $1", [created!.id]);
    expect(after.rows[0].kind).toBe("club");
  });
});
