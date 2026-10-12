import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PricePlanForm } from "@/components/billing/price-plan-form";
import { isPlatformOwner } from "@/core/access/service";
import { getSession } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { formatKroner, formatLongDay } from "@/modules/billing/dates";
import { billingOn } from "@/modules/billing/plan";
import { allPricePlanRows, type PricePlanRow } from "@/modules/billing/price-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing.prices");
  return { title: t("title") };
}

/**
 * Installation → Priser (docs/adr/0090, backlog S-12b), for the
 * installation's owner and nobody else (a 404 otherwise, and with
 * BILLING=off): each plan of price_plans with today's row to change and
 * its other rows beneath — the older prices, kept as the history an
 * invoice was written from, and any set for a later day. A change is a new
 * row from the day it takes effect; the open price page, the front page,
 * Abonnement and Betaling read today's row, and the plan's AI budget and
 * file quota are what its workspaces get unless the owner gave one its own.
 */
export default async function InstallationPricesPage() {
  if (!billingOn()) notFound();
  const session = await getSession();
  if (!session || !(await isPlatformOwner(session.user.id))) notFound();
  const t = await getTranslations("billing.prices");
  const locale = await getLocale();
  const today = todayInCopenhagen();
  const rows = await allPricePlanRows();
  const keys = [...new Set(rows.map((r) => r.key))];

  // Today's row is the newest that has come; a plan whose every row is for
  // a later day is edited from its earliest.
  const current = (plan: PricePlanRow[]) =>
    plan.find((r) => r.validFrom <= today) ?? plan[plan.length - 1]!;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-meta text-2sm leading-relaxed">{t("subtitle")}</p>
      </div>

      {keys.map((key) => {
        const plan = rows.filter((r) => r.key === key);
        const now = current(plan);
        const others = plan.filter((r) => r !== now);
        const name = locale === "en" ? now.nameEn : now.nameDa;
        return (
          <section
            key={key}
            aria-labelledby={`plan-${key}`}
            className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-surface"
          >
            <div className="flex flex-col gap-0.5">
              <h3 id={`plan-${key}`} className="font-semibold">
                {name}
              </h3>
              <p className="text-meta text-xs">
                {t("since", { key, date: formatLongDay(now.validFrom, locale) })}
              </p>
            </div>
            <PricePlanForm plan={now} />
            {others.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-label text-xs font-medium">{t("otherRows")}</p>
                <ul className="text-meta flex flex-col gap-0.5 text-2sm tabular-nums">
                  {others.map((r) => (
                    <li key={r.validFrom}>
                      {t(r.validFrom > today ? "later" : "earlier", {
                        date: formatLongDay(r.validFrom, locale),
                        price: formatKroner(r.priceYearDkk, locale),
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
