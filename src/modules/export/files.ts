import { inArray, sql } from "drizzle-orm";
import { activityFiles, auditLog } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { ZipWriter } from "@/core/zip";

/**
 * "Hent dine filer": every ride's original file, as one ZIP with a folder
 * per rider (ADR 0084). Dogma three says everything can be taken out, and
 * the files are the one thing the spreadsheet cannot hold.
 *
 * Read as the application role under the same RLS as everything else
 * (`app_read_activity_files`): a coach gets the whole team's files, a
 * rider their own, a parent their child's when the child shares training.
 * The list is read first, small; the files follow a few at a time, each
 * batch in its own short transaction, and go out as soon as they are
 * read. The archive is store-only: a FIT file is already dense.
 */

export type ExportFile = {
  id: string;
  activityId: string;
  riderId: string;
  riderName: string;
  onDate: string;
  size: number;
};

/** About this much file is read from the database at a time. */
const BATCH_BYTES = 16 * 1024 * 1024;
const BATCH_FILES = 50;

/** What a file system will take as one folder or file name, from anything. */
export function safeName(value: string, fallback: string): string {
  const cleaned = value
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f/\\:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    // No hidden file and no "..": a name never starts with a dot.
    .replace(/^[.\s]+/, "")
    .slice(0, 80)
    .trim();
  return cleaned || fallback;
}

/**
 * A folder per rider, by name. Two riders with the same name each get
 * the start of their id beside it, so their rides never mix.
 */
export function riderFolders(files: ExportFile[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const file of files) names.set(file.riderId, safeName(file.riderName, "rytter"));
  const seen = new Map<string, number>();
  for (const name of names.values()) seen.set(name, (seen.get(name) ?? 0) + 1);
  const folders = new Map<string, string>();
  for (const [riderId, name] of names) {
    folders.set(riderId, seen.get(name)! > 1 ? `${name} (${riderId.slice(0, 8)})` : name);
  }
  return folders;
}

/** `<rider>/<date>-<activity id>.fit` */
export function archivePath(file: ExportFile, folders: Map<string, string>): string {
  const folder = folders.get(file.riderId) ?? safeName(file.riderName, "rytter");
  return `${folder}/${file.onDate}-${safeName(file.activityId, "tur")}.fit`;
}

/**
 * The files the caller may read, without their bytes, in the order they
 * go into the archive. Records that the files left, as the export does.
 */
export async function listExportFiles(
  ctx: OrgContext,
): Promise<{ organizationName: string; files: ExportFile[] }> {
  return withOrgContext(ctx, async (tx) => {
    const org = await tx.execute(sql`select name from organizations where id = ${ctx.orgId}`);
    const organizationName = (org.rows[0] as { name?: string } | undefined)?.name ?? "kadence";
    const result = await tx.execute(sql`
      select f.id, f.activity_id, f.rider_id, coalesce(r.name, '') as rider_name,
             to_char(a.on_date, 'YYYY-MM-DD') as on_date, octet_length(f.bytes) as size
      from activity_files f
      join activities a on a.id = f.activity_id
      left join riders r on r.id = f.rider_id
      where f.org_id = ${ctx.orgId}
      order by r.name nulls last, f.rider_id, a.on_date, f.activity_id
    `);
    const files = (result.rows as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      activityId: String(row.activity_id),
      riderId: String(row.rider_id),
      riderName: String(row.rider_name),
      onDate: String(row.on_date),
      size: Number(row.size),
    }));
    await tx.insert(auditLog).values({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      actorType: "user",
      action: "workspace.files_exported",
      entityType: "organizations",
      entityId: ctx.orgId,
      after: { files: files.length, bytes: files.reduce((sum, file) => sum + file.size, 0) },
    });
    return { organizationName, files };
  });
}

/** The list cut into batches of about BATCH_BYTES, never more than BATCH_FILES. */
export function batches(files: ExportFile[]): ExportFile[][] {
  const out: ExportFile[][] = [];
  let current: ExportFile[] = [];
  let bytes = 0;
  for (const file of files) {
    if (current.length > 0 && (bytes + file.size > BATCH_BYTES || current.length >= BATCH_FILES)) {
      out.push(current);
      current = [];
      bytes = 0;
    }
    current.push(file);
    bytes += file.size;
  }
  if (current.length > 0) out.push(current);
  return out;
}

async function readBytes(ctx: OrgContext, ids: string[]): Promise<Map<string, Buffer>> {
  const rows = await withOrgContext(ctx, (tx) =>
    tx
      .select({ id: activityFiles.id, bytes: activityFiles.bytes })
      .from(activityFiles)
      .where(inArray(activityFiles.id, ids)),
  );
  return new Map(rows.map((row) => [row.id, row.bytes]));
}

/**
 * The archive as a stream. A file deleted between the list and its batch
 * is left out rather than failing the download.
 */
export function filesZipStream(ctx: OrgContext, files: ExportFile[]): ReadableStream<Uint8Array> {
  const folders = riderFolders(files);
  const queue = batches(files);
  const zip = new ZipWriter();
  let finished = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const batch = queue.shift();
      if (!batch) {
        if (!finished) {
          finished = true;
          controller.enqueue(new Uint8Array(zip.finish()));
        }
        controller.close();
        return;
      }
      const bytes = await readBytes(
        ctx,
        batch.map((file) => file.id),
      );
      for (const file of batch) {
        const data = bytes.get(file.id);
        if (!data) continue;
        const modified = new Date(`${file.onDate}T12:00:00Z`);
        for (const part of zip.add({ name: archivePath(file, folders), data, modified })) {
          controller.enqueue(new Uint8Array(part.buffer, part.byteOffset, part.length));
        }
      }
    },
  });
}
