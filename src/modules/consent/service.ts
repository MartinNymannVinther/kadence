import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import { consents, memberships, organizations } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";

/**
 * Consent in one person's own workspace (docs/adr/0088): the terms and the
 * explicit consent to health data (GDPR art. 9(2)(a)) given when they
 * created it through door 2, and the withdrawal of the second under
 * Indstillinger → Data. A club's riders rest on the club's own basis
 * (the data processing agreement), so a club has no rows here and nothing
 * in it is switched off.
 */

/**
 * The version of the words a consent was given to. Bumped whenever the
 * texts under `auth.self.terms*` and `auth.self.health*` change, so a row
 * says which words the person read.
 */
export const CONSENT_VERSION = "2026-10";

export type ConsentLocale = "da" | "en";

/** The two yeses door 2 asks for, written as the new owner right after the workspace exists. */
export async function recordSignupConsents(
  ctx: OrgContext,
  input: { riderId: string | null; locale: ConsentLocale },
): Promise<void> {
  const row = { orgId: ctx.orgId, userId: ctx.userId, riderId: input.riderId };
  await withOrgContext(ctx, (tx) =>
    tx.insert(consents).values([
      { ...row, kind: "terms", version: CONSENT_VERSION, locale: input.locale },
      { ...row, kind: "health", version: CONSENT_VERSION, locale: input.locale },
    ]),
  );
}

/**
 * Whether the active workspace's consent to health data has been
 * withdrawn: it has health consents and none of them stands. Asked of
 * `app_health_consent_withdrawn()`, which answers any member of the
 * workspace — a child who rides in their parent's workspace too — with
 * this one boolean and nothing else (drizzle/0050).
 */
export async function healthConsentWithdrawn(tx: AppTransaction): Promise<boolean> {
  const result = await tx.execute<{ withdrawn: boolean }>(
    sql`select app_health_consent_withdrawn() as withdrawn`,
  );
  return Boolean(result.rows[0]?.withdrawn);
}

/** Refuses a check-in or a measurement once the consent to health data is withdrawn. */
export async function requireHealthConsent(tx: AppTransaction): Promise<void> {
  if (await healthConsentWithdrawn(tx)) throw new Refused("forbidden", "consentWithdrawn");
}

/** The same question outside a write, for a page that shows what is off. */
export async function isHealthConsentWithdrawn(ctx: OrgContext): Promise<boolean> {
  return withOrgContext(ctx, healthConsentWithdrawn);
}

export type HealthConsent =
  { state: "none" } | { state: "given"; givenAt: Date } | { state: "withdrawn"; withdrawnAt: Date };

/** Only the owner of a personal workspace holds its consent, and gives or withdraws it. */
async function holdsConsent(tx: AppTransaction, ctx: OrgContext): Promise<boolean> {
  const [row] = await tx
    .select({ kind: organizations.kind, role: memberships.role })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(and(eq(memberships.organizationId, ctx.orgId), eq(memberships.userId, ctx.userId)))
    .limit(1);
  return row?.kind === "personal" && row.role === "owner";
}

/** The person's own health consent here: none, standing, or withdrawn. Their own rows only. */
export async function myHealthConsent(ctx: OrgContext): Promise<HealthConsent> {
  return withOrgContext(ctx, async (tx) => {
    const [last] = await tx
      .select({ givenAt: consents.givenAt, withdrawnAt: consents.withdrawnAt })
      .from(consents)
      .where(and(eq(consents.kind, "health"), eq(consents.userId, ctx.userId)))
      .orderBy(desc(consents.givenAt))
      .limit(1);
    if (!last) return { state: "none" };
    return last.withdrawnAt
      ? { state: "withdrawn", withdrawnAt: last.withdrawnAt }
      : { state: "given", givenAt: last.givenAt };
  });
}

/**
 * "Træk samtykket til helbredsoplysninger tilbage": the standing consent
 * gets its `withdrawn_at`. From then on the wellbeing services refuse a
 * check-in or a measurement in this workspace. What is already stored is
 * not deleted here (docs/adr/0088): the person can export it and delete
 * it with their account. Answers whether anything was withdrawn.
 */
export async function withdrawHealthConsent(ctx: OrgContext): Promise<boolean> {
  return withOrgContext(ctx, async (tx) => {
    if (!(await holdsConsent(tx, ctx))) throw new Refused("forbidden");
    const rows = await tx
      .update(consents)
      .set({ withdrawnAt: sql`now()` })
      .where(
        and(
          eq(consents.kind, "health"),
          eq(consents.userId, ctx.userId),
          isNull(consents.withdrawnAt),
        ),
      )
      .returning({ id: consents.id });
    return rows.length > 0;
  });
}

/**
 * "Giv samtykke igen": a new row, about the same rider as the last one,
 * to the words of today's version. Only after a withdrawal: a person who
 * never gave one (a workspace from before door 2) has nothing switched
 * off and nothing to give again here.
 */
export async function giveHealthConsentAgain(
  ctx: OrgContext,
  locale: ConsentLocale,
): Promise<boolean> {
  return withOrgContext(ctx, async (tx) => {
    if (!(await holdsConsent(tx, ctx))) throw new Refused("forbidden");
    const [last] = await tx
      .select({ riderId: consents.riderId, withdrawnAt: consents.withdrawnAt })
      .from(consents)
      .where(and(eq(consents.kind, "health"), eq(consents.userId, ctx.userId)))
      .orderBy(desc(consents.givenAt))
      .limit(1);
    if (!last?.withdrawnAt) return false;
    await tx.insert(consents).values({
      orgId: ctx.orgId,
      userId: ctx.userId,
      riderId: last.riderId,
      kind: "health",
      version: CONSENT_VERSION,
      locale,
    });
    return true;
  });
}

/** Whether the caller may give or withdraw this workspace's consent; for the pages. */
export async function holdsHealthConsent(ctx: OrgContext): Promise<boolean> {
  return withOrgContext(ctx, (tx) => holdsConsent(tx, ctx));
}
