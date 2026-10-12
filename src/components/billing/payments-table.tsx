import { getLocale, getTranslations } from "next-intl/server";
import { formatPlanDate } from "@/core/dates";
import { formatKroner } from "@/modules/billing/dates";

export type PaymentLine = {
  id: string;
  amountDkk: number;
  vatDkk: number;
  invoiceNo: string;
  periodFrom: string;
  periodTo: string;
  note: string | null;
  /** For the installation's list: the workspace it is for. */
  workspace?: string;
};

/**
 * Payments registered by hand (docs/adr/0090): the invoice's number, the
 * period it paid for, the amount and the VAT in it. The workspace's own on
 * Abonnement; every workspace's, with a column for which, under
 * Installation → Betaling.
 */
export async function PaymentsTable({
  payments,
  withWorkspace = false,
}: {
  payments: PaymentLine[];
  withWorkspace?: boolean;
}) {
  const t = await getTranslations("billing.payments");
  const locale = await getLocale();
  const kr = (n: number) => t("kroner", { amount: formatKroner(n, locale) });
  return (
    <div className="border-border bg-card overflow-x-auto rounded-xl border shadow-surface">
      <table className="w-full min-w-[32rem] border-collapse text-2sm tabular-nums">
        <thead>
          <tr className="text-label text-left text-xs">
            {withWorkspace && (
              <th scope="col" className="px-3 py-2 font-medium">
                {t("workspace")}
              </th>
            )}
            <th scope="col" className="px-3 py-2 font-medium">
              {t("invoice")}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {t("period")}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              {t("amount")}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              {t("vat")}
            </th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-border border-t align-top">
              {withWorkspace && <td className="px-3 py-2">{p.workspace}</td>}
              <td className="px-3 py-2">
                {p.invoiceNo}
                {p.note && <span className="text-meta block text-xs">{p.note}</span>}
              </td>
              <td className="px-3 py-2">
                {t("periodValue", {
                  from: formatPlanDate(p.periodFrom, locale),
                  to: formatPlanDate(p.periodTo, locale),
                })}
              </td>
              <td className="px-3 py-2 text-right">{kr(p.amountDkk)}</td>
              <td className="px-3 py-2 text-right">{kr(p.vatDkk)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
