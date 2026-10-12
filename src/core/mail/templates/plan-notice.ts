import { compose, type Mail, type MailTranslate } from "../words";

/**
 * What a workspace pays, as a mail to its owner (docs/adr/0090): a trial
 * that ends in a week or tomorrow, a payment that runs out in two weeks,
 * or a workspace that has become read only. It names the workspace — a
 * club by its name, a person's own as "dit eget Kadence", since that name
 * is a person's — the day, the yearly price, that an invoice comes from
 * Haij by mail, and a link to Abonnement. No account number, ever
 * (Martin's answer 5): that is on the invoice. Nothing about anybody's
 * training.
 */

export type PlanNoticeKind = "trial-7" | "trial-1" | "paid-14" | "expired";

export const PLAN_NOTICE_KINDS: readonly PlanNoticeKind[] = [
  "trial-7",
  "trial-1",
  "paid-14",
  "expired",
];

export type PlanNoticeInput = {
  kind: PlanNoticeKind;
  /** A club's name; null for a person's own workspace. */
  workspace: string | null;
  /** The last day the trial or the payment covers, written out. */
  date: string;
  /** The yearly price written out, or null when the workspace has none. */
  price: string | null;
  /** Whether what ran out was a trial (for "expired"). */
  wasTrial: boolean;
  url: string;
};

export function planNoticeMail(t: MailTranslate, input: PlanNoticeInput): Mail {
  const workspace = input.workspace ?? t("plan.own");
  const price = input.price ? [t("plan.price", { price: input.price })] : [];
  const values = { workspace, date: input.date };
  if (input.kind === "paid-14")
    return {
      subject: t("plan.paidSubject", { date: input.date }),
      text: compose(t, [
        t("plan.paidBody", values),
        ...price,
        t("plan.paidInvoice"),
        t("plan.link"),
        input.url,
      ]),
    };
  if (input.kind === "expired")
    return {
      subject: t("plan.expiredSubject"),
      text: compose(t, [
        t(input.wasTrial ? "plan.expiredTrialBody" : "plan.expiredPaidBody", values),
        t("plan.expiredStill"),
        ...price,
        t("plan.expiredInvoice"),
        t("plan.link"),
        input.url,
      ]),
    };
  return {
    subject: t("plan.trialSubject", { date: input.date }),
    text: compose(t, [
      t(input.kind === "trial-1" ? "plan.trialTomorrow" : "plan.trialBody", values),
      ...price,
      t("plan.trialInvoice"),
      t("plan.trialAfter"),
      t("plan.link"),
      input.url,
    ]),
  };
}
