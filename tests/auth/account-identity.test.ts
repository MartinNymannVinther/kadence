import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, authClient, expectSqlError } from "../helpers/db";

/**
 * How an account is known after Better Auth 1.7.3 (drizzle/0059,
 * docs/adr/0111): by provider and account id, as in 1.6. Better Auth
 * checks the schema it is given and refuses every request when a column it
 * never writes is required, so the issuer left over from 1.7.0–1.7.2 is
 * nullable; a trigger still writes it for password accounts, which is what
 * 1.7.1 looks for when it signs a person in after a rollback.
 */

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => {
    throw new Error("`cookies` was called outside a request scope.");
  },
}));

const { auth } = await import("@/core/auth/auth");
const { registerUserWithOrganization } = await import("@/core/auth/register");

const EMAIL = "identity@example.com";
const PASSWORD = "en-meget-lang-kode-123";

let admin: Pool;
let authRole: Client;
let userId: string;

beforeAll(async () => {
  admin = adminPool();
  authRole = await authClient();
  const result = await registerUserWithOrganization(new Headers(), {
    name: "Identity",
    email: EMAIL,
    password: PASSWORD,
    organizationName: "Identitetsholdet",
  });
  expect(result).toEqual({ ok: true });
  userId = (await admin.query("select id from users where email = $1", [EMAIL])).rows[0].id;
});

afterAll(async () => {
  await authRole?.end();
  await admin?.end();
});

describe("account identity after Better Auth 1.7.3", () => {
  it("Better Auth accepts the schema Kadence gives it", async () => {
    // A mismatch is thrown here, before any session is looked up.
    await expect(auth.api.getSession({ headers: new Headers() })).resolves.toBeNull();
  });

  it("keeps one password account per person, known by provider and id", async () => {
    const { rows } = await admin.query(
      "select provider_id, account_id, issuer from accounts where user_id = $1",
      [userId],
    );
    expect(rows).toEqual([
      // The issuer is the trigger's, the value 1.7.1 signs a password in by.
      { provider_id: "credential", account_id: userId, issuer: "local:credential" },
    ]);
    const signedIn = await auth.api.signInEmail({ body: { email: EMAIL, password: PASSWORD } });
    expect(signedIn.user.id).toBe(userId);
  });

  it("refuses a second account for the same provider and id", async () => {
    const code = await expectSqlError(
      authRole.query(
        `insert into accounts (id, account_id, provider_id, user_id, password)
         values ($1, $2, 'credential', $2, 'x')`,
        [randomBytes(16).toString("hex"), userId],
      ),
    );
    expect(code).toBe("23505");
  });

  it("fills the issuer for a password account only, and leaves one given alone", async () => {
    const other = randomBytes(16).toString("hex");
    await authRole.query(
      `insert into accounts (id, account_id, provider_id, user_id)
       values ($1, 'remote-1', 'example', $2)`,
      [other, userId],
    );
    const given = randomBytes(16).toString("hex");
    await authRole.query(
      `insert into accounts (id, issuer, account_id, provider_id, user_id)
       values ($1, 'https://issuer.example', 'remote-2', 'example', $2)`,
      [given, userId],
    );
    const { rows } = await admin.query(
      "select id, issuer from accounts where id = any($1) order by account_id",
      [[other, given]],
    );
    expect(rows).toEqual([
      { id: other, issuer: null },
      { id: given, issuer: "https://issuer.example" },
    ]);
    await admin.query("delete from accounts where id = any($1)", [[other, given]]);
  });
});
