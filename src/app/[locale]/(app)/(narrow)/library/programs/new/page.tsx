import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ProgramBuilder } from "@/components/exercises/builder/program-builder";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/core/auth/session";
import { Link, redirect } from "@/i18n/navigation";
import { libraryCatalogue } from "@/modules/exercises/library";
import { draftParts } from "@/modules/exercises/program-draft";
import { loadProgramByRef } from "@/modules/exercises/program-page";
import { programRefSchema } from "@/modules/exercises/ref";
import { whoAmI } from "@/modules/team/access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("exercises");
  return { title: t("builder.newTitle") };
}

/**
 * A new programme of the team's own, for a coach: from nothing, or — with
 * `?from=builtin:<id>` or `?from=team:<uuid>` — from a copy to adapt.
 */
export default async function NewProgramPage({
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
  const from = programRefSchema.safeParse((await searchParams).from);
  const [source, catalogue] = await Promise.all([
    from.success ? loadProgramByRef(ctx, from.data, t) : null,
    libraryCatalogue(ctx, t, locale),
  ]);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Link
        href="/library/programs"
        className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t("library.back")}
      </Link>
      <PageHeader size="detail" title={t("builder.newTitle")} subtitle={t("builder.newSubtitle")} />
      <ProgramBuilder
        initial={
          source
            ? {
                id: null,
                archived: false,
                name: t("library.copyName", { name: source.name }).slice(0, 60),
                description: source.description,
                parts: draftParts(source.parts),
              }
            : {
                id: null,
                archived: false,
                name: "",
                description: "",
                parts: [{ key: "any", items: [] }],
              }
        }
        exercises={catalogue.exercises}
      />
    </div>
  );
}
