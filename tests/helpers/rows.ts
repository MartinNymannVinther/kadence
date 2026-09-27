import type { Pool } from "pg";

/** A parameterized insert from a plain object: the tests' way of writing a row. */
export function insertSql(table: string, values: Record<string, unknown>) {
  const columns = Object.keys(values);
  const params = columns.map((_, i) => `$${i + 1}`);
  return {
    text: `insert into "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) values (${params.join(", ")})`,
    values: columns.map((c) => {
      const v = values[c];
      return v !== null && typeof v === "object" && !Buffer.isBuffer(v) ? JSON.stringify(v) : v;
    }),
  };
}

/**
 * A person in a workspace, as the superuser writes them: the organization
 * if it is new, the user, and the membership with the given role.
 */
export async function seedPerson(
  admin: Pool,
  orgId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  orgName = orgId,
): Promise<{ orgId: string; userId: string }> {
  await admin.query(
    `insert into organizations (id, name, slug) values ($1, $2, $3) on conflict do nothing`,
    [orgId, orgName, orgId.replace(/_/g, "-")],
  );
  await admin.query(
    `insert into users (id, name, email) values ($1, $2, $3) on conflict do nothing`,
    [userId, userId, `${userId}@example.com`],
  );
  await admin.query(
    `insert into memberships (id, organization_id, user_id, role) values ($1, $2, $3, $4) on conflict do nothing`,
    [`mem_${userId}`, orgId, userId, role],
  );
  return { orgId, userId };
}
