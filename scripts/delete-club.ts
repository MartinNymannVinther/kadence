// Loaded before anything touches the environment: a standalone script gets
// no help from Next.js, which normally reads .env for us.
import "dotenv/config";

import { Pool } from "pg";

/**
 * Deletes a club on the installation when its own owner cannot (ADR 0048):
 * the owner has left, and someone the club answers for has asked in
 * writing. Everything the club owns goes, and the audit rows about it,
 * exactly as when the club's owner deletes it from Settings → Workspace
 * (delete_workspace, drizzle/0003 and 0045). One line stays in the log:
 * that the installation deleted it, why, and how many rows each table
 * held. The cascade itself writes nothing to the trail (ADR 0088).
 *
 *     pnpm script scripts/delete-club.ts                               # lists the clubs
 *     pnpm script scripts/delete-club.ts <org id> "<the club's name>" "<why>"
 *
 * The name must be typed exactly, as in the interface, so a wrong id
 * deletes nothing. Deliberately a script and not a button: deleting
 * someone else's club belongs with the person who has database access.
 * Runs as the migration role, like the other maintenance scripts.
 */

const [orgId, name, reason] = process.argv.slice(2);

async function main(): Promise<void> {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error("MIGRATION_DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    if (!orgId) {
      const clubs = await pool.query<{ id: string; name: string; members: string }>(
        `select o.id, o.name, (select count(*) from memberships m where m.organization_id = o.id) as members
         from organizations o order by o.created_at`,
      );
      for (const c of clubs.rows) console.log(`${c.id}  ${c.name}  (${c.members} medlemmer)`);
      return;
    }
    if (!name || !reason?.trim()) throw new Error("Skriv klubbens navn og en begrundelse.");
    const club = await pool.query<{ name: string }>(
      "select name from organizations where id = $1",
      [orgId],
    );
    if (club.rowCount === 0) throw new Error(`Ingen klub med id ${orgId}.`);
    if (club.rows[0]!.name !== name)
      throw new Error(`Navnet passer ikke. Klubben hedder "${club.rows[0]!.name}".`);

    const client = await pool.connect();
    try {
      await client.query("begin");
      const counts = await client.query<{ rows: Record<string, number> }>(
        "select workspace_row_counts($1) as rows",
        [orgId],
      );
      await client.query("delete from organizations where id = $1", [orgId]);
      await client.query("set local session_replication_role = replica");
      await client.query("delete from audit_log where org_id = $1", [orgId]);
      await client.query("set local session_replication_role = origin");
      await client.query(
        `insert into audit_log (org_id, actor_user_id, actor_type, action, entity_type, entity_id, after_data)
         values (null, null, 'system', 'workspace.deleted_by_installation', 'organizations', $1, $2)`,
        [
          orgId,
          JSON.stringify({ reason: reason.trim().slice(0, 500), rows: counts.rows[0]!.rows }),
        ],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    console.log(`Klubben "${name}" er slettet med alt, hvad den ejede.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
