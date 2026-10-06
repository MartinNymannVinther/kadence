import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/core/auth/session";
import { Link, redirect } from "@/i18n/navigation";
import { loadExercise } from "@/modules/exercises/exercise-page";

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

/** One exercise, Kadence's or the team's, as its card. */
export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("exercises");
  const exercise = await loadExercise(ctx, (await params).id, t);
  if (!exercise) notFound();
  const { view } = exercise;
  const needs = view.equipment.map((item) => t(`equipment.${item}`)).join(", ");

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
      />
      <div className="flex max-w-xl flex-col gap-3">
        <p className="text-meta text-2sm">
          {t(`groups.${view.group}`)}
          {needs && ` · ${t("library.needs", { equipment: needs })}`}
        </p>
        <ExerciseCard exercise={view} />
      </div>
    </div>
  );
}
