"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_BUDGET_MICRO, setAiBudget } from "./ai-budget";
import { registerPayment, setPlanFree } from "./billing";
import { MAX_QUOTA_BYTES, setFileQuota } from "./file-quota";
import { getSession } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { errorName, log } from "@/core/log";

export type BudgetResult =
  { ok: true } | { ok: false; error: "unauthorized" | "invalid" | "generic" };

const BudgetInput = z.object({
  orgId: z.string().trim().min(1).max(200),
  /** Euro; null gives the workspace the installation's default back. */
  euros: z
    .number()
    .finite()
    .min(0)
    .max(MAX_BUDGET_MICRO / 1_000_000)
    .nullable(),
});

/**
 * The owner sets a workspace's monthly AI budget (docs/adr/0089). The
 * caller is resolved here, the input is checked here, and the database
 * function checks the owner once more; anyone else gets "unauthorized".
 */
export async function setAiBudgetAction(input: unknown): Promise<BudgetResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const parsed = BudgetInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { orgId, euros } = parsed.data;
  try {
    const done = await setAiBudget(
      session.user.id,
      orgId,
      euros === null ? null : Math.round(euros * 1_000_000),
    );
    if (done === "unauthorized") return { ok: false, error: "unauthorized" };
    revalidatePath("/settings/installation");
    return { ok: true };
  } catch (error) {
    await log.error("installation: setting an AI budget failed", { error: errorName(error) });
    return { ok: false, error: "generic" };
  }
}

const QuotaInput = z.object({
  orgId: z.string().trim().min(1).max(200),
  /** Bytes; null gives the workspace the installation's default back. */
  bytes: z.number().int().min(0).max(MAX_QUOTA_BYTES).nullable(),
});

/**
 * The owner sets a workspace's file quota (docs/adr/0087), the same way
 * as the budget above: caller resolved here, input checked here, the
 * database function checks the owner once more.
 */
export async function setFileQuotaAction(input: unknown): Promise<BudgetResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const parsed = QuotaInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    const done = await setFileQuota(session.user.id, parsed.data.orgId, parsed.data.bytes);
    if (done === "unauthorized") return { ok: false, error: "unauthorized" };
    revalidatePath("/settings/installation");
    return { ok: true };
  } catch (error) {
    await log.error("installation: setting a file quota failed", { error: errorName(error) });
    return { ok: false, error: "generic" };
  }
}

export type BillingResult =
  { ok: true } | { ok: false; error: "unauthorized" | "invalid" | "generic" };

const day = z.iso.date();
const PaymentInputSchema = z
  .object({
    orgId: z.string().trim().min(1).max(200),
    /** Whole kroner, VAT included; the VAT in it beside. */
    amountDkk: z.number().int().min(0).max(10_000_000),
    vatDkk: z.number().int().min(0).max(10_000_000),
    invoiceNo: z.string().trim().min(1).max(100),
    periodFrom: day,
    periodTo: day,
    note: z.string().trim().max(500).nullable(),
  })
  .refine((v) => v.vatDkk <= v.amountDkk && v.periodTo >= v.periodFrom);

/**
 * The owner registers a payment that came in by bank transfer (docs/adr/
 * 0090): caller resolved here, input checked here, and set_payment()
 * checks the owner once more and moves the workspace to paid.
 */
export async function registerPaymentAction(input: unknown): Promise<BillingResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const parsed = PaymentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    const done = await registerPayment(session.user.id, {
      ...parsed.data,
      note: parsed.data.note || null,
    });
    if (done === "unauthorized") return { ok: false, error: "unauthorized" };
    revalidatePath("/settings/installation/billing");
    return { ok: true };
  } catch (error) {
    await log.error("installation: registering a payment failed", { error: errorName(error) });
    return { ok: false, error: "generic" };
  }
}

const FreeInput = z.object({
  orgId: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(1).max(60),
  /** The last day it is free, a Copenhagen day; null is free until the owner decides otherwise. */
  throughDay: day.nullable(),
});

/** The owner makes a workspace free (docs/adr/0090), checked here and by set_plan_free(). */
export async function setPlanFreeAction(input: unknown): Promise<BillingResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const parsed = FreeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (parsed.data.throughDay && parsed.data.throughDay < todayInCopenhagen())
    return { ok: false, error: "invalid" };
  try {
    const done = await setPlanFree(session.user.id, parsed.data);
    if (done === "unauthorized") return { ok: false, error: "unauthorized" };
    revalidatePath("/settings/installation/billing");
    return { ok: true };
  } catch (error) {
    await log.error("installation: making a workspace free failed", { error: errorName(error) });
    return { ok: false, error: "generic" };
  }
}
