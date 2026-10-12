import { getLocale, getTranslations } from "next-intl/server";
import type { BillingRow } from "@/core/admin/billing";
import { formatDay } from "@/core/dates";
import { formatKroner, formatLongDay } from "@/modules/billing/dates";
import { BillingRowActions } from "./billing-row-actions";
import { stateWords } from "./plan-words";

/** A personal workspace's short reference for the invoice: the end of its id, never a name. */
export function workspaceRef(orgId: string): string {
  return orgId.slice(-6).toUpperCase();
}

/**
 * Every workspace's plan for the installation's owner (docs/adr/0090): a
 * club by name, a person as "Enkeltperson" with a short reference to put
 * on the invoice (ADR 0080: a person's name is not shown here), its plan
 * and day in the words Abonnement uses, its riders, what it costs a year,
 * and the two actions.
 */
export async function BillingTable({ rows }: { rows: BillingRow[] }) {
  const t = await getTranslations("billing.admin");
  const s = await getTranslations("billing.state");
  const locale = await getLocale();
  return (
    <div className="border-border bg-card overflow-x-auto rounded-xl border shadow-surface">
      <table className="w-full min-w-[46rem] border-collapse text-2sm tabular-nums">
        <thead>
          <tr className="text-label text-left text-xs">
            <th scope="col" className="px-3 py-2 font-medium">
              {t("workspace")}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {t("state")}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              {t("riders")}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              {t("yearly")}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              <span className="sr-only">{t("actions")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const label =
              row.kind === "personal" ? t("person", { ref: workspaceRef(row.orgId) }) : row.name;
            const words = stateWords(row);
            return (
              <tr key={row.orgId} className="border-border border-t align-top">
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  {label}
                  <span className="text-meta block text-xs font-normal">
                    {t(row.kind === "personal" ? "kindPerson" : "kindClub")} ·{" "}
                    {t("created", { date: formatDay(row.createdAt, locale) })}
                  </span>
                </th>
                <td className="px-3 py-2">
                  {s(words.key, {
                    date: words.day ? formatLongDay(words.day, locale) : "",
                    days: words.days ?? 0,
                  })}
                  {row.freeReason && row.plan === "free" && (
                    <span className="text-meta block text-xs">
                      {t("reasonValue", { reason: row.freeReason })}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">{row.riders}</td>
                <td className="px-3 py-2 text-right">
                  {row.yearlyDkk === null
                    ? t("noPrice")
                    : t("kroner", { amount: formatKroner(row.yearlyDkk, locale) })}
                  <span className="text-meta block text-xs">{row.planKey}</span>
                </td>
                <td className="px-3 py-2">
                  <BillingRowActions orgId={row.orgId} label={label} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
