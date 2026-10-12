"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { RepeatFields } from "@/components/calendar/repeat-fields";
import { RiderPicker } from "@/components/calendar/rider-picker";
import {
  TimePlaceFields,
  timePlaceDraft,
  timePlaceValue,
} from "@/components/calendar/time-place-fields";
import type { RiderOption } from "@/components/calendar/types";
import { scheduleTemplateAction } from "@/modules/training/actions";
import type { Repeat } from "@/modules/training/recurrence";

/**
 * "Planlæg": a template into the calendar of one or more riders on a day,
 * or on chosen weekdays until a last day (ADR 0041). A strength
 * programme's session is numbered per rider, so each rider gets the sets
 * and reps of where they are in it, session after session.
 */
export function ScheduleDialog({
  open,
  onOpenChange,
  template,
  riders,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: { id: string; name: string; sport: string; plannedMinutes: number };
  riders: RiderOption[];
  today: string;
}) {
  const t = useTranslations("library.schedule");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const dateId = useId();
  const [riderIds, setRiderIds] = useState(riders.length === 1 ? [riders[0]!.id] : []);
  const [onDate, setOnDate] = useState(today);
  const [repeat, setRepeat] = useState<Repeat | null>(null);
  const [at, setAt] = useState(() => timePlaceDraft());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (riderIds.length === 0) return;
    const done = await run(() =>
      scheduleTemplateAction({
        templateId: template.id,
        riderIds,
        onDate,
        repeat: repeat ?? undefined,
        ...timePlaceValue(at),
      }),
    );
    if (done) {
      toast.success(
        repeat
          ? t("doneSeries", { count: done.ids.length })
          : t("done", { count: riderIds.length }),
      );
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{template.name}</DialogDescription>
          </DialogHeader>
          {riders.length > 1 ? (
            <RiderPicker riders={riders} selected={riderIds} onChange={setRiderIds} />
          ) : (
            <p className="text-2sm">{t("forRider", { name: riders[0]?.name ?? "" })}</p>
          )}
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
          <TimePlaceFields value={at} onChange={setAt} />
          <RepeatFields
            start={onDate}
            sport={template.sport}
            plannedMinutes={template.plannedMinutes}
            riderIds={riderIds}
            riders={riders}
            value={repeat}
            onChange={setRepeat}
          />
          <DialogFooter>
            <Button
              type="submit"
              disabled={pending || riderIds.length === 0}
              className="max-sm:h-11"
            >
              {t("submit")}
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
