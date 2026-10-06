import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { weekNumber } from "@/core/dates";
import type { PilotWeek } from "@/modules/insight/pilot-numbers";
import { PilotShare } from "./pilot-share";

/**
 * The team's three numbers for its coaches (docs/adr/0066), under
 * Indstillinger → Holdet: the last eight weeks, this one first and marked
 * as still going, with what each number counts written underneath. The
 * minutes are an estimate meant to help, and the card says so.
 */
export function PilotCard({ weeks }: { weeks: PilotWeek[] }) {
  const t = useTranslations("insight.pilot");
  const cell = "px-3 py-2 text-right align-top";
  const head = "px-3 py-1.5 text-right font-medium";

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="-mx-3 overflow-x-auto">
          <table className="w-full border-collapse text-2sm tabular-nums">
            <caption className="sr-only">{t("title")}</caption>
            <thead>
              <tr className="text-label text-xs">
                <th scope="col" className="px-3 py-1.5 text-left font-medium">
                  {t("week")}
                </th>
                <th scope="col" className={head}>
                  {t("checkins")}
                </th>
                <th scope="col" className={head}>
                  {t("receipts")}
                </th>
                <th scope="col" className={head}>
                  {t("minutes")}
                </th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.monday} className="border-border border-t">
                  <th scope="row" className="px-3 py-2 text-left align-top font-normal">
                    <span className="whitespace-nowrap">
                      {t("weekNumber", { week: weekNumber(w.monday) })}
                    </span>
                    {w.inProgress && (
                      <span className="text-meta block text-xs">{t("inProgress")}</span>
                    )}
                  </th>
                  <td className={cell}>
                    <PilotShare part={w.checkedIn} whole={w.riders} />
                  </td>
                  <td className={cell}>
                    <PilotShare part={w.receipts} whole={w.sessions} />
                  </td>
                  <td className={`${cell} whitespace-nowrap`}>
                    {t("minutesValue", { minutes: w.minutes })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-meta flex flex-col gap-1.5 text-xs leading-relaxed">
          <p>{t("explainCheckins")}</p>
          <p>{t("explainReceipts")}</p>
          <p>{t("explainRiders")}</p>
          <p>{t("explainMinutes")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
