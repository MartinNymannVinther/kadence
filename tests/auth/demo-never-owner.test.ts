import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { adminPool } from "../helpers/db";

/**
 * A demo can never be the first account on an installation, nor its owner
 * (backlog P1-09). On an empty installation with DEMO=on, the first demo
 * visitor once became the installation's owner and closed the door behind
 * them. Now demo accounts do not count as people, a demo account never
 * gets the owner's role, and /demo stays shut until somebody owns the
 * installation.
 *
 * The shared test database already holds people and, by now, an owner, so
 * "empty" and "owned" are set by mocking the two questions the code asks:
 * how many people there are, and whether anybody owns the installation.
 */

const people = vi.hoisted(() => ({ count: null as number | null }));
const owner = vi.hoisted(() => ({ exists: null as boolean | null }));

vi.mock("@/core/auth/signup", async (actual) => {
  const real = await actual<typeof import("@/core/auth/signup")>();
  return {
    ...real,
    countUsers: async () => people.count ?? real.countUsers(),
  };
});

vi.mock("@/core/access/service", async (actual) => {
  const real = await actual<typeof import("@/core/access/service")>();
  return {
    ...real,
    installationHasOwner: async () => owner.exists ?? real.installationHasOwner(),
  };
});

const { auth } = await import("@/core/auth/auth");
const signup = await import("@/core/auth/signup");
const { createDemoWorkspace, demoReady } = await import("@/modules/demo/service");

let admin: Pool;
const DEMO_EMAIL = "p109-visitor@demo.invalid";
const PERSON_EMAIL = "p109-first@example.org";

beforeAll(async () => {
  admin = adminPool();
});

afterAll(async () => {
  await admin.query("delete from users where email = any($1)", [
    [DEMO_EMAIL, PERSON_EMAIL, "p109-count@demo.invalid", "p109-count@example.org"],
  ]);
  await admin.end();
});

async function roleOf(email: string): Promise<string | null> {
  const { rows } = await admin.query("select platform_role from users where email = $1", [email]);
  return rows[0]?.platform_role ?? null;
}

describe("a demo account", () => {
  it("is known by its reserved domain", () => {
    expect(signup.isDemoEmail("demo-abc@demo.invalid")).toBe(true);
    expect(signup.isDemoEmail("DEMO-abc@Demo.Invalid")).toBe(true);
    expect(signup.isDemoEmail("someone@example.org")).toBe(false);
    expect(signup.isDemoEmail("demo.invalid@example.org")).toBe(false);
    expect(signup.isDemoEmail(null)).toBe(false);
  });

  it("does not count as a person", async () => {
    const before = await signup.countUsers();
    await admin.query(
      `insert into users (id, name, email, email_verified)
       values ('user_p109_demo', 'Demo', 'p109-count@demo.invalid', false)`,
    );
    expect(await signup.countUsers()).toBe(before);
    await admin.query(
      `insert into users (id, name, email, email_verified)
       values ('user_p109_person', 'Person', 'p109-count@example.org', false)`,
    );
    expect(await signup.countUsers()).toBe(before + 1);
  });

  it("never becomes the owner, even as the very first account", async () => {
    people.count = 0;
    try {
      await auth.api.signUpEmail({
        body: { name: "Gæst", email: DEMO_EMAIL, password: "p109-demo-password-long" },
        headers: new Headers({ [signup.DEMO_HEADER]: signup.demoSignupHeaderValue() }),
      });
      expect(await roleOf(DEMO_EMAIL)).toBeNull();

      // The first real person after it still becomes the owner.
      await auth.api.signUpEmail({
        body: { name: "Først", email: PERSON_EMAIL, password: "p109-person-password-long" },
      });
      expect(await roleOf(PERSON_EMAIL)).toBe("owner");
    } finally {
      people.count = null;
      // Leave no extra owner behind for the other suites.
      await admin.query("update users set platform_role = null where email = $1", [PERSON_EMAIL]);
    }
  });
});

describe("the demo", () => {
  it("stays shut until somebody owns the installation", async () => {
    owner.exists = false;
    try {
      expect(await demoReady()).toBe(false);
      expect(await createDemoWorkspace("da")).toBeNull();
    } finally {
      owner.exists = null;
    }
  });

  it("opens once there is an owner", async () => {
    owner.exists = true;
    try {
      expect(await demoReady()).toBe(true);
    } finally {
      owner.exists = null;
    }
  });
});
