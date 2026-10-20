import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HealthConsent } from "@/modules/consent/service";
import { GiveConsentAgain } from "./give-consent-again";
import { WithdrawConsentButton } from "./withdraw-consent-button";

/**
 * The consent to health data under Indstillinger → Data, for the person
 * who gave it when they created their own workspace (docs/adr/0088):
 * when it was given and the way to withdraw it, or when it was withdrawn
 * and the way to give it again. Withdrawing switches check-in and
 * measurements off and deletes nothing; the card says how the stored ones
 * are taken out and deleted.
 */
export function HealthConsentCard({
  consent,
  date,
  forWhom,
}: {
  consent: Exclude<HealthConsent, { state: "none" }>;
  /** The day it was given or withdrawn, already written out in the reader's language. */
  date: string;
  forWhom: "me" | "child";
}) {
  const t = useTranslations("consent.card");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {consent.state === "given" ? t("givenBody", { date }) : t("withdrawnBody", { date })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {consent.state === "given" ? (
          <>
            <p className="text-meta text-2sm leading-relaxed">{t("withdrawEffect")}</p>
            <p className="text-meta text-2sm leading-relaxed">{t("keepNote")}</p>
            <WithdrawConsentButton />
          </>
        ) : (
          <>
            <p className="text-meta text-2sm leading-relaxed">{t("keepNote")}</p>
            <GiveConsentAgain forWhom={forWhom} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
