import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PaymentsTable } from "@/components/billing/payments-table";
import { stateWords } from "@/components/billing/plan-words";
import { getOrgContext } from "@/core/auth/session";
import { env } from "@/core/env";
import { formatKroner, formatLongDay } from "@/modules/billing/dates";
import { billingOn, workspacePlan } from "@/modules/billing/plan";
import { workspacePayments, workspacePrice } from "@/modules/billing/price";
import { currentRole } from "@/modules/export/workspace";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing.subscription");
  return { title: t("title") };
}

/**
 * Indstillinger → Abonnement (docs/adr/0090): where the workspace stands —
 * free, a trial, paid or read only — in plain words with its dates; what
 * it costs them a year and a month, and the riders the price is built on;
 * that the invoice comes from Haij by mail and is paid by bank transfer
 * (no account number here: it is on the invoice, Martin's answer 5); and
 * the payments registered. The workspace's coaches read it; only its
 * owner sees the payments, which the policy on payments decides. A
 * personal workspace has it under "Dig". With BILLING=off it is a 404.
 */
export default async function SubscriptionPage() {
  if (!billingOn()) notFound();
  const ctx = await getOrgContext();
  if (!ctx) notFound();
  const role = await currentRole(ctx);
  if (role !== "owner" && role !== "admin") notFound();

  const [plan, price, payments] = await Promise.all([
    workspacePlan(ctx),
    workspacePrice(ctx),
    role === "owner" ? workspacePayments(ctx) : Promise.resolve(null),
  ]);
  const t = await getTranslations("billing.subscription");
  const s = await getTranslations("billing.state");
  const locale = await getLocale();
  const words = stateWords(plan);
  const date = words.day ? formatLongDay(words.day, locale) : "";
  const kr = (n: number) => formatKroner(n, locale);
  const freeWithDate = plan.plan === "free" && plan.freeUntil !== null;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-2sm leading-relaxed">{s(words.key, { date, days: words.days ?? 0 })}</p>
        {freeWithDate && env.TRIAL_DAYS > 0 && (
          <p className="text-meta text-2sm leading-relaxed">
            {t("afterFree", { days: env.TRIAL_DAYS })}
          </p>
        )}
        {plan.plan === "expired" && (
          <p className="text-meta text-2sm leading-relaxed">{t("expiredWhat")}</p>
        )}
      </div>

      {price && price.yearlyDkk !== null && (
        <section
          aria-labelledby="subscription-price"
          className="border-border bg-card flex flex-col gap-1.5 rounded-xl border p-4 text-2sm leading-relaxed shadow-surface"
        >
          <h3 id="subscription-price" className="font-semibold">
            {t("priceTitle")}
          </h3>
          {price.yearlyDkk === 0 ? (
            <p>{t("priceNone")}</p>
          ) : (
            <p className="tabular-nums">
              {t(price.vatIncluded ? "price" : "priceNoVat", {
                year: kr(price.yearlyDkk),
                month: kr(price.monthlyDkk ?? 0),
              })}
            </p>
          )}
          {price.perRiderDkk !== null && price.includedRiders !== null ? (
            <p className="text-meta tabular-nums">
              {t("riders", {
                riders: price.riders,
                included: price.includedRiders,
                perRider: kr(price.perRiderDkk),
              })}
            </p>
          ) : null}
        </section>
      )}

      <section
        aria-labelledby="subscription-pay"
        className="border-border bg-card flex flex-col gap-1.5 rounded-xl border p-4 text-2sm leading-relaxed shadow-surface"
      >
        <h3 id="subscription-pay" className="font-semibold">
          {t("howTitle")}
        </h3>
        <p>{t("how")}</p>
      </section>

      <section aria-labelledby="subscription-payments" className="flex flex-col gap-2">
        <h3 id="subscription-payments" className="text-base font-semibold">
          {t("paymentsTitle")}
        </h3>
        {payments === null ? (
          <p className="text-meta text-2sm">{t("paymentsOwnerOnly")}</p>
        ) : payments.length === 0 ? (
          <p className="text-meta text-2sm">{t("paymentsNone")}</p>
        ) : (
          <PaymentsTable payments={payments} />
        )}
      </section>
    </div>
  );
}
