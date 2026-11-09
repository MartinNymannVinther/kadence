"use client";

import { useId, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  giveGarminAiConsentAction,
  withdrawGarminAiConsentAction,
} from "@/modules/consent/actions";

/**
 * On the Garmin card: whether the AI may read the rider's rides from
 * Garmin, and the one thing to do about it (docs/adr/0112). Saying yes
 * goes through the words first — what the AI does, what it reads, where
 * it runs, what happens without the yes — and a box the rider ticks;
 * withdrawing is one confirmed press and holds at once.
 */
export function GarminAiConsent({ given }: { given: boolean }) {
  const t = useTranslations("garmin.ai");
  const id = useId();
  const { run, pending } = useRun();
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  return (
    <section className="border-border flex flex-col gap-2 border-t pt-3">
      <h4 className="text-sm font-semibold">{t("title")}</h4>
      <p className="text-2sm leading-relaxed">{given ? t("stateYes") : t("stateNo")}</p>
      <div className="flex flex-wrap gap-2">
        {given ? (
          <ConfirmButton
            title={t("withdrawTitle")}
            body={t("withdrawBody")}
            confirmLabel={t("withdraw")}
            size="default"
            onConfirm={() =>
              run(() => withdrawGarminAiConsentAction(), { success: t("withdrawn") })
            }
          >
            {t("withdraw")}
          </ConfirmButton>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="max-sm:h-11"
            onClick={() => {
              setAgreed(false);
              setOpen(true);
            }}
          >
            <Sparkles data-icon="inline-start" />
            {t("open")}
          </Button>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("what")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-2sm leading-relaxed">
            <p>{t("reads")}</p>
            <p>{t("model")}</p>
            <p>{t("without")}</p>
            <label
              htmlFor={id}
              className="border-border bg-card has-checked:border-primary has-focus-visible:outline-ring flex cursor-pointer gap-3 rounded-lg border p-3 has-focus-visible:outline-2"
            >
              <input
                id={id}
                type="checkbox"
                checked={agreed}
                className="accent-primary mt-0.5 size-5 shrink-0"
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>{t("agree")}</span>
            </label>
            <p className="text-meta text-xs">{t("withdrawNote")}</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="max-sm:h-11"
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              className="max-sm:h-11"
              disabled={!agreed || pending}
              onClick={async () => {
                const done = await run(() => giveGarminAiConsentAction(), {
                  success: t("given"),
                });
                if (done !== null) setOpen(false);
              }}
            >
              {t("give")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
