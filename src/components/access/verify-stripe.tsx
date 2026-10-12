import { getLocale, getTranslations } from "next-intl/server";
import { todayInCopenhagen } from "@/core/dates";
import { formatLongDay } from "@/modules/billing/dates";
import { ResendVerificationLink } from "./resend-verification-link";

/**
 * Door 2's week (docs/adr/0088, amended 12 October 2026): a person who
 * created their own workspace uses it at once, and this stripe at the top
 * of every app page says by which day the address must be confirmed, with
 * "Send mailen igen" — the /verify page's own action, three an hour.
 * Plain, without blame: nothing is wrong yet, it is a thing to do.
 */
export async function VerifyStripe({ by }: { by: Date }) {
  const t = await getTranslations("auth.verifyStripe");
  const locale = await getLocale();
  // The last whole day: an account made at 14:00 confirms by the day a week on.
  const day = todayInCopenhagen(new Date(by.getTime() - 1));

  return (
    <div
      role="status"
      className="print:hidden border-chart-4/40 bg-warning-tint border-b px-5 text-2sm sm:px-7 lg:px-8"
    >
      <p className="py-2.5 leading-relaxed">
        <span className="font-semibold">{t("title", { date: formatLongDay(day, locale) })}</span>{" "}
        <span>{t("body")} </span>
        <ResendVerificationLink />
      </p>
    </div>
  );
}
