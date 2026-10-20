"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { giveHealthConsentAction } from "@/modules/consent/actions";

/**
 * "Giv samtykke igen" (docs/adr/0088): the same words the consent was
 * first given to — for oneself, or as a parent for one's child — and a
 * button that gives it. Explicit, as art. 9(2)(a) asks: the words are
 * shown, and pressing the button is the yes.
 */
export function GiveConsentAgain({ forWhom }: { forWhom: "me" | "child" }) {
  const t = useTranslations("consent");
  const words = useTranslations("auth.self");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-2sm leading-relaxed">
        {forWhom === "child" ? words("healthChild") : words("healthMe")}
      </p>
      <Button
        type="button"
        className="w-fit"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await giveHealthConsentAction();
            if (result.ok) toast.success(t("given"));
            else toast.error(t("failed"));
          })
        }
      >
        {t("giveAgain")}
      </Button>
    </div>
  );
}
