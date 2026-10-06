"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RiderPicker } from "@/components/calendar/rider-picker";
import type { RiderOption } from "@/components/calendar/types";
import { num } from "@/components/charts/format";
import { useRun } from "@/components/common/use-run";
import { flagSentence } from "@/components/insight/flag-text";
import { basisText } from "@/components/season/basis-text";
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
import { mondayOf } from "@/core/dates";
import { applyBlockAction, previewBlockAction } from "@/modules/training/block-actions";
import type { RiderPreview } from "@/modules/training/block-apply";

/**
 * "Læg ind": a block into the riders' calendars from a Monday — but first
 * the preview: every rider's weeks against DCU's corridor, the ramp and
 * the 48 hours, with the guardrails' words. The coach reads, then presses
 * again. Nothing is enforced; a flagged block can still go in.
 */
export function ApplyBlockDialog({
  open,
  onOpenChange,
  block,
  riders,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: { id: string; name: string; weeks: number };
  riders: RiderOption[];
  today: string;
}) {
  const t = useTranslations("library.blocks");
  const flags = useTranslations("insight.flag");
  const insight = useTranslations("insight");
  const common = useTranslations("common");
  const locale = useLocale();
  const { run, pending } = useRun();
  const dateId = useId();
  const [riderIds, setRiderIds] = useState(riders.length === 1 ? [riders[0]!.id] : []);
  const [start, setStart] = useState(mondayOf(today));
  const [preview, setPreview] = useState<RiderPreview[] | null>(null);
  const startMonday = mondayOf(start);

  async function doPreview(event: React.FormEvent) {
    event.preventDefault();
    const result = await run(
      () => previewBlockAction({ blockId: block.id, riderIds, startMonday }),
      { refresh: false },
    );
    if (result) setPreview(result);
  }
  async function apply() {
    const done = await run(() => applyBlockAction({ blockId: block.id, riderIds, startMonday }), {
      success: t("applied", { count: riderIds.length }),
    });
    if (done) onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setPreview(null);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={doPreview} className="flex min-w-0 flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("applyTitle")}</DialogTitle>
            <DialogDescription>
              {t("applyBody", { name: block.name, weeks: block.weeks })}
            </DialogDescription>
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
            <label htmlFor={dateId} className="text-sm font-medium">
              {t("startMonday")}
            </label>
            <Input
              id={dateId}
              type="date"
              required
              value={start}
              className="max-sm:h-11"
              onChange={(e) => {
                setStart(e.target.value);
                setPreview(null);
              }}
            />
            {start !== startMonday && (
              <p className="text-meta text-xs">
                {t("snapped", { date: dayMonth(startMonday, locale) })}
              </p>
            )}
          </div>

          {preview && (
            <div className="flex max-h-80 min-w-0 flex-col gap-3 overflow-y-auto">
              {preview.map((r) => (
                <section key={r.riderId} className="border-border rounded-lg border p-3">
                  <h3 className="text-sm font-semibold">
                    {r.name}{" "}
                    <span className="text-meta font-normal">
                      {basisText(r.basis, (k, v) => insight(k, v))}
                    </span>
                  </h3>
                  <ol className="mt-2 flex flex-col gap-1.5 text-2sm">
                    {r.weeks.map((w) => (
                      <li key={w.week} className="flex flex-col gap-0.5">
                        <span className="tabular-nums">
                          {t("weekLine", {
                            n: w.week + 1,
                            date: dayMonth(w.monday, locale),
                            hours: num(w.bikeHours, locale, 1),
                            strength: w.strengthSessions,
                          })}
                          {w.corridor && (
                            <span className="text-meta">
                              {" "}
                              ·{" "}
                              {t("corridor", {
                                low: num(w.corridor.low, locale, 1),
                                high: num(w.corridor.high, locale, 1),
                              })}
                            </span>
                          )}
                        </span>
                        {w.flags.map((f, i) => (
                          <span key={i} className="text-warning text-xs">
                            {flagSentence(f, (key, values) => flags(key as "ramp", values), {
                              locale,
                              klass: basisText(r.basis, (k, v) => insight(k, v)),
                            })}
                          </span>
                        ))}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
              <p className="text-meta text-xs">{t("previewNote")}</p>
            </div>
          )}

          <DialogFooter>
            {preview ? (
              <Button type="button" disabled={pending} className="max-sm:h-11" onClick={apply}>
                {t("confirm")}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={pending || riderIds.length === 0}
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
