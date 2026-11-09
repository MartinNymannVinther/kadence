"use client";

import { useState } from "react";
import { CalendarClock, CircleSlash, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { MoveDialog } from "@/components/calendar/move-dialog";
import { SkipDialog } from "@/components/calendar/skip-dialog";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { unskipSessionAction } from "@/modules/training/actions";

/**
 * "Flyt" and "Spring over" on a session on Today, where the rider decides
 * on the day (docs/adr/0117); "Fortryd" once it is skipped.
 */
export function TodayChangeActions({
  session,
}: {
  session: { id: string; title: string; onDate: string; riderId: string; skipped: boolean };
}) {
  const t = useTranslations("calendar.menu");
  const changes = useTranslations("changes.skip");
  const { run, pending } = useRun();
  const [dialog, setDialog] = useState<null | "move" | "skip">(null);
  const close = (open: boolean) => !open && setDialog(null);

  if (session.skipped)
    return (
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        className="max-sm:h-11"
        onClick={() =>
          void run(() => unskipSessionAction({ sessionId: session.id }), {
            success: changes("undone"),
          })
        }
      >
        <Undo2 data-icon="inline-start" />
        {changes("undo")}
      </Button>
    );
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="max-sm:h-11"
        onClick={() => setDialog("move")}
      >
        <CalendarClock data-icon="inline-start" />
        {t("move")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="max-sm:h-11"
        onClick={() => setDialog("skip")}
      >
        <CircleSlash data-icon="inline-start" />
        {t("skip")}
      </Button>
      {dialog === "move" && (
        <MoveDialog open onOpenChange={close} mode="move" session={session} riders={[]} />
      )}
      {dialog === "skip" && <SkipDialog open onOpenChange={close} session={session} />}
    </>
  );
}
