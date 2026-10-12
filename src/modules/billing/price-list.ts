import { sql } from "drizzle-orm";
import { cache } from "react";
import { appDb } from "@/core/db/client";

/**
 * The installation's price list as it stands today (docs/adr/0090,
 * drizzle/0053): for each plan the row with the latest `valid_from` that
 * has come, as `price_plans_now()` picks it, so a price set for a later
 * day waits until that day and an older one stays readable as history.
 * Read without anybody signed in — the table is the installation's and
 * every runtime context may read it — by the open price page and the
 * front page; the database decides which row is today's, so the pages,
 * the workspace's price and the plan's budgets agree.
 */

export type PricePlanRow = {
  key: string;
  nameDa: string;
  nameEn: string;
  priceYearDkk: number;
  perRiderDkk: number | null;
  includedRiders: number | null;
  aiBudgetMicro: number;
  fileQuotaBytes: number;
  vatIncluded: boolean;
  validFrom: string;
};

type Raw = {
  key: string;
  name_da: string;
  name_en: string;
  price_year_dkk: number | string;
  per_rider_dkk: number | string | null;
  included_riders: number | string | null;
  ai_budget_micro: number | string;
  file_quota_bytes: number | string;
  vat_included: boolean;
  valid_from: string;
};

const orNull = (v: number | string | null) => (v === null ? null : Number(v));

/** The columns, with the day as text so no driver turns it into a moment. */
const COLUMNS = sql.raw(
  "key, name_da, name_en, price_year_dkk, per_rider_dkk, included_riders, ai_budget_micro, file_quota_bytes, vat_included, valid_from::text as valid_from",
);

export function pricePlanFrom(r: Raw): PricePlanRow {
  return {
    key: r.key,
    nameDa: r.name_da,
    nameEn: r.name_en,
    priceYearDkk: Number(r.price_year_dkk),
    perRiderDkk: orNull(r.per_rider_dkk),
    includedRiders: orNull(r.included_riders),
    aiBudgetMicro: Number(r.ai_budget_micro),
    fileQuotaBytes: Number(r.file_quota_bytes),
    vatIncluded: r.vat_included,
    validFrom: r.valid_from,
  };
}

/** Today's price for every plan, by key. Once per request. */
export const currentPricePlans = cache(async (): Promise<PricePlanRow[]> => {
  const result = await appDb.execute(sql`select ${COLUMNS} from price_plans_now() order by key`);
  return (result.rows as Raw[]).map(pricePlanFrom);
});

/** Every row, today's and the history and any set for a later day: newest first within a plan. */
export async function allPricePlanRows(): Promise<PricePlanRow[]> {
  const result = await appDb.execute(
    sql`select ${COLUMNS} from price_plans order by key, valid_from desc`,
  );
  return (result.rows as Raw[]).map(pricePlanFrom);
}
