"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { moveSessionAction } from "@/modules/training/actions";
import type { RiderOption } from "./types";

/**
 * "Flyt" and "Kopiér" with a date field: the way to move a session that
 * works with a thumb and a keyboard, where dragging does not. A coach may
 * copy to another rider as well.
 */
export function MoveDialog({
  open,
  onOpenChange,
  mode,
  session,
  riders,
  onMoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "move" | "copy";
  session: { id: string; title: string; onDate: string; riderId: string };
  /** For a coach's copy to someone else; empty keeps the copy with the rider. */
  riders: RiderOption[];
  onMoved?: (onDate: string) => void;
}) {
  const t = useTranslations("calendar.move");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const dateId = useId();
  const riderId = useId();
  const [onDate, setOnDate] = useState(session.onDate);
  const [toRider, setToRider] = useState(session.riderId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const copy = mode === "copy";
    if (!copy) onMoved?.(onDate);
    const done = await run(
      () =>
        moveSessionAction({
          sessionId: session.id,
          onDate,
          copy,
          toRiderId: copy && toRider !== session.riderId ? toRider : undefined,
        }),
      { success: copy ? t("copied") : t("moved") },
    );
    if (done) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{mode === "copy" ? t("copyTitle") : t("moveTitle")}</DialogTitle>
            <DialogDescription>{session.title}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={dateId} className="text-sm font-medium">
              {t("date")}
            </label>
            <Input
              id={dateId}
              type="date"
              required
              value={onDate}
              className="max-sm:h-11"
              onChange={(e) => setOnDate(e.target.value)}
            />
          </div>
          {mode === "copy" && riders.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={riderId} className="text-sm font-medium">
                {t("rider")}
              </label>
              <NativeSelect
                id={riderId}
                value={toRider}
                className="max-sm:h-11"
                onChange={(e) => setToRider(e.target.value)}
              >
                {riders.map((rider) => (
                  <option key={rider.id} value={rider.id}>
                    {rider.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending || !onDate} className="max-sm:h-11">
              {mode === "copy" ? t("copy") : t("move")}
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
