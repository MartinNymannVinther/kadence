// Loaded before anything touches @/core/env: a standalone script gets no
// help from Next.js, which normally reads .env for us.
import "dotenv/config";

import { Pool } from "pg";

/**
 * Reads every team's stored FIT files again, so rides imported before
 * Kadence kept the route, laps, climbs and power curve show them too
 * (src/modules/devices/reread.ts).
 *
 *     pnpm script scripts/reread-activities.ts
 *
 * The teams and a coach of each are looked up as the migration role; the
 * rereading itself runs through the application role as that coach, so
 * RLS applies and the audit log names who it was done for.
 */
async function main(): Promise<void> {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error("MIGRATION_DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url, max: 1 });
  let coaches: Array<{ org_id: string; user_id: string }>;
  try {
    const result = await pool.query<{ org_id: string; user_id: string }>(
      `select distinct on (organization_id) organization_id as org_id, user_id
         from memberships
        where role in ('owner', 'admin')
        order by organization_id, (role = 'owner') desc, created_at`,
    );
    coaches = result.rows;
  } finally {
    await pool.end();
  }

  const { rereadActivityDetails } = await import("@/modules/devices/reread");
  for (const coach of coaches) {
    const { read, failed } = await rereadActivityDetails({
      orgId: coach.org_id,
      userId: coach.user_id,
    });
    if (read + failed > 0)
      console.log(`reread-activities: ${coach.org_id}: ${read} read, ${failed} could not be read`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("reread-activities: failed", error);
    process.exit(1);
  });
