import { count, eq } from "drizzle-orm";
import { isPlatformOwner } from "@/core/access/service";
import { recordAuthEvent } from "@/core/audit/events";
import { authDb } from "@/core/db/client";
import { memberships, users } from "@/core/db/schema";
import { deregisterOwnGarmin } from "@/modules/devices/exit";

/**
 * The second half of "Slet min konto og alt om mig" (docs/adr/0080). A
 * person's own workspace is deleted first, by `delete_workspace()` as for
 * any team (workspace.ts); then their account goes too, when nothing else
 * holds it: no other team, and not the installation's owner, whose
 * account the installation needs. The account's sessions, passwords,
 * passkeys and second factor go with it (the auth tables' cascades), as
 * the demo's throwaway accounts do (src/modules/demo/service.ts). Before
 * it goes, Garmin is told to forget the person's own Garmin links in any
 * team they left, and those links go too (src/modules/devices/exit.ts,
 * docs/adr/0113). The audit log keeps one line that it happened, with no
 * name or address.
 */
export async function deleteAccountIfAlone(userId: string): Promise<boolean> {
  if (await isPlatformOwner(userId)) return false;
  const [row] = await authDb
    .select({ n: count() })
    .from(memberships)
    .where(eq(memberships.userId, userId));
  if (Number(row?.n ?? 0) > 0) return false;
  await deregisterOwnGarmin(userId);
  const deleted = await authDb
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (deleted.length === 0) return false;
  await recordAuthEvent({
    action: "account.deleted",
    actorUserId: userId,
    entityType: "users",
    entityId: userId,
  });
  return true;
}
