"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { withdrawHealthConsentAction } from "@/modules/consent/actions";

/** "Træk samtykket til helbredsoplysninger tilbage", behind one question. */
export function WithdrawConsentButton() {
  const t = useTranslations("consent.card");
  return (
    <ConfirmButton
      title={t("confirmTitle")}
      body={t("confirmBody")}
      confirmLabel={t("confirmAction")}
      variant="outline"
      onConfirm={async () => {
        const result = await withdrawHealthConsentAction();
        if (result.ok) toast.success(t("withdrawn"));
        else toast.error(t("failed"));
      }}
    >
      {t("withdrawAction")}
    </ConfirmButton>
  );
}
