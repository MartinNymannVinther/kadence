import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BillingTable, workspaceRef } from "@/components/billing/billing-table";
import { PaymentsTable } from "@/components/billing/payments-table";
import { billingOverview, recentPayments } from "@/core/admin/billing";
import { getSession } from "@/core/auth/session";
import { billingOn } from "@/modules/billing/plan";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing.admin");
  return { title: t("title") };
}

/**
 * Installation → Betaling (docs/adr/0090), for the installation's owner
 * and nobody else (a 404 otherwise, and with BILLING=off): every
 * workspace but the demos with its plan, its dates, its riders and the
 * price the table gives, so an invoice can be written from it in the
 * owner's own bookkeeping; "Registrér betaling" when the transfer came in
 * and "Sæt gratis" for a pilot or a friend; and the last 50 payments.
 */
export default async function InstallationBillingPage() {
  if (!billingOn()) notFound();
  const session = await getSession();
  const rows = session ? await billingOverview(session.user.id) : null;
  if (!rows || !session) notFound();
  const payments = (await recentPayments(session.user.id)) ?? [];
  const t = await getTranslations("billing.admin");
  const nameOf = new Map(
    rows.map((r) => [
      r.orgId,
      r.kind === "personal" ? t("person", { ref: workspaceRef(r.orgId) }) : r.name,
    ]),
  );

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-meta text-2sm leading-relaxed">{t("subtitle")}</p>
      </div>

      {rows.length === 0 ? (
        <p className="border-border bg-card rounded-xl border p-4 text-2sm">{t("none")}</p>
      ) : (
        <BillingTable rows={rows} />
      )}

      <section aria-labelledby="billing-payments" className="flex flex-col gap-2">
        <h3 id="billing-payments" className="text-base font-semibold">
          {t("paymentsTitle")}
        </h3>
        {payments.length === 0 ? (
          <p className="text-meta text-2sm">{t("paymentsNone")}</p>
        ) : (
          <PaymentsTable
            withWorkspace
            payments={payments.map((p) => ({ ...p, workspace: nameOf.get(p.orgId) ?? "" }))}
          />
        )}
      </section>
    </div>
  );
}
