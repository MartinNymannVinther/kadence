import { sql } from "drizzle-orm";
import { cache } from "react";
import { Refused } from "@/core/action";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { env } from "@/core/env";

/**
 * How much file a workspace holds and may hold (docs/adr/0087). The
 * database adds the workspace's files up in `workspace_file_usage()`
 * (drizzle/0051) for any member of it — a rider sees only their own rows
 * under RLS, and the quota is the workspace's — and answers the sum, the
 * quota the owner set, and the workspace's kind, from which the
 * installation's default follows: FILES_QUOTA_CLUB_BYTES for a club,
 * FILES_QUOTA_PERSONAL_BYTES for one person (Martin's choice, 11 October
 * 2026: 20 GiB and 2 GiB). A quota of 0 is no quota.
 *
 * Every door a file comes in by passes `assertFileRoom` inside the import
 * (src/modules/devices/import.ts), so the upload, the upload key, a
 * Strava archive, a share from the phone, Rulle and a device's webhook
 * are all refused the same way: `Refused("invalid", "quota")`, which the
 * pages word as "Pladsen til filer er brugt".
 */

export const QUOTA_REFUSAL = "quota";

export type FileQuota = {
  usedBytes: number;
  /** Null is no quota. */
  quotaBytes: number | null;
  kind: "club" | "personal";
  /** Whether the quota the workspace has is its own or the installation's default. */
  own: boolean;
};

/** The installation's default for a workspace of this kind; null for none. */
export function defaultQuotaBytes(kind: "club" | "personal"): number | null {
  const value = kind === "personal" ? env.FILES_QUOTA_PERSONAL_BYTES : env.FILES_QUOTA_CLUB_BYTES;
  return value > 0 ? value : null;
}

export async function fileQuotaIn(tx: AppTransaction): Promise<FileQuota> {
  const result = await tx.execute(
    sql`select used_bytes, quota_bytes, kind from workspace_file_usage()`,
  );
  const row = result.rows[0] as
    { used_bytes: string | number; quota_bytes: string | number | null; kind: string } | undefined;
  const kind = row?.kind === "personal" ? "personal" : "club";
  const own = row?.quota_bytes !== null && row?.quota_bytes !== undefined;
  const quota = own ? Number(row!.quota_bytes) : defaultQuotaBytes(kind);
  return {
    usedBytes: Number(row?.used_bytes ?? 0),
    quotaBytes: quota !== null && quota > 0 ? quota : null,
    kind,
    own,
  };
}

/** The workspace's files and quota, once per request. */
export const fileQuota = cache(async (ctx: OrgContext): Promise<FileQuota> => {
  return withOrgContext(ctx, fileQuotaIn);
});

/** Refuses a file that would take the workspace past its quota. */
export async function assertFileRoom(tx: AppTransaction, bytes: number): Promise<void> {
  const quota = await fileQuotaIn(tx);
  if (quota.quotaBytes !== null && quota.usedBytes + bytes > quota.quotaBytes)
    throw new Refused("invalid", QUOTA_REFUSAL);
}

/** Whether a refusal is the quota's: the doors answer it as "no room", not "a bad file". */
export function isQuotaRefusal(error: unknown): boolean {
  return error instanceof Refused && error.detail === QUOTA_REFUSAL;
}
