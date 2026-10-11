import { useTranslations } from "next-intl";
import type { ClubOverview, PersonsSummary } from "@/core/admin/overview";
import { formatEuro } from "@/modules/ai/prices";
import { BudgetField } from "./budget-field";

/**
 * This month's AI for the installation's owner (docs/adr/0089): one total
 * line, what the installation's key spent for each club against its
 * budget, and the budget to change. Persons are in the total and on their
 * own line above, never one by one (ADR 0080). A call at a price nobody
 * knows is counted, not guessed: "pris ukendt".
 */
export function AiMonth({
  clubs,
  persons,
  defaultBudgetMicro,
  locale,
}: {
  clubs: ClubOverview[];
  persons: PersonsSummary;
  defaultBudgetMicro: number;
  locale: string;
}) {
  const t = useTranslations("settings.installation.aiMonth");
  const euro = (micro: number) => formatEuro(micro, locale);
  const clubsCost = clubs.reduce((n, c) => n + c.aiCostMonthMicro, 0);
  const unknown = clubs.reduce((n, c) => n + c.aiUnpricedMonth, 0) + persons.aiUnpricedMonth;
  const defaultLabel = defaultBudgetMicro > 0 ? euro(defaultBudgetMicro) : t("noBudget");

  return (
    <section className="flex flex-col gap-2.5" aria-labelledby="ai-month">
      <div className="flex flex-col gap-1">
        <h3 id="ai-month" className="text-base font-semibold">
          {t("title")}
        </h3>
        <p className="text-meta text-2sm leading-relaxed">{t("body", { budget: defaultLabel })}</p>
        <p className="text-2sm tabular-nums">
          {t("total", {
            total: euro(clubsCost + persons.aiCostMonthMicro),
            clubs: euro(clubsCost),
            persons: euro(persons.aiCostMonthMicro),
          })}
          {unknown > 0 && <> {t("unknownTotal", { count: unknown })}</>}
        </p>
      </div>
      {clubs.length > 0 && (
        <div className="border-border bg-card overflow-x-auto rounded-xl border shadow-surface">
          <table className="w-full min-w-[30rem] border-collapse text-2sm tabular-nums">
            <thead>
              <tr className="text-label text-left text-xs">
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("club")}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {t("spent")}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {t("budget")}
                </th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => {
                const budget = club.aiBudgetMicro ?? defaultBudgetMicro;
                return (
                  <tr key={club.orgId} className="border-border border-t">
                    <th scope="row" className="px-3 py-2 text-left align-top font-medium">
                      {club.name}
                    </th>
                    <td className="px-3 py-2 text-right align-top">
                      {budget > 0
                        ? t("spentOf", { spent: euro(club.aiCostMonthMicro), budget: euro(budget) })
                        : euro(club.aiCostMonthMicro)}
                      {club.aiUnpricedMonth > 0 && (
                        <span className="text-meta block text-xs">
                          {t("unknown", { count: club.aiUnpricedMonth })}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      <BudgetField
                        orgId={club.orgId}
                        club={club.name}
                        budgetMicro={club.aiBudgetMicro}
                        defaultLabel={defaultLabel}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
