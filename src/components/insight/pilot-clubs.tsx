import { useTranslations } from "next-intl";
import type { ClubOverview } from "@/core/admin/overview";
import { weekNumber } from "@/core/dates";
import { PilotShare } from "./pilot-share";

/**
 * The pilot's three numbers per club for the installation's owner
 * (docs/adr/0066): the last full week, as counts from platform_overview()
 * (drizzle/0031). The database hands over nothing else, so there is
 * nothing else to show.
 */
export function PilotClubs({ clubs }: { clubs: ClubOverview[] }) {
  const t = useTranslations("insight.pilot");
  const week = clubs[0]?.pilot.week;
  if (!week) return null;
  const head = "px-3 py-2 text-right font-medium";
  const cell = "px-3 py-2 text-right align-top";

  return (
    <section className="flex flex-col gap-2.5" aria-labelledby="pilot-clubs">
      <div className="flex flex-col gap-1">
        <h3 id="pilot-clubs" className="text-base font-semibold">
          {t("clubsTitle", { week: weekNumber(week) })}
        </h3>
        <p className="text-meta text-2sm leading-relaxed">{t("clubsBody")}</p>
      </div>
      <div className="border-border bg-card overflow-x-auto rounded-xl border shadow-surface">
        <table className="w-full min-w-[32rem] border-collapse text-2sm tabular-nums">
          <thead>
            <tr className="text-label text-left text-xs">
              <th scope="col" className="px-3 py-2 font-medium">
                {t("club")}
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
            {clubs.map((club) => (
              <tr key={club.orgId} className="border-border border-t">
                <th scope="row" className="px-3 py-2 text-left align-top font-medium">
                  {club.name}
                </th>
                <td className={cell}>
                  <PilotShare part={club.pilot.checkedIn} whole={club.pilot.riders} />
                </td>
                <td className={cell}>
                  <PilotShare part={club.pilot.receipts} whole={club.pilot.sessions} />
                </td>
                <td className={`${cell} whitespace-nowrap`}>
                  {t("minutesValue", { minutes: club.pilot.minutes })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-meta flex flex-col gap-1 text-xs leading-relaxed">
        <p>{t("explainCheckins")}</p>
        <p>{t("explainReceipts")}</p>
        <p>{t("explainRiders")}</p>
        <p>{t("explainMinutes")}</p>
      </div>
    </section>
  );
}
