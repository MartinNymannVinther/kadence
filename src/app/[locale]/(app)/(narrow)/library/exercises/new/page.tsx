import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ExerciseForm } from "@/components/exercises/editor/exercise-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/core/auth/session";
import { Link, redirect } from "@/i18n/navigation";
import { blankDraft, draftOf, loadExercise } from "@/modules/exercises/exercise-page";
import { paramOf } from "@/modules/exercises/library-paths";
import { exerciseRefSchema } from "@/modules/exercises/ref";
import { whoAmI } from "@/modules/team/access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("exercises");
  return { title: t("editor.newTitle") };
}

/**
 * A new exercise of the team's own, for a coach: from a base pose, or —
 * with `?from=builtin:<id>` or `?from=team:<uuid>` — from a copy of one
 * to adapt.
 */
export default async function NewExercisePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("exercises");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  if (!me?.isCoach)
    return <EmptyState title={t("library.coachOnly")} hint={t("library.coachOnlyHint")} />;
  const from = exerciseRefSchema.safeParse((await searchParams).from);
  const source = from.success ? await loadExercise(ctx, paramOf(from.data), t) : null;
  const draft = source
    ? draftOf(source, t("library.copyName", { name: source.view.name }))
    : blankDraft();

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Link
        href="/library/programs"
        className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t("library.back")}
      </Link>
      <PageHeader size="detail" title={t("editor.newTitle")} subtitle={t("editor.newSubtitle")} />
      <ExerciseForm initial={draft} />
    </div>
  );
}
