import { eq } from "drizzle-orm";
import { activities, checkins, plannedSessions, type AiActionEntity } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { pictureOf, recordAiAction } from "../ai-actions";
import { ToolRefusal, type Caller } from "../tool";

/**
 * What every tool that writes or deletes shares (docs/adr/0120): the row
 * must be the caller's own — a coach who also rides reaches only their own
 * rider, whatever the services would let a coach do — and the change goes
 * into the undo log with the row as it was.
 */

const TABLE = { planned_session: plannedSessions, activity: activities, checkin: checkins };

/** The row as it is, refused unless it is the caller's own rider's. */
export async function ownPicture(
  caller: Caller,
  entity: AiActionEntity,
  id: string,
): Promise<Record<string, unknown>> {
  const picture = await withOrgContext(caller.ctx, async (tx) => {
    const table = TABLE[entity];
    const [row] = await tx.select({ riderId: table.riderId }).from(table).where(eq(table.id, id));
    return row?.riderId === caller.riderId ? pictureOf(tx, entity, id) : null;
  });
  if (!picture) throw new ToolRefusal("No such item of yours.");
  return picture;
}

/** The row now, or null; for a check-in that may not exist yet. */
export function pictureNow(caller: Caller, entity: AiActionEntity, id: string) {
  return withOrgContext(caller.ctx, (tx) => pictureOf(tx, entity, id));
}

export function logged(
  caller: Caller,
  tool: string,
  entity: AiActionEntity,
  entityId: string,
  kind: "created" | "updated" | "deleted",
  before: Record<string, unknown> | null,
  file?: { meta: Record<string, unknown>; bytes: Uint8Array } | null,
) {
  return recordAiAction(caller.ctx, {
    connectionId: caller.connectionId,
    riderId: caller.riderId,
    tool,
    entity,
    entityId,
    kind,
    before,
    file,
  });
}

/** What every answer of a writing tool ends with: the person can take it back. */
export const UNDO_WORDS =
  "Done. The person can undo this in Kadence under Indstillinger → AI-forbindelser for 30 days.";
