import { Check } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { formatKroner } from "@/modules/billing/dates";
import type { PriceCard } from "@/modules/billing/price-page";

/** What every plan has; a club has its week and its people on top. */
const INCLUDED = ["calendar", "rides", "checkin", "rulle", "ai"] as const;

/**
 * One plan on the open price page (docs/plan-konto-og-priser.md §2.7):
 * its name and price from price_plans, a year and a month, whether VAT is
 * in it, and what comes with it. No number here is written in code.
 */
export async function PriceCardView({ card }: { card: PriceCard }) {
  const t = await getTranslations("open.prices");
  const locale = await getLocale();
  const kr = (n: number) => formatKroner(n, locale);
  const items = [
    ...INCLUDED.map((key) => t(`included.${key}`)),
    t("included.files", { gb: card.fileGb }),
    ...(card.key === "club" ? [t("included.team")] : []),
  ];

  return (
    <section
      aria-labelledby={`price-${card.key}`}
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-surface"
    >
      <h2 id={`price-${card.key}`} className="text-lg font-semibold">
        {card.name}
      </h2>
      <div className="flex flex-col gap-0.5">
        <p className="font-heading text-2xl font-semibold tabular-nums">
          {t("perYear", { price: kr(card.yearlyDkk) })}
        </p>
        <p className="text-meta text-2sm tabular-nums">
          {t("perMonth", { price: kr(card.monthlyDkk) })} {t(card.vatIncluded ? "vat" : "noVat")}
        </p>
      </div>
      {card.perRider && (
        <p className="text-2sm leading-relaxed tabular-nums">
          {t("perRider", {
            included: card.perRider.included,
            price: kr(card.perRider.perRiderDkk),
          })}
        </p>
      )}
      <p className="text-2sm leading-relaxed">{t(`cards.${card.key}`)}</p>
      <ul className="flex flex-col gap-1.5 text-2sm">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
