import { desc, sql } from "drizzle-orm";
import { isPlatformOwner } from "@/core/access/service";
import { appDb } from "@/core/db/client";
import { payments } from "@/core/db/schema";
import type { AppTransaction } from "@/core/db/tenant";
import { isPlanState, type PlanState } from "@/modules/billing/which-plan";

/**
 * Installation → Betaling (docs/adr/0090): the installation's owner sees
 * what every workspace pays and registers a payment by hand, or makes a
 * workspace free. Each is asked with nothing set but who is asking, as the
 * overview is (overview.ts); the database functions billing_overview(),
 * set_payment() and set_plan_free() (drizzle/0052) check the owner once
 * more, and the policy on payments shows the owner every workspace's rows.
 * A personal workspace comes without its name, which is a person's.
 */

export type BillingRow = {
  orgId: string;
  /** Empty for a personal workspace. */
  name: string;
  kind: "club" | "personal";
  createdAt: Date;
  plan: PlanState;
  planKey: string;
  trialEndsAt: Date | null;
  paidUntil: Date | null;
  freeReason: string | null;
  freeUntil: Date | null;
  riders: number;
  /** Null when the installation has no price for the plan. */
  yearlyDkk: number | null;
  vatIncluded: boolean;
};

export type RegisteredPayment = {
  id: string;
  orgId: string;
  amountDkk: number;
  vatDkk: number;
  invoiceNo: string;
  periodFrom: string;
  periodTo: string;
  registeredAt: Date;
  note: string | null;
};

export type PaymentInput = {
  orgId: string;
  amountDkk: number;
  vatDkk: number;
  invoiceNo: string;
  periodFrom: string;
  periodTo: string;
  note: string | null;
};

type Row = {
  org_id: string;
  name: string | null;
  kind: string;
  created_at: Date | string;
  plan: string;
  plan_key: string;
  trial_ends_at: Date | string | null;
  paid_until: Date | string | null;
  free_reason: string | null;
  free_until: Date | string | null;
  riders: number | string;
  price_year_dkk: number | string | null;
  vat_included: boolean;
};

const moment = (v: Date | string | null) =>
  v === null ? null : v instanceof Date ? v : new Date(v);

/** As the owner, with nothing else in the context; the database functions check the owner again. */
export function asOwner<T>(userId: string, fn: (tx: AppTransaction) => Promise<T>): Promise<T> {
  return appDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}

/** Every workspace but the demos, with its plan and price; null for anyone but the owner. */
export async function billingOverview(userId: string): Promise<BillingRow[] | null> {
  if (!(await isPlatformOwner(userId))) return null;
  const rows = await asOwner(userId, async (tx) => {
    const result = await tx.execute(sql`select * from billing_overview()`);
    return result.rows as Row[];
  });
  return rows.map((r) => ({
    orgId: r.org_id,
    name: r.kind === "personal" ? "" : (r.name ?? ""),
    kind: r.kind === "personal" ? "personal" : "club",
    createdAt: moment(r.created_at)!,
    plan: isPlanState(r.plan) ? r.plan : "free",
    planKey: r.plan_key,
    trialEndsAt: moment(r.trial_ends_at),
    paidUntil: moment(r.paid_until),
    freeReason: r.free_reason,
    freeUntil: moment(r.free_until),
    riders: Number(r.riders),
    yearlyDkk: r.price_year_dkk === null ? null : Number(r.price_year_dkk),
    vatIncluded: r.vat_included,
  }));
}

/** The last payments registered on the installation, newest first; null for anyone but the owner. */
export async function recentPayments(
  userId: string,
  limit = 50,
): Promise<RegisteredPayment[] | null> {
  if (!(await isPlatformOwner(userId))) return null;
  return asOwner(userId, (tx) =>
    tx
      .select({
        id: payments.id,
        orgId: payments.orgId,
        amountDkk: payments.amountDkk,
        vatDkk: payments.vatDkk,
        invoiceNo: payments.invoiceNo,
        periodFrom: payments.periodFrom,
        periodTo: payments.periodTo,
        registeredAt: payments.registeredAt,
        note: payments.note,
      })
      .from(payments)
      .orderBy(desc(payments.registeredAt))
      .limit(limit),
  );
}

/** Registers a payment and moves the workspace to paid through the period's last day. */
export async function registerPayment(
  userId: string,
  input: PaymentInput,
): Promise<"ok" | "unauthorized"> {
  if (!(await isPlatformOwner(userId))) return "unauthorized";
  await asOwner(userId, (tx) =>
    tx.execute(
      sql`select set_payment(${input.orgId}, ${input.amountDkk}, ${input.vatDkk}, ${input.invoiceNo},
        ${input.periodFrom}::date, ${input.periodTo}::date, ${input.note})`,
    ),
  );
  return "ok";
}

/** Makes a workspace free, with a reason and until the end of `throughDay` (a Copenhagen day), or for good. */
export async function setPlanFree(
  userId: string,
  input: { orgId: string; reason: string; throughDay: string | null },
): Promise<"ok" | "unauthorized"> {
  if (!(await isPlatformOwner(userId))) return "unauthorized";
  await asOwner(userId, (tx) =>
    tx.execute(
      sql`select set_plan_free(${input.orgId}, ${input.reason},
        case when ${input.throughDay}::date is null then null
             else (${input.throughDay}::date + 1)::timestamp at time zone 'Europe/Copenhagen' end)`,
    ),
  );
  return "ok";
}
