import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ExerciseBrowser } from "@/components/exercises/library/exercise-browser";
import { LibraryTabs } from "@/components/exercises/library/library-tabs";
import { ProgramList } from "@/components/exercises/library/program-list";
import { getOrgContext } from "@/core/auth/session";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { libraryCatalogue } from "@/modules/exercises/library";
import { whoAmI } from "@/modules/team/access";

export async function generateMetadata(): Promise<Metadata> {
  const tabs = await getTranslations("exercises.library.tabs");
  return { title: tabs("programs") };
}

/**
 * "Øvelser og programmer" in the library (docs/plan-ovelser-og-programmer.md):
 * Kadence's own programmes and exercises beside the team's own. Every
 * member reads them; coaches make new ones, and with `?archived=1` see
 * the ones put away, to open and restore.
 */
export default async function ProgramsPage({
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
  const t = await getTranslations("library");
  const tl = await getTranslations("exercises.library");
  const words = await getTranslations("exercises");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const isCoach = Boolean(me?.isCoach);
  const showArchived = isCoach && (await searchParams).archived === "1";
  const catalogue = await libraryCatalogue(ctx, words, locale, { includeArchived: showArchived });
  const exercises = catalogue.exercises.filter((e) => showArchived || !e.archived);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title={t("title")}
        subtitle={tl("subtitle")}
        actions={
          isCoach ? (
            <>
              <Link href="/library/programs/new" className={cn(buttonVariants(), "max-sm:h-11")}>
                <Plus data-icon="inline-start" />
                {tl("newProgram")}
              </Link>
              <Link
                href="/library/exercises/new"
                className={cn(buttonVariants({ variant: "outline" }), "max-sm:h-11")}
              >
                <Plus data-icon="inline-start" />
                {tl("newExercise")}
              </Link>
            </>
          ) : undefined
        }
      />
      <LibraryTabs />
      <section aria-labelledby="library-programs" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="library-programs" className="text-lg font-semibold">
            {tl("programs")}
          </h2>
          <p className="text-meta text-2sm">{tl("programsHint")}</p>
          <p className="text-meta text-2sm">
            {tl("openPageLine")}{" "}
            <Link
              href="/guides/programs"
              className="focus-ring text-primary font-medium underline-offset-4 hover:underline"
            >
              {tl("openPageLink")}
            </Link>
          </p>
        </div>
        <ProgramList programs={catalogue.programs} />
      </section>
      <section aria-labelledby="library-exercises" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="library-exercises" className="text-lg font-semibold">
            {tl("exercises")}
          </h2>
          <p className="text-meta text-2sm">{tl("exercisesHint")}</p>
        </div>
        <ExerciseBrowser exercises={exercises} />
      </section>
      {isCoach && (
        <Link
          href={showArchived ? "/library/programs" : "/library/programs?archived=1"}
          className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center text-2sm underline-offset-4 hover:underline"
        >
          {showArchived ? tl("hideArchived") : tl("showArchived")}
        </Link>
      )}
    </div>
  );
}
