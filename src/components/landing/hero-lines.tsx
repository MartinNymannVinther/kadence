import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatKroner } from "@/modules/billing/dates";
import { pricesPath, type LandingCopy } from "@/modules/billing/landing";

const link = "focus-ring text-foreground font-medium underline-offset-4 hover:underline";

/**
 * The lines under the hero's buttons (docs/plan-konto-og-priser.md §2.6):
 * with door 2 open, "Er I et hold? Så ansøger I først" for a team, and
 * with billing on, the price in one line — the trial and the cheapest
 * paid plan a month, or "Gratis at komme i gang" — linking to /priser.
 * Every number comes from price_plans and TRIAL_DAYS
 * (src/modules/billing/landing.ts).
 */
export async function HeroLines({ copy }: { copy: Pick<LandingCopy, "teamLine" | "price"> }) {
  const t = await getTranslations("landing");
  const locale = await getLocale();
  const { price } = copy;
  if (!copy.teamLine && !price) return null;
  const toPrices = (chunks: React.ReactNode) => (
    <Link href={pricesPath(locale)} className={link}>
      {chunks}
    </Link>
  );

  return (
    <div className="text-muted-foreground mt-4 flex flex-col items-center gap-1.5 text-sm">
      {copy.teamLine && (
        <p>
          {t.rich("hero.teamFirst", {
            link: (chunks) => (
              <Link href="/register?apply=1" className={link}>
                {chunks}
              </Link>
            ),
          })}
        </p>
      )}
      {price?.kind === "trial" && (
        <p>
          {t.rich("price.trial", {
            days: price.days,
            monthly: formatKroner(price.monthlyDkk, locale),
            link: toPrices,
          })}
        </p>
      )}
      {price?.kind === "free" && <p>{t.rich("price.free", { link: toPrices })}</p>}
    </div>
  );
}
