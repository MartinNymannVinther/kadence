import { sql } from "drizzle-orm";
import { communityPosts, communityThreads } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { isDemoRoom } from "@/modules/community/service";
import { ROOM_THREADS } from "./room-data";
import { pick, type L } from "./seed-data";

/**
 * The demo's own Trænerrummet, filled with the example threads of
 * room-data.ts (docs/adr/0054). Written as the demo's coach, with the
 * seed's setting on, so the database keeps the made-up coaches' names and
 * signs them with no account and no club (community_stamp, drizzle/0025).
 * The database puts every thread in this demo's room and goes with it.
 */

const HOUR = 60 * 60 * 1000;

/**
 * Whether the active workspace is a demo with a room of its own. The demo
 * team's seed is also used for test teams on a real installation
 * (scripts/seed-test-teams.ts), where the example threads must not go.
 */
export async function inDemoRoom(ctx: OrgContext): Promise<boolean> {
  return withOrgContext(ctx, (tx) => isDemoRoom(tx));
}

export async function seedCoachesRoom(ctx: OrgContext, l: L, now = new Date()): Promise<void> {
  const at = (daysAgo: number, hoursBack: number) =>
    new Date(now.getTime() - daysAgo * 24 * HOUR - hoursBack * HOUR);
  await withOrgContext(ctx, async (tx) => {
    // Made-up authors belong in a demo and nowhere else; the database
    // refuses them anywhere else too, and this says so before it tries.
    if (!(await isDemoRoom(tx))) throw new Error("The example threads are for a demo workspace.");
    await tx.execute(sql`select set_config('app.demo_seed', 'on', true)`);
    for (const thread of ROOM_THREADS) {
      const startedAt = at(thread.daysAgo, 6);
      const replies = thread.replies.map((r, i) => ({ ...r, at: at(r.daysAgo, 5 - i) }));
      const last = replies.reduce((latest, r) => (r.at > latest ? r.at : latest), startedAt);
      const [row] = await tx
        .insert(communityThreads)
        .values({
          category: thread.category,
          title: pick(thread.title, l),
          body: pick(thread.body, l),
          workout: thread.workout
            ? {
                name: pick(thread.workout.name, l),
                sport: "bike",
                plannedMinutes: thread.workout.plannedMinutes,
                structure: thread.workout.structure,
              }
            : null,
          authorName: thread.by.name,
          clubName: thread.by.club,
          createdAt: startedAt,
          lastPostAt: last,
        })
        .returning({ id: communityThreads.id });
      for (const r of replies)
        await tx.insert(communityPosts).values({
          threadId: row!.id,
          body: pick(r.body, l),
          authorName: r.by.name,
          clubName: r.by.club,
          createdAt: r.at,
        });
    }
    await tx.execute(sql`select set_config('app.demo_seed', 'off', true)`);
  });
}
