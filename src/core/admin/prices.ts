import { sql } from "drizzle-orm";
import { isPlatformOwner } from "@/core/access/service";
import { asOwner } from "./billing";

/**
 * Installation → Priser (docs/adr/0090, backlog S-12b): the installation's
 * owner changes a plan's price, what it includes, its AI budget and its
 * file quota. A change is a new row from the day it takes effect — today,
 * or a later day — so the price an invoice was written from stays
 * readable; a second change on the same day replaces that day's row.
 * set_price_plan() (drizzle/0053) checks the owner once more, refuses a
 * day that has passed, and the audit trigger on price_plans records it.
 */

export type PricePlanInput = {
  key: string;
  nameDa: string;
  nameEn: string;
  priceYearDkk: number;
  perRiderDkk: number | null;
  includedRiders: number | null;
  aiBudgetMicro: number;
  fileQuotaBytes: number;
  vatIncluded: boolean;
  /** The Copenhagen day the price takes effect: today or later. */
  validFrom: string;
};

export async function setPricePlan(
  userId: string,
  input: PricePlanInput,
): Promise<"ok" | "unauthorized"> {
  if (!(await isPlatformOwner(userId))) return "unauthorized";
  await asOwner(userId, (tx) =>
    tx.execute(
      sql`select set_price_plan(${input.key}, ${input.nameDa}, ${input.nameEn},
        ${input.priceYearDkk}::integer, ${input.perRiderDkk}::integer, ${input.includedRiders}::integer,
        ${input.aiBudgetMicro}::bigint, ${input.fileQuotaBytes}::bigint, ${input.vatIncluded},
        ${input.validFrom}::date)`,
    ),
  );
  return "ok";
}
