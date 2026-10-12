import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { PlanBanner } from "@/modules/billing/banner";
import { formatLongDay } from "@/modules/billing/dates";

/**
 * A stripe at the top of every page for a workspace that may only be read,
 * or whose trial ends this week (docs/adr/0090, src/modules/billing/banner.ts).
 * It says what happened, what still works — seeing everything and taking
 * it out — and, for the coaches who decide, the way to Abonnement. Said
 * plainly, without blame: the workspace is as it was, and nothing is
 * deleted.
 */
export async function PlanBannerStripe({
  banner,
  coach,
}: {
  banner: PlanBanner;
  /** A coach sees the way to Abonnement; a rider or a parent is told who decides. */
  coach: boolean;
}) {
  const t = await getTranslations("billing.banner");
  const locale = await getLocale();
  const expired = banner.kind === "expired";
  const title = expired
    ? t(banner.wasTrial ? "trialEnded" : "subscriptionEnded")
    : t("trialEnding", {
        days: banner.daysLeft,
        date: formatLongDay(banner.lastDay, locale),
      });

  return (
    <div
      role="status"
      className="print:hidden border-chart-4/40 bg-warning-tint border-b px-5 text-2sm sm:px-7 lg:px-8"
    >
      <p className="py-2.5 leading-relaxed">
        <span className="font-semibold">{title}</span>{" "}
        {expired && <span>{t(coach ? "stillWorks" : "stillWorksMember")} </span>}
        {coach && (
          <Link
            href="/settings/subscription"
            className="focus-ring text-primary font-medium underline-offset-4 hover:underline"
          >
            {t("toSubscription")}
          </Link>
        )}
      </p>
    </div>
  );
}
