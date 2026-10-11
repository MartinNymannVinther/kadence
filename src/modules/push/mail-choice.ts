import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { mailPreferences } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { mailConfigured } from "@/core/mail/mailer";
import type { MailLocale } from "@/core/mail/words";
import { whoAmIIn, type Me } from "@/modules/team/access";
import { visibleChildren } from "./facts";

/**
 * The parents' week "også på mail" (docs/adr/0086, beside ADR 0060's
 * push): a parent's own choice on one team, kept in `mail_preferences`,
 * which only the person can read or change (drizzle/0048). Offered to a
 * parent of a rider who has said yes and shares their training — the
 * people the push's week is offered to — and only where the installation
 * sends mail. The mail goes to the account's own address.
 */

export const WeekMailInput = z.object({ on: z.boolean() });

export type WeekMailState = { on: boolean; email: string | null };

/** Whether the week by mail means anything to this person on this team. */
export function weekMailOffered(me: Me | null): boolean {
  return Boolean(me && visibleChildren(me).length > 0);
}

const mine = (ctx: OrgContext) =>
  and(eq(mailPreferences.orgId, ctx.orgId), eq(mailPreferences.userId, ctx.userId));

/** The person's own address, from the one door to it (drizzle/0034). */
export async function ownAddress(tx: AppTransaction, ctx: OrgContext): Promise<string | null> {
  const result = await tx.execute(
    sql`select email from team_member_addresses() where user_id = ${ctx.userId}`,
  );
  return (result.rows[0] as { email: string | null } | undefined)?.email ?? null;
}

async function stateIn(tx: AppTransaction, ctx: OrgContext): Promise<WeekMailState> {
  const [row] = await tx
    .select({ week: mailPreferences.week })
    .from(mailPreferences)
    .where(mine(ctx));
  return { on: row?.week ?? false, email: await ownAddress(tx, ctx) };
}

export async function weekMailState(ctx: OrgContext): Promise<WeekMailState> {
  return withOrgContext(ctx, (tx) => stateIn(tx, ctx));
}

/** Turns the week by mail on, in the language of the page it was chosen on, or off. */
export async function setWeekMail(
  ctx: OrgContext,
  on: boolean,
  locale: MailLocale,
): Promise<WeekMailState> {
  if (!mailConfigured()) throw new Refused("notFound");
  return withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me) throw new Refused("forbidden");
    if (on) {
      if (!weekMailOffered(me)) throw new Refused("forbidden");
      await tx
        .insert(mailPreferences)
        .values({ orgId: ctx.orgId, userId: ctx.userId, week: true, locale })
        .onConflictDoUpdate({
          target: [mailPreferences.orgId, mailPreferences.userId],
          set: { week: true, locale },
        });
    } else {
      // Nothing is kept about a choice that is off.
      await tx.delete(mailPreferences).where(mine(ctx));
    }
    return stateIn(tx, ctx);
  });
}

/** Leaving a team: the person's choice there goes with them, deleted as them. */
export async function forgetMailChoice(ctx: OrgContext): Promise<void> {
  await withOrgContext(ctx, (tx) => tx.delete(mailPreferences).where(mine(ctx)));
}
