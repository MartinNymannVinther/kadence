import { and, eq, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import { riders } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { enqueueFileMove } from "@/modules/storage/move";

/**
 * The history follows the rider (docs/adr/0081). `move_rider_history`
 * (drizzle/0046) moves every row carrying one rider's id from one rider
 * row to another in a different workspace, all or nothing, and it decides
 * for itself who may: the caller's account must be on both rider rows, a
 * member of both workspaces, and the target row must have no history yet.
 * The service here only calls it, with the target workspace as the
 * context, and turns its refusal into a word the interface can say. Where
 * files are objects, their keys still name the workspace left; a job
 * copies them under the new one afterwards (src/modules/storage/move.ts).
 */

export type MovedTable = { table: string; rows: number };

/** The function's refusals, as it names them in DETAIL. */
export const MOVE_REFUSALS = [
  "not_own_rider",
  "same_workspace",
  "not_member",
  "target_has_history",
  "would_collide",
] as const;
export type MoveRefusal = (typeof MOVE_REFUSALS)[number];

/** Postgres' `insufficient_privilege`, the code every refusal carries. */
const INSUFFICIENT_PRIVILEGE = "42501";

/** The database's own error behind what drizzle threw: the code and the DETAIL. */
export function sqlErrorOf(error: unknown): { code?: string; detail?: string } {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    const { code, detail } = current as { code?: unknown; detail?: unknown };
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
      return { code, detail: typeof detail === "string" ? detail : undefined };
    }
    current = (current as { cause?: unknown }).cause;
  }
  return {};
}

/** The refusal a failed move carries, or null when it was something else. */
export function moveRefusalOf(error: unknown): MoveRefusal | null {
  const { code, detail } = sqlErrorOf(error);
  if (code !== INSUFFICIENT_PRIVILEGE) return null;
  return (MOVE_REFUSALS as readonly string[]).includes(detail ?? "")
    ? (detail as MoveRefusal)
    : null;
}

/**
 * Moves the caller's history from `fromRiderId` onto `toRiderId`. `ctx` is
 * the target workspace: the function reads only the caller's account from
 * it, and the one row-level audit line it leaves — the target rider row
 * taking the thresholds — is then filed where the rider now is. Throws
 * `Refused("forbidden", <refusal>)` when the database says no.
 */
export async function moveRiderHistory(
  ctx: OrgContext,
  fromRiderId: string,
  toRiderId: string,
): Promise<MovedTable[]> {
  let moved: MovedTable[];
  try {
    moved = await withOrgContext(ctx, async (tx) => {
      const result = await tx.execute(
        sql`select table_name, rows_moved from move_rider_history(${fromRiderId}, ${toRiderId})`,
      );
      return (result.rows as Array<{ table_name: string; rows_moved: number }>).map((row) => ({
        table: row.table_name,
        rows: Number(row.rows_moved),
      }));
    });
  } catch (error) {
    const refusal = moveRefusalOf(error);
    if (refusal) throw new Refused("forbidden", refusal);
    throw error;
  }
  if (moved.some((row) => row.table === "activity_files" && row.rows > 0))
    await enqueueFileMove(ctx, toRiderId);
  return moved;
}

/** The caller's own rider row in a workspace, under RLS: id and name, or null. */
export async function ownRiderIn(
  ctx: OrgContext,
): Promise<{ id: string; name: string; birthYear: number } | null> {
  const [row] = await withOrgContext(ctx, (tx) =>
    tx
      .select({ id: riders.id, name: riders.name, birthYear: riders.birthYear })
      .from(riders)
      .where(and(eq(riders.orgId, ctx.orgId), eq(riders.userId, ctx.userId)))
      .limit(1),
  );
  return row ?? null;
}

/** Whether a rider row already has what the function counts as history. */
export async function riderHasHistory(ctx: OrgContext, riderId: string): Promise<boolean> {
  const result = await withOrgContext(ctx, (tx) =>
    tx.execute(
      sql`select exists (select 1 from planned_sessions where rider_id = ${riderId})
               or exists (select 1 from activities where rider_id = ${riderId})
               or exists (select 1 from checkins where rider_id = ${riderId}) as has`,
    ),
  );
  return Boolean((result.rows[0] as { has?: boolean } | undefined)?.has);
}
