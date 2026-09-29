import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, isNull, lt, ne, or, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import { appDb } from "@/core/db/client";
import { riders, uploadKeys } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { rateLimit } from "@/core/rate-limit";
import { whoAmIIn } from "@/modules/team/access";

/**
 * A rider's upload keys (docs/adr/0029): the `upload_keys` rows. A key
 * lets a helper — a script on the family's computer, an app on the
 * phone — hand a ride file to Kadence with nobody signed in
 * (src/modules/devices/ingest.ts). The rider makes and removes their
 * own, a coach may see that one exists and remove it, nobody else sees
 * it (drizzle/0014). A key goes with the rider when the rider is
 * archived or the row passes to another account: the database removes
 * it there and then.
 *
 * The key is shown once, when it is made, and stored only as a hash, the
 * way an invitation key is: a leaked database hands nobody a way in. It
 * carries 32 random bytes, so a plain sha256 is enough; there is nothing
 * to guess and nothing to stretch.
 */

/** What every key starts with, so a person and a secrets scanner can tell what it is. */
export const KEY_PREFIX = "kad_";
const KEY_PATTERN = /^kad_[A-Za-z0-9_-]{43}$/;

/** A rider has a handful of helpers, not a hundred. */
export const MAX_KEYS_PER_RIDER = 5;

/** Keys one person may make in an hour: making and removing is not a way around a limit. */
const MADE_PER_HOUR = 10;

/** A use is noted at most this often, so a folder sent in one go is one note. */
const NOTE_EVERY_MS = 60_000;

export function hashUploadKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function newUploadKey(): { key: string; hash: string; hint: string } {
  const key = KEY_PREFIX + randomBytes(32).toString("base64url");
  return { key, hash: hashUploadKey(key), hint: key.slice(-4) };
}

/** Shaped like a key. Anything else is refused without asking the database. */
export function looksLikeUploadKey(value: string): boolean {
  return KEY_PATTERN.test(value);
}

export type UploadKeyView = {
  id: string;
  name: string;
  hint: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  lastError: string;
};

/**
 * Makes a key for the caller's own rider and answers with the key
 * itself, this once. Only a rider has one: a coach cannot make a key in
 * a rider's name, and the database would refuse it anyway.
 */
export async function createUploadKey(
  ctx: OrgContext,
  name: string,
): Promise<{ id: string; key: string }> {
  const label = name.trim();
  if (label.length < 1 || label.length > 60) throw new Refused("invalid");
  return withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me?.rider) throw new Refused("forbidden", "not_a_rider");
    const riderId = me.rider.id;
    if (!rateLimit(`upload-key-made:${ctx.userId}`, MADE_PER_HOUR, 60 * 60 * 1000).allowed)
      throw new Refused("conflict", "too_many_keys_made");
    // The rider's row is held while the keys are counted, so two presses
    // at once cannot both be the fifth.
    await tx.select({ id: riders.id }).from(riders).where(eq(riders.id, riderId)).for("update");
    const [held] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(uploadKeys)
      .where(eq(uploadKeys.riderId, riderId));
    if ((held?.n ?? 0) >= MAX_KEYS_PER_RIDER) throw new Refused("conflict", "too_many_keys");
    const made = newUploadKey();
    const [row] = await tx
      .insert(uploadKeys)
      .values({
        orgId: ctx.orgId,
        riderId,
        name: label,
        keyHash: made.hash,
        hint: made.hint,
        createdBy: ctx.userId,
      })
      .returning({ id: uploadKeys.id });
    return { id: row!.id, key: made.key };
  });
}

/**
 * A rider's keys — the caller's own unless a coach names a rider — with
 * how each is doing and never its hash. A guardian or a teammate sees
 * none: the database does not show them one.
 */
export async function listUploadKeys(ctx: OrgContext, riderId?: string): Promise<UploadKeyView[]> {
  return withOrgContext(ctx, async (tx) => {
    const target = riderId ?? (await whoAmIIn(tx, ctx))?.rider?.id;
    if (!target) return [];
    return tx
      .select({
        id: uploadKeys.id,
        name: uploadKeys.name,
        hint: uploadKeys.hint,
        createdAt: uploadKeys.createdAt,
        lastUsedAt: uploadKeys.lastUsedAt,
        lastError: uploadKeys.lastError,
      })
      .from(uploadKeys)
      .where(eq(uploadKeys.riderId, target))
      .orderBy(asc(uploadKeys.createdAt));
  });
}

/** Removes a key: the rider's own, or any rider's for a coach. The key is dead at once. */
export async function removeUploadKey(ctx: OrgContext, keyId: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const gone = await tx
      .delete(uploadKeys)
      .where(eq(uploadKeys.id, keyId))
      .returning({ id: uploadKeys.id });
    if (gone.length === 0) throw new Refused("notFound");
  });
}

export type KeyOwner = { keyId: string; orgId: string; riderId: string; riderUserId: string };

/**
 * Whose key this is, for a file that arrives with nobody signed in:
 * `upload_key_owner` (drizzle/0014), the one definer that answers it,
 * with four ids and nothing else. The key is hashed here and never
 * reaches the database or a log.
 */
export async function uploadKeyOwner(key: string): Promise<KeyOwner | null> {
  if (!looksLikeUploadKey(key)) return null;
  const result = await appDb.execute(
    sql`select key_id, org_id, rider_id, rider_user_id from upload_key_owner(${hashUploadKey(key)})`,
  );
  const row = result.rows[0] as
    { key_id: string; org_id: string; rider_id: string; rider_user_id: string } | undefined;
  return row
    ? {
        keyId: row.key_id,
        orgId: row.org_id,
        riderId: row.rider_id,
        riderUserId: row.rider_user_id,
      }
    : null;
}

/**
 * Notes on the key that it was used, in the rider's name, and how the
 * file went: a short code, or "" when it went well. Without a code — a
 * helper only asked whether its key works — what is known about the last
 * file stands. Written when the outcome changed or a minute has passed,
 * so a folder of rides sent in one go leaves one note in the audit trail
 * and not three hundred.
 */
export async function noteKeyUse(
  owner: KeyOwner,
  lastError?: string,
  now: Date = new Date(),
): Promise<void> {
  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  const due = or(
    isNull(uploadKeys.lastUsedAt),
    lt(uploadKeys.lastUsedAt, new Date(now.getTime() - NOTE_EVERY_MS)),
  );
  await withOrgContext(riderCtx, (tx) =>
    tx
      .update(uploadKeys)
      .set(lastError === undefined ? { lastUsedAt: now } : { lastUsedAt: now, lastError })
      .where(
        and(
          eq(uploadKeys.id, owner.keyId),
          lastError === undefined ? due : or(due, ne(uploadKeys.lastError, lastError)),
        ),
      ),
  );
}
