import { useLocale, useTranslations } from "next-intl";
import { dayMonthShort, num, signed } from "@/components/charts/format";
import type { LoadPoint } from "./load-chart";

/**
 * The load chart as numbers, one row a week back from today: the view a
 * screen reader or a printout reads, and anyone who would rather have
 * the figures than the lines.
 */
export function LoadTable({ days }: { days: LoadPoint[] }) {
  const t = useTranslations("load");
  const locale = useLocale();
  const rows = days.filter((_, i) => (days.length - 1 - i) % 7 === 0).reverse();
  if (rows.length === 0) return null;
  return (
    <details className="text-2sm">
      <summary className="focus-ring text-primary flex min-h-11 w-fit cursor-pointer items-center font-medium">
        {t("table")}
      </summary>
      <table className="mt-1 w-full max-w-md text-left">
        <caption className="sr-only">{t("tableCaption")}</caption>
        <thead className="text-label text-xs">
          <tr>
            <th className="py-1 font-medium">{t("date")}</th>
            <th className="py-1 text-right font-medium">{t("fitness")}</th>
            <th className="py-1 text-right font-medium">{t("fatigue")}</th>
            <th className="py-1 text-right font-medium">{t("form")}</th>
          </tr>
        </thead>
        <tbody className="divide-hairline divide-y">
          {rows.map((d) => (
            <tr key={d.date}>
              <td className="py-1">{dayMonthShort(d.date, locale)}</td>
              <td className="py-1 text-right">{num(d.fitness, locale)}</td>
              <td className="py-1 text-right">{num(d.fatigue, locale)}</td>
              <td className="py-1 text-right">{signed(d.form, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
