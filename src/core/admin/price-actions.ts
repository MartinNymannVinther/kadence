"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { errorName, log } from "@/core/log";
import { MAX_BUDGET_MICRO } from "./ai-budget";
import { MAX_QUOTA_BYTES } from "./file-quota";
import { setPricePlan } from "./prices";

export type PriceResult =
  { ok: true } | { ok: false; error: "unauthorized" | "invalid" | "generic" };

const kroner = z.number().int().min(0).max(1_000_000);

const PriceInput = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9-]{0,29}$/),
    nameDa: z.string().trim().min(1).max(60),
    nameEn: z.string().trim().min(1).max(60),
    priceYearDkk: kroner,
    /** Both or neither: a price that grows past the riders it includes. */
    perRiderDkk: kroner.nullable(),
    includedRiders: z.number().int().min(0).max(10_000).nullable(),
    /** Euro a month, as the owner thinks of it; micro-euro in the database. */
    aiBudgetEuros: z
      .number()
      .finite()
      .min(0)
      .max(MAX_BUDGET_MICRO / 1_000_000),
    /** Decimal gigabytes, as price_plans was seeded (2 GB is 2,000,000,000 bytes). */
    fileQuotaGb: z
      .number()
      .finite()
      .min(0)
      .max(MAX_QUOTA_BYTES / 1e9),
    vatIncluded: z.boolean(),
    validFrom: z.iso.date(),
  })
  .refine((v) => (v.perRiderDkk === null) === (v.includedRiders === null));

/**
 * The owner saves a plan's price (docs/adr/0090): the caller is resolved
 * here, the input checked here — a day that has passed is refused, since
 * a price is never changed backwards — and set_price_plan() checks the
 * owner and the day once more.
 */
export async function savePricePlanAction(input: unknown): Promise<PriceResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const parsed = PriceInput.safeParse(input);
  if (!parsed.success || parsed.data.validFrom < todayInCopenhagen())
    return { ok: false, error: "invalid" };
  const { aiBudgetEuros, fileQuotaGb, ...rest } = parsed.data;
  try {
    const done = await setPricePlan(session.user.id, {
      ...rest,
      aiBudgetMicro: Math.round(aiBudgetEuros * 1_000_000),
      fileQuotaBytes: Math.round(fileQuotaGb * 1e9),
    });
    if (done === "unauthorized") return { ok: false, error: "unauthorized" };
    revalidatePath("/settings/installation/prices");
    return { ok: true };
  } catch (error) {
    await log.error("installation: setting a price failed", { error: errorName(error) });
    return { ok: false, error: "generic" };
  }
}
