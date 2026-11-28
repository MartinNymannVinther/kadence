import { and, desc, eq, getTableColumns, gte, isNull, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import {
  activities,
  activityFiles,
  aiActions,
  checkins,
  plannedSessions,
  type AiActionEntity,
  type AiActionKind,
} from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { objectKey } from "@/core/files/types";
import { discardPlaced, keepPlaced, placeFile } from "@/modules/storage/keep";
import { UNDO_DAYS } from "./permissions";

/**
 * Everything a person's own assistant writes or deletes can be undone for
 * 30 days (docs/adr/0120; Haij's dogma five). A tool takes a picture of the
 * row before it changes it, makes the change through the ordinary service,
 * and writes the picture here with the row's stamp after. "Fortryd" puts
 * the picture back — or removes what the assistant made — as the person,
 * under the ordinary policies; it refuses when somebody wrote the row
 * since, rather than overwrite them. A deleted ride comes back with its
 * file and on the session it was laid on.
 */

const TABLES = {
  planned_session: plannedSessions,
  activity: activities,
  checkin: checkins,
} as const;

type Table = (typeof TABLES)[AiActionEntity];

/** The row as it is, as JSON: what "before" holds. */
export async function pictureOf(
  tx: AppTransaction,
  entity: AiActionEntity,
  id: string,
): Promise<Record<string, unknown> | null> {
  const table: Table = TABLES[entity];
  const [row] = await tx.select().from(table).where(eq(table.id, id));
  return row ? (JSON.parse(JSON.stringify(row)) as Record<string, unknown>) : null;
}

/** A picture made a row again: the timestamps as dates, the rest as it was. */
function revive(entity: AiActionEntity, picture: Record<string, unknown>) {
  const columns = getTableColumns(TABLES[entity]) as Record<string, { columnType: string }>;
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(picture)) {
    if (!(key in columns)) continue;
    row[key] =
      columns[key]!.columnType === "PgTimestamp" && typeof value === "string"
        ? new Date(value)
        : value;
  }
  return row;
}

export type AiActionInput = {
  connectionId: string | null;
  riderId: string;
  tool: string;
  entity: AiActionEntity;
  entityId: string;
  kind: AiActionKind;
  before: Record<string, unknown> | null;
  file?: { meta: Record<string, unknown>; bytes: Uint8Array } | null;
};

/** Notes the change, with the row's stamp as the change left it. */
export async function recordAiAction(ctx: OrgContext, input: AiActionInput): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const after =
      input.kind === "deleted" ? null : await pictureOf(tx, input.entity, input.entityId);
    await tx.insert(aiActions).values({
      orgId: ctx.orgId,
      userId: ctx.userId,
      riderId: input.riderId,
      connectionId: input.connectionId,
      tool: input.tool,
      entity: input.entity,
      entityId: input.entityId,
      kind: input.kind,
      before: input.before,
      afterStamp: typeof after?.updatedAt === "string" ? new Date(after.updatedAt) : null,
      fileMeta: input.file?.meta ?? null,
      fileBytes: input.file ? Buffer.from(input.file.bytes) : null,
    });
  });
}

export type AiActionView = {
  id: string;
  tool: string;
  entity: AiActionEntity;
  kind: AiActionKind;
  /** What the row was or became, in a few words: a title or a day. */
  label: string;
  createdAt: Date;
  undoneAt: Date | null;
};

/** The person's assistant's changes in the last 30 days, the newest first. */
export async function listAiActions(ctx: OrgContext): Promise<AiActionView[]> {
  const since = new Date(`${addDaysIso(todayInCopenhagen(), -UNDO_DAYS)}T00:00:00Z`);
  const rows = await withOrgContext(ctx, (tx) =>
    tx
      .select({
        id: aiActions.id,
        tool: aiActions.tool,
        entity: aiActions.entity,
        kind: aiActions.kind,
        before: aiActions.before,
        entityId: aiActions.entityId,
        createdAt: aiActions.createdAt,
        undoneAt: aiActions.undoneAt,
      })
      .from(aiActions)
      .where(and(eq(aiActions.userId, ctx.userId), gte(aiActions.createdAt, since)))
      .orderBy(desc(aiActions.createdAt))
      .limit(100),
  );
  return rows.map((r) => {
    const before = (r.before ?? {}) as Record<string, unknown>;
    const label = String(before.title ?? before.onDate ?? "").slice(0, 120);
    return {
      id: r.id,
      tool: r.tool,
      entity: r.entity as AiActionEntity,
      kind: r.kind as AiActionKind,
      label,
      createdAt: r.createdAt,
      undoneAt: r.undoneAt,
    };
  });
}

/** Whether the row has been written since the assistant's change. */
async function writtenSince(
  tx: AppTransaction,
  entity: AiActionEntity,
  id: string,
  stamp: Date | null,
): Promise<boolean> {
  const now = await pictureOf(tx, entity, id);
  if (!now || !stamp) return false;
  return new Date(String(now.updatedAt)).getTime() !== stamp.getTime();
}

/** "Fortryd": the change taken back, once, within 30 days. */
export async function undoAiAction(ctx: OrgContext, id: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const [action] = await tx
      .select()
      .from(aiActions)
      .where(
        and(eq(aiActions.id, id), eq(aiActions.userId, ctx.userId), isNull(aiActions.undoneAt)),
      );
    if (!action) throw new Refused("notFound");
    const entity = action.entity as AiActionEntity;
    const table: Table = TABLES[entity];
    if (
      action.kind !== "deleted" &&
      (await writtenSince(tx, entity, action.entityId, action.afterStamp))
    )
      throw new Refused("conflict", "changedSince");

    if (action.kind === "created") {
      await tx.delete(table).where(eq(table.id, action.entityId));
    } else if (action.kind === "updated" && action.before) {
      const {
        id: _id,
        orgId: _org,
        riderId: _rider,
        createdAt: _made,
        ...rest
      } = revive(entity, action.before as Record<string, unknown>);
      await tx.update(table).set(rest).where(eq(table.id, action.entityId));
    } else if (action.kind === "deleted" && action.before) {
      if (await pictureOf(tx, entity, action.entityId))
        throw new Refused("conflict", "changedSince");
      await tx
        .insert(table)
        .values(revive(entity, action.before as Record<string, unknown>) as never);
      if (entity === "activity") await restoreFile(tx, ctx, action);
    }
    await tx
      .update(aiActions)
      .set({ undoneAt: sql`now()` })
      .where(eq(aiActions.id, action.id));
  });
}

/** A deleted ride's file back where files are kept, and the ride back on its session. */
async function restoreFile(
  tx: AppTransaction,
  ctx: OrgContext,
  action: typeof aiActions.$inferSelect,
): Promise<void> {
  const meta = (action.fileMeta ?? {}) as {
    fileName?: string;
    sha256?: string;
    sessionId?: string | null;
  };
  if (action.fileBytes && meta.sha256) {
    const placed = await placeFile(
      objectKey(ctx.orgId, action.riderId, meta.sha256),
      new Uint8Array(action.fileBytes),
    );
    try {
      await tx.insert(activityFiles).values({
        orgId: ctx.orgId,
        riderId: action.riderId,
        activityId: action.entityId,
        fileName: (meta.fileName ?? "tur.fit").slice(0, 200),
        sha256: meta.sha256,
        bytes: placed.bytes ? Buffer.from(placed.bytes) : null,
        storageKey: placed.storageKey,
        sizeBytes: placed.size,
      });
      await keepPlaced(tx, placed);
    } catch (error) {
      await discardPlaced(placed);
      throw error;
    }
  }
  if (meta.sessionId)
    await tx
      .update(plannedSessions)
      .set({ activityId: action.entityId })
      .where(and(eq(plannedSessions.id, meta.sessionId), isNull(plannedSessions.activityId)));
}
