"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  CalendarPlus,
  Copy,
  Download,
  Pencil,
  Share2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import type { RiderOption } from "@/components/calendar/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { archiveTeamProgramAction } from "@/modules/exercises/actions";
import { downloadHref, paramOf, programHref } from "@/modules/exercises/library-paths";
import type { ProgramRef } from "@/modules/exercises/ref";
import { PrintButton } from "./print-button";
import { ProgramScheduleDialog } from "./program-schedule-dialog";

/**
 * What can be done with a programme: lay it into riders' calendars — a
 * coach for any of them, a rider for themselves (docs/adr/0078) — take it
 * along as a file or on paper (everyone), share one of Kadence's own as
 * an open page, and for a coach change the team's own, copy any to adapt,
 * and put the team's away.
 */
export function ProgramActions({
  program,
  isCoach,
  riders,
  today,
}: {
  program: {
    ref: ProgramRef;
    name: string;
    team: boolean;
    archived: boolean;
    exercises: number;
    minutes: number;
    mobilityOnly: boolean;
  };
  isCoach: boolean;
  riders: RiderOption[];
  today: string;
}) {
  const t = useTranslations("exercises.library");
  const schedule = useTranslations("exercises.schedule");
  const locale = useLocale();
  const { run, pending } = useRun();
  const [scheduling, setScheduling] = useState(false);
  const small = "max-sm:h-11";

  return (
    <div className="flex flex-wrap gap-1.5 print:hidden">
      {riders.length > 0 && !program.archived && (
        <Button size="sm" className={small} onClick={() => setScheduling(true)}>
          <CalendarPlus data-icon="inline-start" />
          {schedule("button")}
        </Button>
      )}
      <a
        href={downloadHref(program.ref, locale)}
        title={t("downloadHint")}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), small)}
      >
        <Download data-icon="inline-start" />
        {t("download")}
      </a>
      <PrintButton title={program.name} label={t("print")} />
      {!program.team && (
        // Kadence's own may be shared with anyone; a team's own stays in the team (ADR 0067).
        <Link
          href={{ pathname: "/guides/programs", query: { program: program.ref } }}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), small)}
        >
          <Share2 data-icon="inline-start" />
          {t("share")}
        </Link>
      )}
      {isCoach && program.team && (
        <Link
          href={`${programHref(program.ref)}/edit`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), small)}
        >
          <Pencil data-icon="inline-start" />
          {t("edit")}
        </Link>
      )}
      {isCoach && (
        <Link
          href={{ pathname: "/library/programs/new", query: { from: program.ref } }}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), small)}
        >
          <Copy data-icon="inline-start" />
          {t("copy")}
        </Link>
      )}
      {isCoach && program.team && (
        <Button
          size="sm"
          variant="ghost"
          className={small}
          disabled={pending}
          onClick={() =>
            run(
              () =>
                archiveTeamProgramAction({
                  programId: paramOf(program.ref),
                  archived: !program.archived,
                }),
              { success: program.archived ? t("restoredDone") : t("archivedDone") },
            )
          }
        >
          {program.archived ? (
            <ArchiveRestore data-icon="inline-start" />
          ) : (
            <Archive data-icon="inline-start" />
          )}
          {program.archived ? t("restore") : t("archive")}
        </Button>
      )}
      {scheduling && (
        <ProgramScheduleDialog
          open
          onOpenChange={setScheduling}
          program={program}
          riders={riders}
          today={today}
        />
      )}
    </div>
  );
}
