import { desc, sql } from "drizzle-orm";
import { appDb } from "@/core/db/client";
import { payments } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { monthlyPrice } from "./which-plan";

/**
 * What a workspace costs and what it has paid (docs/adr/0090). The price
 * is the database's sum, `workspace_price()` (drizzle/0052), from
 * price_plans and the riders the workspace has now: for its coaches, the
 * installation's owner, and the daily job. The payments are the
 * workspace's own rows, which its owner reads and nobody else in it.
 */

export type WorkspacePrice = {
  planKey: string;
  /** Null when the installation has no row for the plan. */
  yearlyDkk: number | null;
  monthlyDkk: number | null;
  riders: number;
  includedRiders: number | null;
  perRiderDkk: number | null;
  vatIncluded: boolean;
};

export type Payment = {
  id: string;
  amountDkk: number;
  vatDkk: number;
  invoiceNo: string;
  periodFrom: string;
  periodTo: string;
  registeredAt: Date;
  note: string | null;
};

type PriceRow = {
  plan_key: string;
  price_year_dkk: number | null;
  riders: number;
  included_riders: number | null;
  per_rider_dkk: number | null;
  vat_included: boolean;
};

function priceFrom(row: PriceRow | undefined): WorkspacePrice | null {
  if (!row) return null;
  const yearly = row.price_year_dkk === null ? null : Number(row.price_year_dkk);
  return {
    planKey: row.plan_key,
    yearlyDkk: yearly,
    monthlyDkk: yearly === null ? null : monthlyPrice(yearly),
    riders: Number(row.riders),
    includedRiders: row.included_riders === null ? null : Number(row.included_riders),
    perRiderDkk: row.per_rider_dkk === null ? null : Number(row.per_rider_dkk),
    vatIncluded: row.vat_included,
  };
}

async function priceIn(tx: AppTransaction, orgId: string): Promise<WorkspacePrice | null> {
  const result = await tx.execute(sql`select * from workspace_price(${orgId})`);
  return priceFrom(result.rows[0] as PriceRow | undefined);
}

/** The active workspace's price, for one of its coaches. */
export async function workspacePrice(ctx: OrgContext): Promise<WorkspacePrice | null> {
  return withOrgContext(ctx, (tx) => priceIn(tx, ctx.orgId));
}

/** A workspace's price for the daily job, which runs with nobody signed in. */
export async function workspacePriceForJob(orgId: string): Promise<WorkspacePrice | null> {
  return appDb.transaction((tx) => priceIn(tx, orgId));
}

/** The workspace's registered payments, newest first: its owner's to read, nobody else's. */
export async function workspacePayments(ctx: OrgContext): Promise<Payment[]> {
  return withOrgContext(ctx, (tx) =>
    tx
      .select({
        id: payments.id,
        amountDkk: payments.amountDkk,
        vatDkk: payments.vatDkk,
        invoiceNo: payments.invoiceNo,
        periodFrom: payments.periodFrom,
        periodTo: payments.periodTo,
        registeredAt: payments.registeredAt,
        note: payments.note,
      })
      .from(payments)
      .orderBy(desc(payments.periodFrom), desc(payments.registeredAt))
      .limit(100),
  );
}
