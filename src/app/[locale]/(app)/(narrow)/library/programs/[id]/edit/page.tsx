import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ProgramBuilder } from "@/components/exercises/builder/program-builder";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/core/auth/session";
import { Link, redirect } from "@/i18n/navigation";
import { libraryCatalogue } from "@/modules/exercises/library";
import { programHref } from "@/modules/exercises/library-paths";
import { draftParts } from "@/modules/exercises/program-draft";
import { loadProgram } from "@/modules/exercises/program-page";
import { whoAmI } from "@/modules/team/access";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const ctx = await getOrgContext();
  const t = await getTranslations("exercises");
  const program = ctx ? await loadProgram(ctx, (await params).id, t) : null;
  return { title: program?.name ?? t("builder.newTitle") };
}

/** One of the team's own programmes in the builder, for a coach. Kadence's own are copied instead. */
export default async function EditProgramPage({ params }: { params: Promise<{ id: string }> }) {
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
  const [program, catalogue] = await Promise.all([
    loadProgram(ctx, (await params).id, t),
    libraryCatalogue(ctx, t, locale),
  ]);
  if (!program || !program.team) notFound();

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Link
        href={programHref(program.ref)}
        className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {program.name}
      </Link>
      <PageHeader size="detail" title={program.name} subtitle={t("builder.editSubtitle")} />
      <ProgramBuilder
        key={program.ref}
        initial={{
          id: program.ref.slice("team:".length),
          archived: program.archived,
          name: program.name,
          description: program.description,
          parts: draftParts(program.parts),
        }}
        exercises={catalogue.exercises}
      />
    </div>
  );
}
