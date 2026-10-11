import { sql } from "drizzle-orm";
import { auditLog } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import {
  AUDIT_COLUMNS,
  AUDIT_PAGE,
  AUDIT_SHEET,
  EXPORT_TABLES,
  MEMBERS_SHEET,
  columnNames,
  type ExportTable,
} from "./tables";

/**
 * The whole workspace, on its way out — or, for a rider, their own data:
 * the same code, and RLS decides what is in it (ADR 0011).
 *
 * Full export is a dogma: you must be able to leave. So the export reads
 * through the ordinary RLS-guarded path, as the application role, with the
 * tenant context set — exactly like every other query. It is not a
 * privileged back door that happens to be shaped like a feature, and the
 * isolation test proves one workspace's export cannot contain another's
 * rows.
 *
 * Columns are read as they are named in the database rather than mapped to
 * prettier labels. An export is a record, not a report: the value of it is
 * that a row means the same thing outside Kadence as it did inside. They
 * are named one by one in tables.ts, so a heavy column is never read.
 *
 * The audit trail is read on its own, in pages (ADR 0088): it is the one
 * table that grows with every change, and a request should hold one page
 * of it at a time, not all of it.
 */

export type ExportSection = {
  sheet: string;
  columns: string[];
  rows: unknown[][];
};

export type OrgExport = {
  organization: { id: string; name: string; slug: string | null };
  exportedAt: Date;
  sections: ExportSection[];
  /** The newest audit row the export covers; rows written after it are not in it. */
  auditUpTo: number;
};

/** Only the characters a column list in tables.ts is made of. */
const COLUMN_LIST = /^[a-z0-9_", ]+$/;

async function readTable(tx: AppTransaction, spec: ExportTable): Promise<ExportSection> {
  // Table and column names come from EXPORT_TABLES, a fixed list in this
  // repository; nothing here is ever built from a request.
  if (!COLUMN_LIST.test(spec.columns)) throw new Error(`export: odd column list for ${spec.table}`);
  const order = spec.orderBy ? ` order by ${spec.orderBy} nulls last` : "";
  const result = await tx.execute(sql.raw(`select ${spec.columns} from "${spec.table}"${order}`));

  const rows = result.rows as Array<Record<string, unknown>>;
  const redact = new Set(spec.redact ?? []);
  const columns = columnNames(spec.columns).filter((column) => !redact.has(column));

  return {
    sheet: spec.sheet,
    columns,
    rows: rows.map((row) => columns.map((column) => row[column] ?? null)),
  };
}

/**
 * The members, from the workspace's own membership rather than from the
 * auth tables: who is in this workspace and in what role, without carrying
 * credentials along. A coach's export has the whole team; anybody else's
 * has themselves — a rider's or a parent's export must not hand out the
 * other young riders' addresses (ADR 0011). The application role cannot
 * read `users.email` at all; `team_member_addresses()` hands a coach the
 * team's addresses and anyone else their own (docs/adr/0070). Everything
 * else is already cut to what the caller may see by RLS.
 */
async function readMembers(tx: AppTransaction, ctx: OrgContext): Promise<ExportSection> {
  const result = await tx.execute(sql`
    select u.name, a.email, m.role, m.created_at
    from memberships m
    join users u on u.id = m.user_id
    join team_member_addresses() a on a.user_id = m.user_id
    where m.organization_id = ${ctx.orgId}
      and (app_is_coach() or m.user_id = ${ctx.userId})
    order by m.created_at
  `);
  const rows = result.rows as Array<Record<string, unknown>>;
  const columns = ["name", "email", "role", "created_at"];
  return {
    sheet: MEMBERS_SHEET,
    columns,
    rows: rows.map((row) => columns.map((column) => row[column] ?? null)),
  };
}

/**
 * Everything but the audit trail, and the point the trail is read up to.
 * Records that the data left: the audit log should be able to answer
 * "when did the data last leave, and who took it".
 */
export async function buildOrgExport(
  ctx: OrgContext,
  format: "xlsx" | "json" = "xlsx",
): Promise<OrgExport> {
  return withOrgContext(ctx, async (tx) => {
    const org = await tx.execute(sql`
      select id, name, slug from organizations where id = ${ctx.orgId} limit 1
    `);
    const organization = (org.rows[0] ?? {}) as { id: string; name: string; slug: string | null };

    const sections: ExportSection[] = [await readMembers(tx, ctx)];
    for (const spec of EXPORT_TABLES) {
      sections.push(await readTable(tx, spec));
    }

    // RLS gives a coach the workspace's trail and anyone else none of it.
    const top = await tx.execute(
      sql`select coalesce(max(id), 0)::bigint as id from audit_log where org_id = ${ctx.orgId}`,
    );
    const auditUpTo = Number((top.rows[0] as { id: string | number }).id);

    await tx.insert(auditLog).values({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      actorType: "user",
      action: "workspace.exported",
      entityType: "organizations",
      entityId: ctx.orgId,
      after: {
        format,
        sections: sections.length + 1,
        rows: sections.reduce((total, section) => total + section.rows.length, 0),
      },
    });

    return { organization, exportedAt: new Date(), sections, auditUpTo };
  });
}

export const AUDIT_COLUMN_NAMES = columnNames(AUDIT_COLUMNS);

type AuditRow = Record<string, unknown> & { id: string | number };

const asCells = (row: Record<string, unknown>) =>
  AUDIT_COLUMN_NAMES.map((column) => row[column] ?? null);

/**
 * Rows of the trail in one direction from a point, at most `limit`, in
 * their own short transaction, so a slow download holds none open. The
 * explicit org_id keeps the read on the (org_id, id) index; RLS still
 * decides, and gives anyone but a coach nothing.
 */
async function auditRows(
  ctx: OrgContext,
  where: { afterId: number; upTo: number } | { beforeId: number },
  limit: number,
): Promise<AuditRow[]> {
  const columns = sql.raw(AUDIT_COLUMNS);
  const result = await withOrgContext(ctx, (tx) =>
    "beforeId" in where
      ? tx.execute(sql`
          select ${columns} from audit_log
          where org_id = ${ctx.orgId} and id < ${where.beforeId}
          order by id desc limit ${limit}`)
      : tx.execute(sql`
          select ${columns} from audit_log
          where org_id = ${ctx.orgId} and id > ${where.afterId} and id <= ${where.upTo}
          order by id limit ${limit}`),
  );
  return result.rows as AuditRow[];
}

export type AuditPage = { rows: unknown[][]; lastId: number };

/** One page of the trail, oldest first: the rows after `afterId` and up to `upTo`. */
export async function readAuditPage(
  ctx: OrgContext,
  afterId: number,
  upTo: number,
  limit = AUDIT_PAGE,
): Promise<AuditPage> {
  const rows = await auditRows(ctx, { afterId, upTo }, limit);
  const last = rows.at(-1);
  return { rows: rows.map(asCells), lastId: last ? Number(last.id) : afterId };
}

/**
 * The newest `count` rows of the trail up to `upTo`, oldest first, read a
 * page at a time from the newest end. For the spreadsheet, which is built
 * whole and so holds the newest part of the trail; the JSON export holds
 * every row. `complete` says whether older rows were left out.
 */
export async function readNewestAudit(
  ctx: OrgContext,
  upTo: number,
  count: number,
): Promise<ExportSection & { complete: boolean }> {
  const newestFirst: AuditRow[] = [];
  let beforeId = upTo + 1;
  let complete = false;
  while (newestFirst.length < count) {
    const take = Math.min(AUDIT_PAGE, count - newestFirst.length);
    const page = await auditRows(ctx, { beforeId }, take);
    newestFirst.push(...page);
    if (page.length < take) {
      complete = true;
      break;
    }
    beforeId = Number(page.at(-1)!.id);
  }
  if (!complete) complete = (await auditRows(ctx, { beforeId }, 1)).length === 0;
  return {
    sheet: AUDIT_SHEET,
    columns: AUDIT_COLUMN_NAMES,
    rows: newestFirst.reverse().map(asCells),
    complete,
  };
}
