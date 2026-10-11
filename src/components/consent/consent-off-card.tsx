import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GiveConsentAgain } from "./give-consent-again";

/**
 * Where the check-in stands on Today once the consent to health data is
 * withdrawn (docs/adr/0088): it says plainly why there is no check-in,
 * that the rest works, and — for the person who holds the consent — the
 * way to give it again. A child riding in a parent's workspace is told
 * the same, without the button: the consent is the parent's.
 */
export function ConsentOffCard({ canGive }: { canGive: boolean }) {
  const t = useTranslations("consent");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("offTitle")}</CardTitle>
        <CardDescription>{t("offBody")}</CardDescription>
      </CardHeader>
      {canGive && (
        <CardContent>
          <GiveConsentAgain forWhom="me" />
        </CardContent>
      )}
    </Card>
  );
}
