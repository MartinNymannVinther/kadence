"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** The question before a ride ends (ADR 0033): end it now, or ride on. A coach's try is not saved. */
export function EndDialog({
  open,
  trial,
  onOpenChange,
  onEnd,
}: {
  open: boolean;
  trial: boolean;
  onOpenChange: (open: boolean) => void;
  onEnd: () => void;
}) {
  const t = useTranslations("rulle.end");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{trial ? t("trialBody") : t("body")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => {
              onOpenChange(false);
              onEnd();
            }}
          >
            {t("confirm")}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
