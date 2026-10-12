"use client";

import { useId, useState } from "react";
import { CircleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRun } from "@/components/common/use-run";
import { RepeatFields } from "@/components/calendar/repeat-fields";
import { RiderPicker } from "@/components/calendar/rider-picker";
import {
  TimePlaceFields,
  timePlaceDraft,
  timePlaceValue,
} from "@/components/calendar/time-place-fields";
import type { RiderOption } from "@/components/calendar/types";
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
import { scheduleProgramAction } from "@/modules/exercises/actions";
import { MAX_SESSION_EXERCISES } from "@/modules/exercises/program-session";
import type { ProgramRef } from "@/modules/exercises/ref";
import type { Repeat } from "@/modules/training/recurrence";

/**
 * "Læg i kalenderen" for a programme: the riders — one, several or the
 * whole group — the day, a time and a place (ADR 0058), and a repeat on
 * chosen weekdays (ADR 0041). The same fields as the library's "Planlæg";
 * the server makes the strength session and lays it in through the
 * calendar's own scheduler.
 */
export function ProgramScheduleDialog({
  open,
  onOpenChange,
  program,
  riders,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: {
    ref: ProgramRef;
    name: string;
    exercises: number;
    minutes: number;
    /** Only stretches and mobility: DCU's spacing of strength sessions says nothing about it. */
    mobilityOnly: boolean;
  };
  riders: RiderOption[];
  today: string;
}) {
  const t = useTranslations("exercises.schedule");
  const common = useTranslations("common");
  const locale = useLocale();
  const { run, pending } = useRun();
  const dateId = useId();
  const [riderIds, setRiderIds] = useState(riders.length === 1 ? [riders[0]!.id] : []);
  const [onDate, setOnDate] = useState(today);
  const [repeat, setRepeat] = useState<Repeat | null>(null);
  const [at, setAt] = useState(() => timePlaceDraft());
  const tooLong = program.exercises > MAX_SESSION_EXERCISES;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (riderIds.length === 0 || tooLong) return;
    const done = await run(() =>
      scheduleProgramAction({
        program: program.ref,
        riderIds,
        onDate,
        repeat: repeat ?? undefined,
        locale,
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
            <DialogDescription>{program.name}</DialogDescription>
          </DialogHeader>
          {tooLong ? (
            <p className="bg-sticky text-sticky-ink flex gap-2 rounded-md px-3 py-2 text-2sm leading-relaxed">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {t("tooLong", { count: program.exercises })}
            </p>
          ) : (
            <p className="text-meta text-2sm leading-relaxed">
              {t("intro", { count: program.exercises, minutes: program.minutes })}
            </p>
          )}
          {riders.length === 0 ? (
            <p className="text-2sm">{t("noRiders")}</p>
          ) : riders.length > 1 ? (
            <RiderPicker riders={riders} selected={riderIds} onChange={setRiderIds} />
          ) : (
            <p className="text-2sm">{t("forRider", { name: riders[0]!.name })}</p>
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
            sport={program.mobilityOnly ? null : "strength"}
            plannedMinutes={program.minutes}
            riderIds={riderIds}
            riders={riders}
            value={repeat}
            onChange={setRepeat}
          />
          <DialogFooter>
            <Button
              type="submit"
              disabled={pending || riderIds.length === 0 || tooLong}
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
