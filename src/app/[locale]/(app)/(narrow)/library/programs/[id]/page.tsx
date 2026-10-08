import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ProgramViewer } from "@/components/exercises/program-viewer";
import { ProgramActions } from "@/components/exercises/library/program-actions";
import { ProgramPrint } from "@/components/exercises/program-print";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { loadProgram } from "@/modules/exercises/program-page";
import { whoAmI } from "@/modules/team/access";
import { ridersToPlanFor } from "../../riders-for";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const ctx = await getOrgContext();
  const t = await getTranslations("exercises");
  const program = ctx ? await loadProgram(ctx, (await params).id, t) : null;
  return { title: program?.view.title ?? t("library.tabs.programs") };
}

/**
 * One programme, Kadence's or the team's: its exercises in the viewer,
 * part by part, with the way to take it along as a file or on paper —
 * and for a coach, to lay it into riders' calendars, change, copy or put
 * it away. On paper every part is printed, one after the other.
 */
export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("exercises");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const program = await loadProgram(ctx, (await params).id, t);
  if (!program) notFound();
  const isCoach = Boolean(me?.isCoach);
  const riders = isCoach ? await ridersToPlanFor(ctx, me) : [];
  const { view } = program;
  const needs = program.equipment.map((item) => t(`equipment.${item}`)).join(", ");

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Link
        href="/library/programs"
        className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm print:hidden"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t("library.back")}
      </Link>
      <PageHeader
        size="detail"
        kicker={program.team ? t("library.teamProgram") : t("library.kadenceProgram")}
        title={view.title}
        subtitle={view.description || undefined}
      />
      <p className="text-meta -mt-2 text-2sm tabular-nums">
        {t("library.meta", { count: program.exercises, minutes: program.minutes })}
        {needs && ` · ${t("library.needs", { equipment: needs })}`}
      </p>
      {program.archived && (
        <p className="bg-sticky text-sticky-ink rounded-md px-3 py-2 text-2sm print:hidden">
          {t("library.archivedNote")}
        </p>
      )}
      <ProgramActions
        program={{
          ref: program.ref,
          name: view.title,
          team: program.team,
          archived: program.archived,
          exercises: program.exercises,
          minutes: program.minutes,
          mobilityOnly: program.mobilityOnly,
        }}
        isCoach={isCoach}
        riders={riders}
        today={todayInCopenhagen()}
      />
      {view.parts.length === 0 ? (
        <EmptyState title={t("library.emptyProgram")} />
      ) : (
        <>
          <div className="print:hidden">
            <ProgramViewer program={view} />
          </div>
          <ProgramPrint program={view} />
        </>
      )}
    </div>
  );
}
