import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { teamCount } from "@/core/auth/teams";
import { adminPool } from "../helpers/db";
import { seedMember, seedWorkspace } from "../helpers/workspace";

/**
 * The team's name at the top of the menu is a switcher only when there is
 * another team to switch to (docs/adr/0068). The count is read on the
 * auth role and covers the person's own memberships, nobody else's.
 */

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  const first = await seedWorkspace(admin, "tc_one");
  await seedWorkspace(admin, "tc_two");
  // The owner of the first team is also a member of the second.
  await admin.query(
    `insert into memberships (id, organization_id, user_id, role) values ($1, $2, $3, 'member')`,
    ["mem_tc_one_in_two", "org_tc_two", first.userId],
  );
  await seedMember(admin, "org_tc_one", "tc_alone");
});

afterAll(async () => {
  await admin.end();
});

describe("how many teams a person is on", () => {
  it("counts every team the person belongs to", async () => {
    expect(await teamCount("user_tc_one")).toBe(2);
  });

  it("counts one for a person on one team, whoever else is on it", async () => {
    expect(await teamCount("user_tc_alone")).toBe(1);
    expect(await teamCount("user_tc_two")).toBe(1);
  });

  it("counts none for somebody on no team", async () => {
    expect(await teamCount("user_nobody_here")).toBe(0);
  });
});
