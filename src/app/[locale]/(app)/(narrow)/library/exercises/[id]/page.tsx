import type { Metadata } from "next";
import { ChevronLeft, Copy } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import { ExerciseForm } from "@/components/exercises/editor/exercise-form";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/core/auth/session";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { draftOf, loadExercise } from "@/modules/exercises/exercise-page";
import { whoAmI } from "@/modules/team/access";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const ctx = await getOrgContext();
  const t = await getTranslations("exercises");
  const exercise = ctx ? await loadExercise(ctx, (await params).id, t) : null;
  return { title: exercise?.view.name ?? t("library.exercises") };
}

/**
 * One exercise. The team's own opens in the editor for a coach; for
 * everyone else, and for Kadence's own, it reads as its card — with, for
 * a coach, the way to copy it into one of the team's own to adapt.
 */
export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("exercises");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const exercise = await loadExercise(ctx, (await params).id, t);
  if (!exercise) notFound();
  const isCoach = Boolean(me?.isCoach);
  const { view } = exercise;
  const needs = view.equipment.map((item) => t(`equipment.${item}`)).join(", ");
  const editable = isCoach && exercise.team;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Link
        href="/library/programs"
        className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t("library.back")}
      </Link>
      <PageHeader
        size="detail"
        kicker={exercise.team ? t("library.teamExercise") : t("library.kadenceExercise")}
        title={view.name}
        subtitle={editable ? t("editor.editSubtitle") : undefined}
      />
      {exercise.archived && (
        <p className="bg-sticky text-sticky-ink rounded-md px-3 py-2 text-2sm">
          {t("editor.archivedNote")}
        </p>
      )}
      {editable ? (
        <ExerciseForm key={view.ref} initial={draftOf(exercise)} />
      ) : (
        <div className="flex max-w-xl flex-col gap-3">
          <p className="text-meta text-2sm">
            {t(`groups.${view.group}`)}
            {needs && ` · ${t("library.needs", { equipment: needs })}`}
          </p>
          <ExerciseCard exercise={view} />
          {isCoach && (
            <Link
              href={{ pathname: "/library/exercises/new", query: { from: view.ref } }}
              className={cn(buttonVariants({ variant: "outline" }), "w-fit max-sm:h-11")}
            >
              <Copy data-icon="inline-start" />
              {t("library.copy")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
