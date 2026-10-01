"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRun } from "@/components/common/use-run";
import { PlanPreview } from "@/components/season/plan-preview";
import { dayMonth } from "@/components/training/day-label";
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
import { addDaysIso, mondayOf, weekNumber } from "@/core/dates";
import type { CopyPreview } from "@/modules/training/week-copy";
import { copyWeekAction, previewCopyWeekAction } from "@/modules/training/week-actions";
import { RiderPicker } from "./rider-picker";
import type { RiderOption } from "./types";

/**
 * "Kopiér ugen før" (ADR 0042): every chosen rider's own sessions of
 * another week — the one before, unless the coach picks another — laid on
 * the same weekdays of this one. First what it gives, in the four numbers
 * per rider; then the copy. What was ridden stays where it was.
 */
export function CopyWeekDialog({
  open,
  onOpenChange,
  monday,
  riders,
  defaultRiderIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The week the copy goes into. */
  monday: string;
  riders: RiderOption[];
  defaultRiderIds: string[];
}) {
  const t = useTranslations("calendar.copyWeek");
  const common = useTranslations("common");
  const locale = useLocale();
  const id = useId();
  const { run, pending } = useRun();
  const [riderIds, setRiderIds] = useState(defaultRiderIds);
  const [fromDay, setFromDay] = useState(addDaysIso(monday, -7));
  const [preview, setPreview] = useState<CopyPreview | null>(null);
  const fromMonday = fromDay ? mondayOf(fromDay) : "";
  const input = { riderIds, fromMonday, toMonday: monday };
  const week = (m: string) =>
    t("weekLabel", {
      n: weekNumber(m),
      from: dayMonth(m, locale),
      to: dayMonth(addDaysIso(m, 6), locale),
    });

  async function look(event: React.FormEvent) {
    event.preventDefault();
    if (riderIds.length === 0 || !fromMonday) return;
    const result = await run(() => previewCopyWeekAction(input), { refresh: false });
    if (result) setPreview(result);
  }

  async function copy() {
    const done = await run(() => copyWeekAction(input));
    if (done) {
      toast.success(t("done", { count: done.copied }));
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={look} className="flex min-w-0 flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("body", { week: week(monday) })}</DialogDescription>
          </DialogHeader>
          {riders.length > 1 ? (
            <RiderPicker
              riders={riders}
              selected={riderIds}
              onChange={(ids) => {
                setRiderIds(ids);
                setPreview(null);
              }}
            />
          ) : (
            <p className="text-2sm">{riders[0]?.name}</p>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium">
              {t("from")}
            </label>
            <Input
              id={id}
              type="date"
              required
              value={fromDay}
              className="max-w-48 max-sm:h-11"
              onChange={(e) => {
                setFromDay(e.target.value);
                setPreview(null);
              }}
            />
            {fromMonday && <p className="text-meta text-xs">{week(fromMonday)}</p>}
          </div>

          {preview && (
            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-2sm" role="status">
                {t("counts", { copied: preview.copied })}{" "}
                {preview.skipped > 0 && t("skipped", { skipped: preview.skipped })}
              </p>
              {preview.copied > 0 && <PlanPreview previews={preview.riders} period="week" />}
            </div>
          )}

          <DialogFooter>
            {preview ? (
              <Button
                type="button"
                disabled={pending || preview.copied === 0}
                className="max-sm:h-11"
                onClick={copy}
              >
                {t("confirm")}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={pending || riderIds.length === 0 || !fromMonday}
                className="max-sm:h-11"
              >
                {t("preview")}
              </Button>
            )}
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
