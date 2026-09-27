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
import { SegmentedChoice } from "@/components/ui/segmented";
import { FeelScale, RpeScale } from "@/components/session/feedback-scales";
import { SportIcon } from "@/components/training/sport-icon";
import { NumberField } from "@/components/workouts/number-field";
import { logActivityAction } from "@/modules/training/actions";

const SPORTS = ["bike", "strength", "other"] as const;
type Sport = (typeof SPORTS)[number];

/**
 * "Log træning": something done that nobody planned — a ride with
 * friends, a run — entered by hand. How long and how hard is enough for a
 * load (ADR 0015); a FIT file does the rest in wave 3.
 */
export function LogActivityDialog({
  open,
  onOpenChange,
  riderId,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riderId: string;
  defaultDate: string;
}) {
  const t = useTranslations("calendar.log");
  const sports = useTranslations("training.sport");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const base = useId();
  const [onDate, setOnDate] = useState(defaultDate);
  const [sport, setSport] = useState<Sport>("bike");
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [km, setKm] = useState<number | null>(null);
  const [rpe, setRpe] = useState<number | null>(null);
  const [feel, setFeel] = useState<number | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const done = await run(
      () =>
        logActivityAction({
          riderId,
          onDate,
          sport,
          title: title.trim(),
          minutes,
          distanceKm: sport === "strength" ? null : km,
          rpe,
          feel,
        }),
      { success: t("saved") },
    );
    if (done) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("body")}</DialogDescription>
          </DialogHeader>
          <SegmentedChoice<Sport>
            label={t("sport")}
            value={sport}
            onChange={setSport}
            className="self-start [&>button]:max-sm:min-h-11"
            options={SPORTS.map((s) => ({
              value: s,
              label: (
                <span className="flex items-center gap-1.5">
                  <SportIcon sport={s} className="size-3.5" />
                  {sports(s)}
                </span>
              ),
            }))}
          />
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${base}-date`} className="text-sm font-medium">
                {t("date")}
              </label>
              <Input
                id={`${base}-date`}
                type="date"
                required
                value={onDate}
                className="max-sm:h-11"
                onChange={(e) => setOnDate(e.target.value)}
              />
            </div>
            <div className="flex min-w-40 flex-1 flex-col gap-1.5">
              <label htmlFor={`${base}-title`} className="text-sm font-medium">
                {t("name")}
              </label>
              <Input
                id={`${base}-title`}
                value={title}
                maxLength={120}
                placeholder={t("namePlaceholder")}
                className="max-sm:h-11"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <NumberField
              label={t("minutes")}
              value={minutes}
              min={1}
              max={1440}
              suffix="min"
              onChange={(m) => setMinutes(Math.max(1, m))}
            />
            {sport !== "strength" && (
              <NumberField
                label={t("km")}
                value={km}
                max={400}
                suffix="km"
                onChange={setKm}
                onClear={() => setKm(null)}
              />
            )}
          </div>
          <RpeScale value={rpe} onChange={setRpe} />
          <FeelScale value={feel} onChange={setFeel} />
          <DialogFooter>
            <Button type="submit" disabled={pending} className="max-sm:h-11">
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
