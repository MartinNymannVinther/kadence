"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { NO_WHY, ReasonPicker } from "@/components/training/reason-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { skipSessionAction } from "@/modules/training/actions";

/**
 * "Spring over" (docs/adr/0117): the session stays on its day, grey, with
 * the reason, and counts in no planned hours. One tap on a reason, or none.
 */
export function SkipDialog({
  open,
  onOpenChange,
  session,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: { id: string; title: string };
}) {
  const t = useTranslations("changes.skip");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const [why, setWhy] = useState(NO_WHY);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const done = await run(
      () => skipSessionAction({ sessionId: session.id, reason: why.reason, note: why.note }),
      { success: t("done") },
    );
    if (done) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {session.title}. {t("body")}
            </DialogDescription>
          </DialogHeader>
          <ReasonPicker value={why} onChange={setWhy} />
          <DialogFooter>
            <Button type="submit" disabled={pending} className="max-sm:h-11">
              {t("confirm")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="max-sm:h-11"
              onClick={() => onOpenChange(false)}
            >
              {common("cancel")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
