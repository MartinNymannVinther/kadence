"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, CalendarPlus, Copy, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button, buttonVariants } from "@/components/ui/button";
import type { RiderOption } from "@/components/calendar/types";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { archiveTemplateAction, duplicateTemplateAction } from "@/modules/training/actions";
import { ScheduleDialog } from "./schedule-dialog";
import type { LibraryTemplate } from "./types";

/**
 * What can be done with a template: plan it into the calendar, and for a
 * coach change it, copy it and put it away. DCU's own are read-only —
 * "Kopiér for at tilpasse" makes a copy the coach may change (ADR 0014).
 */
export function TemplateActions({
  template,
  riders,
  isCoach,
  today,
  showEdit = true,
}: {
  template: LibraryTemplate;
  riders: RiderOption[];
  isCoach: boolean;
  today: string;
  showEdit?: boolean;
}) {
  const t = useTranslations("library.actions");
  const router = useRouter();
  const { run, pending } = useRun();
  const [scheduling, setScheduling] = useState(false);
  const dcu = template.source === "dcu";
  const small = "max-sm:h-11";

  async function duplicate() {
    const copy = await run(
      () =>
        duplicateTemplateAction({
          templateId: template.id,
          name: t("copyName", { name: template.name }).slice(0, 120),
        }),
      { success: t("copied"), refresh: false },
    );
    if (copy) router.push(`/library/${copy.id}`);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {riders.length > 0 && !template.archived && (
        <Button size="sm" className={small} onClick={() => setScheduling(true)}>
          <CalendarPlus data-icon="inline-start" />
          {t("schedule")}
        </Button>
      )}
      {isCoach && !dcu && showEdit && (
        <Link
          href={`/library/${template.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), small)}
        >
          <Pencil data-icon="inline-start" />
          {t("edit")}
        </Link>
      )}
      {isCoach && (
        <Button
          size="sm"
          variant="outline"
          className={small}
          disabled={pending}
          onClick={duplicate}
        >
          <Copy data-icon="inline-start" />
          {dcu ? t("copyToAdapt") : t("copy")}
        </Button>
      )}
      {isCoach && (
        <Button
          size="sm"
          variant="ghost"
          className={small}
          disabled={pending}
          onClick={() =>
            run(
              () =>
                archiveTemplateAction({ templateId: template.id, archived: !template.archived }),
              { success: template.archived ? t("restored") : t("archived") },
            )
          }
        >
          {template.archived ? (
            <ArchiveRestore data-icon="inline-start" />
          ) : (
            <Archive data-icon="inline-start" />
          )}
          {template.archived ? t("restore") : t("archive")}
        </Button>
      )}
      {scheduling && (
        <ScheduleDialog
          open
          onOpenChange={setScheduling}
          template={template}
          riders={riders}
          today={today}
        />
      )}
    </div>
  );
}
