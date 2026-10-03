import { and, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { Refused } from "@/core/action";
import { orgImages } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { requireCoach } from "./access";
import { acceptImage, type ImageKind } from "./image-format";

/**
 * A club's logo and picture (docs/adr/0048). Everyone in the team sees
 * them; a coach changes them. The database holds the same line with RLS
 * (drizzle/0019), so a member who is not a coach is refused twice.
 */

export async function saveOrgImage(ctx: OrgContext, kind: ImageKind, bytes: Uint8Array) {
  const accepted = acceptImage(kind, bytes);
  if (!accepted.ok) throw new Refused("invalid", accepted.reason);
  const { mime, width, height } = accepted.info;
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    await tx
      .insert(orgImages)
      .values({
        orgId: ctx.orgId,
        kind,
        mime,
        bytes: Buffer.from(bytes),
        width,
        height,
        updatedBy: ctx.userId,
      })
      .onConflictDoUpdate({
        target: [orgImages.orgId, orgImages.kind],
        set: {
          mime,
          bytes: Buffer.from(bytes),
          width,
          height,
          updatedBy: ctx.userId,
          updatedAt: sql`now()`,
        },
      });
  });
}

export async function removeOrgImage(ctx: OrgContext, kind: ImageKind): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    await tx.delete(orgImages).where(and(eq(orgImages.orgId, ctx.orgId), eq(orgImages.kind, kind)));
  });
}

export type StoredImage = { mime: string; bytes: Buffer; updatedAt: Date };

export async function getOrgImage(ctx: OrgContext, kind: ImageKind): Promise<StoredImage | null> {
  const [row] = await withOrgContext(ctx, (tx) =>
    tx
      .select({ mime: orgImages.mime, bytes: orgImages.bytes, updatedAt: orgImages.updatedAt })
      .from(orgImages)
      .where(and(eq(orgImages.orgId, ctx.orgId), eq(orgImages.kind, kind)))
      .limit(1),
  );
  return row ?? null;
}

/**
 * The club's images as addresses the page can show, without their bytes.
 * The address carries the time of the last change, so a browser may keep
 * an image for good and still sees a new one at once. Once per request:
 * the layout and the page both ask.
 */
export const orgImageUrls = cache(
  async (ctx: OrgContext): Promise<Record<ImageKind, string | null>> =>
    imageUrlsFor(ctx.orgId, ctx.userId),
);

const imageUrlsFor = cache(async (orgId: string, userId: string) => {
  const rows = await withOrgContext({ orgId, userId }, (tx) =>
    tx
      .select({ kind: orgImages.kind, updatedAt: orgImages.updatedAt })
      .from(orgImages)
      .where(eq(orgImages.orgId, orgId)),
  );
  const url = (kind: ImageKind) => {
    const row = rows.find((r) => r.kind === kind);
    return row ? `/api/org/image/${kind}?v=${row.updatedAt.getTime()}` : null;
  };
  return { logo: url("logo"), cover: url("cover") };
});
