import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PriceCardView } from "@/components/billing/price-card";
import { env } from "@/core/env";
import { billingOn } from "@/modules/billing/plan";
import { currentPricePlans } from "@/modules/billing/price-list";
import { pricePage } from "@/modules/billing/price-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("open.prices");
  return { title: t("title"), description: t("intro") };
}

/** Dogma one: the code anyone may run, and pay nobody for. */
const SOURCE_URL = "https://github.com/MartinNymannVinther/kadence";

/**
 * "Priser" (docs/plan-konto-og-priser.md §2.7, docs/adr/0090): an open
 * page like the guides, at /priser in Danish and /en/prices in English,
 * that exists only while the installation prices its workspaces
 * (BILLING=on) — the proxy answers 404 before anything renders otherwise
 * (src/core/features.ts), and the page asks again. Two cards, a rider
 * alone and a club, with today's rows of price_plans; what is free; the
 * trial as TRIAL_DAYS says; how one pays — an invoice from Haij, by bank
 * transfer, a year ahead, and no account number here; and that the code
 * is AGPL-3.0, so a club can run Kadence itself and pay nobody.
 */
export default async function PricesPage() {
  if (!billingOn()) notFound();
  const t = await getTranslations("open.prices");
  const locale = await getLocale();
  const page = pricePage(await currentPricePlans(), locale);
  const days = env.TRIAL_DAYS;

  const section = (id: string, title: string, children: React.ReactNode) => (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );

  return (
    <div className="flex flex-col gap-8 pt-4">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
        <p className="text-reading leading-relaxed">{t("intro")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {page.cards.map((card) => (
          <PriceCardView key={card.key} card={card} />
        ))}
      </div>

      {section(
        "prices-free",
        t("freeTitle"),
        <ul className="text-reading flex list-disc flex-col gap-1 pl-5 leading-relaxed">
          {page.youthFree && <li>{t("free.youth")}</li>}
          <li>{t("free.coaches")}</li>
          <li>{t("free.season")}</li>
        </ul>,
      )}

      {section(
        "prices-trial",
        t("trialTitle"),
        <p className="text-reading leading-relaxed">
          {days > 0 ? t("trial", { days }) : t("trialNone")}
        </p>,
      )}

      {section(
        "prices-pay",
        t("payTitle"),
        <>
          <p className="text-reading leading-relaxed">{t("pay")}</p>
          <p className="text-reading leading-relaxed">{t("expiry")}</p>
        </>,
      )}

      {section(
        "prices-open",
        t("openTitle"),
        <p className="text-reading leading-relaxed">
          {t("open")}{" "}
          <a
            href={SOURCE_URL}
            className="focus-ring text-primary font-medium underline-offset-4 hover:underline"
          >
            {t("openLink")}
          </a>
        </p>,
      )}
    </div>
  );
}
