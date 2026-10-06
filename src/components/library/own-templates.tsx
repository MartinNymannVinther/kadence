"use client";

import { useState } from "react";
import { BookPlus, CalendarPlus, Check, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button, buttonVariants } from "@/components/ui/button";
import type { RiderOption } from "@/components/calendar/types";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { adoptTemplateAction } from "@/modules/training/actions";
import { ScheduleDialog } from "./schedule-dialog";
import type { LibraryTemplate } from "./types";

export type OwnTemplateCard = LibraryTemplate & {
  riderId: string;
  riderName: string;
  /** A coach has already taken it into the team's library. */
  adopted: boolean;
};

/**
 * Riders' own sessions (ADR 0050). A rider sees theirs, plans one into
 * their own calendar and changes it; a coach sees every rider's, with the
 * rider's name, and takes one into the team's library as a copy.
 */
export function OwnTemplates({
  templates,
  mode,
  riders,
  today,
}: {
  templates: OwnTemplateCard[];
  mode: "rider" | "coach";
  riders: RiderOption[];
  today: string;
}) {
  const t = useTranslations("library.own");
  const duration = useTranslations("training.duration");
  const { run, pending } = useRun();
  const [scheduling, setScheduling] = useState<OwnTemplateCard | null>(null);
  const small = "max-sm:h-11";

  if (templates.length === 0)
    return (
      <p className="text-meta text-2sm">{t(mode === "rider" ? "emptyRider" : "emptyCoach")}</p>
    );

  return (
    <ul className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-surface">
      {templates.map((tpl) => (
        <li key={tpl.id} className="flex flex-col gap-2 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <Link
              href={`/library/${tpl.id}`}
              className="focus-ring hover:text-primary flex min-w-0 items-center gap-2 text-sm font-semibold"
            >
              <SportIcon sport={tpl.sport as "bike"} className="size-4 shrink-0" />
              <span className="min-w-0 break-words">{tpl.name}</span>
            </Link>
            <span className="text-meta text-xs tabular-nums">
              {mode === "coach" ? `${tpl.riderName} · ` : ""}
              {tpl.plannedMinutes > 0 ? durationText(tpl.plannedMinutes, duration) : ""}
            </span>
          </div>
          {tpl.description && (
            <p className="text-meta line-clamp-2 text-2sm leading-relaxed">{tpl.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {mode === "rider" && (
              <>
                <Button size="sm" className={small} onClick={() => setScheduling(tpl)}>
                  <CalendarPlus data-icon="inline-start" />
                  {t("schedule")}
                </Button>
                <Link
                  href={`/library/${tpl.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), small)}
                >
                  <Pencil data-icon="inline-start" />
                  {t("edit")}
                </Link>
              </>
            )}
            {mode === "coach" &&
              (tpl.adopted ? (
                <span className="text-meta flex items-center gap-1 text-2sm">
                  <Check aria-hidden className="size-4" />
                  {t("adopted")}
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className={small}
                  disabled={pending}
                  onClick={() =>
                    run(() => adoptTemplateAction({ templateId: tpl.id }), {
                      success: t("adoptedNow"),
                    })
                  }
                >
                  <BookPlus data-icon="inline-start" />
                  {t("adopt")}
                </Button>
              ))}
          </div>
        </li>
      ))}
      {scheduling && (
        <ScheduleDialog
          open
          onOpenChange={(open) => !open && setScheduling(null)}
          template={scheduling}
          riders={riders}
          today={today}
        />
      )}
    </ul>
  );
}
