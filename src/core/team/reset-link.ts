import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/core/auth/auth";
import { memberships, passwordResets, users } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { env } from "@/core/env";
import { rateLimit } from "@/core/rate-limit";

/**
 * A way back in for a member who forgot the password (docs/adr/0032): a
 * coach makes a link and passes it on by hand, the way an invitation goes.
 * It works on every installation; where there is mail, the person can
 * also ask for one at /forgot-password (docs/adr/0086). The link is Better Auth's own password
 * reset: a token in its verification table that `/reset-password` takes
 * once, within the hour, signing the person out everywhere else.
 *
 * Who may make one is the team's own rule for who may remove a member: a
 * coach, for anyone on the team but an owner and themselves. The link is
 * recorded (password_resets, drizzle/0015) under the same rule in the
 * database, and the person reads the record on their security page.
 */

export const RESET_LINK_MINUTES = 60;
const HOUR = 60 * 60 * 1000;
/** Links a coach makes in an hour, and links made for one person in an hour. */
const PER_COACH = 10;
const PER_PERSON = 5;

export type ResetLinkRefusal = "forbidden" | "notFound" | "rateLimited";
export type ResetLink = { url: string; expiresAt: Date };

async function mayMake(ctx: OrgContext, userId: string): Promise<"ok" | ResetLinkRefusal> {
  if (userId === ctx.userId) return "forbidden";
  return withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .select({ userId: memberships.userId, role: memberships.role })
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, ctx.orgId),
          inArray(memberships.userId, [ctx.userId, userId]),
        ),
      );
    const mine = rows.find((row) => row.userId === ctx.userId)?.role;
    const theirs = rows.find((row) => row.userId === userId)?.role;
    if (mine !== "owner" && mine !== "admin") return "forbidden";
    if (!theirs) return "notFound";
    return theirs === "owner" ? "forbidden" : "ok";
  });
}

export async function createResetLink(
  ctx: OrgContext,
  userId: string,
): Promise<ResetLink | ResetLinkRefusal> {
  const allowed = await mayMake(ctx, userId);
  if (allowed !== "ok") return allowed;
  if (
    !(await rateLimit(`reset-link:${ctx.userId}`, PER_COACH, HOUR)).allowed ||
    !(await rateLimit(`reset-link-for:${userId}`, PER_PERSON, HOUR)).allowed
  )
    return "rateLimited";

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_LINK_MINUTES * 60_000);
  // The record first, under the policies: the database says no to anyone else.
  await withOrgContext(ctx, (tx) =>
    tx
      .insert(passwordResets)
      .values({ orgId: ctx.orgId, userId, createdBy: ctx.userId, expiresAt }),
  );
  const context = await auth.$context;
  await context.internalAdapter.createVerificationValue({
    identifier: `reset-password:${token}`,
    value: userId,
    expiresAt,
  });
  const url = new URL("/reset-password", env.BETTER_AUTH_URL);
  url.searchParams.set("token", token);
  return { url: url.toString(), expiresAt };
}

export type ResetRecord = { createdAt: Date; byName: string };

/** The links coaches made for the person signed in, newest first: their own record of it. */
export async function listMyResets(ctx: OrgContext, limit = 5): Promise<ResetRecord[]> {
  return withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .select({ createdAt: passwordResets.createdAt, byName: users.name })
      .from(passwordResets)
      .leftJoin(users, eq(users.id, passwordResets.createdBy))
      .where(and(eq(passwordResets.orgId, ctx.orgId), eq(passwordResets.userId, ctx.userId)))
      .orderBy(desc(passwordResets.createdAt))
      .limit(limit);
    return rows.map((row) => ({ createdAt: row.createdAt, byName: row.byName ?? "" }));
  });
}
