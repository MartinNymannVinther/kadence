"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompleteForm } from "@/components/session/complete-form";

/**
 * The big "Udført" on today's page: one press opens the short form — the
 * minutes already filled in from the plan — so a rider standing by the
 * bike after a ride is done in a few taps.
 */
export function CompleteDialog({
  session,
}: {
  session: { id: string; title: string; plannedMinutes: number; sport: string };
}) {
  const t = useTranslations("today.rider");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
        <Check data-icon="inline-start" />
        {t("done")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("doneTitle")}</DialogTitle>
            <DialogDescription>{session.title}</DialogDescription>
          </DialogHeader>
          <CompleteForm
            sessionId={session.id}
            plannedMinutes={session.plannedMinutes}
            sport={session.sport}
            onDone={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
