import { Refused } from "@/core/action";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { peekRateLimit, rateLimit } from "@/core/rate-limit";
import { whoAmIIn } from "@/modules/team/access";
import { importFit } from "./import";
import { STORED_FILES_PER_HOUR, storedFilesKey } from "./ingest";
import { storedName } from "./ingest-request";

/**
 * A ride shared to Kadence from the phone's share sheet (ADR 0029): the
 * installed app is a share target, the phone posts the file, and it is
 * imported for the rider who is signed in — their own rides only, since a
 * share cannot say whose ride it is. The answer is a place to land: the
 * ride itself when one came in, today's page with a sentence otherwise.
 */

export const MAX_SHARED_FILES = 3;
const HOUR = 60 * 60 * 1000;

export type SharedFile = { name: string; bytes: Uint8Array };

export type SharedOutcome =
  | { kind: "imported"; activityIds: string[] }
  | { kind: "duplicate" }
  | { kind: "refused"; reason: string }
  | { kind: "not_a_rider" }
  | { kind: "rate_limited" }
  | { kind: "no_file" };

/** The rider who is sharing: their rider's id, or null for a coach, a parent and anyone else. */
export async function sharingRider(ctx: OrgContext): Promise<string | null> {
  const me = await withOrgContext(ctx, (tx) => whoAmIIn(tx, ctx));
  return me?.rider?.id ?? null;
}

export async function importShared(ctx: OrgContext, files: SharedFile[]): Promise<SharedOutcome> {
  const riderId = await sharingRider(ctx);
  if (!riderId) return { kind: "not_a_rider" };
  if (files.length === 0) return { kind: "no_file" };

  const stored = storedFilesKey(ctx.userId);
  const activityIds: string[] = [];
  const refusals: string[] = [];
  let limited = false;
  for (const file of files.slice(0, MAX_SHARED_FILES)) {
    if (!(await peekRateLimit(stored, STORED_FILES_PER_HOUR)).allowed) {
      limited = true;
      continue;
    }
    const { name, own } = storedName(file.name, file.bytes);
    try {
      const imported = await importFit(ctx, riderId, name, file.bytes, {
        source: "fit",
        unnamed: !own,
      });
      await rateLimit(stored, STORED_FILES_PER_HOUR, HOUR);
      activityIds.push(imported.activityId);
    } catch (error) {
      if (!(error instanceof Refused)) throw error;
      refusals.push(error.detail ?? error.code);
    }
  }
  if (activityIds.length > 0) return { kind: "imported", activityIds };
  if (refusals.length > 0 && refusals.every((r) => r === "duplicate")) return { kind: "duplicate" };
  const reason = refusals.find((r) => r !== "duplicate");
  if (reason) return { kind: "refused", reason };
  return limited ? { kind: "rate_limited" } : { kind: "no_file" };
}

/** Where the rider lands after sharing: the ride, or today's page with what happened. */
export function sharedLanding(outcome: SharedOutcome): string {
  if (outcome.kind === "imported") {
    const [only] = outcome.activityIds;
    return outcome.activityIds.length === 1 && only
      ? `/activities/${encodeURIComponent(only)}`
      : `/today?shared=imported&count=${outcome.activityIds.length}`;
  }
  if (outcome.kind === "refused")
    return `/today?shared=refused&reason=${encodeURIComponent(outcome.reason)}`;
  return `/today?shared=${outcome.kind}`;
}
