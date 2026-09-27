import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { InstallDcuButton } from "@/components/library/install-dcu-button";
import { LibraryList } from "@/components/library/library-list";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { whoAmI } from "@/modules/team/access";
import { listTemplates } from "@/modules/training/templates";
import { ridersToPlanFor } from "./riders-for";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("library");
  return { title: t("title") };
}

/**
 * The team's library of sessions and programmes. Everyone reads it;
 * coaches keep it. `?archived=1` shows what was put away as well.
 */
export default async function LibraryPage({
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
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const showArchived = (await searchParams).archived === "1";
  const [templates, riders] = await Promise.all([
    listTemplates(ctx, showArchived),
    ridersToPlanFor(ctx, me),
  ]);
  const isCoach = Boolean(me?.isCoach);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          isCoach ? (
            // The coach's corner of the library: a new template, and DCU's
            // strength programmes fetched into it (ADR 0014).
            <>
              <InstallDcuButton />
              <Link href="/library/new" className={cn(buttonVariants(), "max-sm:h-11")}>
                <Plus data-icon="inline-start" />
                {t("new")}
              </Link>
            </>
          ) : undefined
        }
      />
      <LibraryList
        templates={templates.map((tpl) => ({
          id: tpl.id,
          name: tpl.name,
          sport: tpl.sport,
          description: tpl.description,
          plannedMinutes: tpl.plannedMinutes,
          source: tpl.source,
          archived: tpl.archived,
        }))}
        riders={riders}
        isCoach={isCoach}
        today={todayInCopenhagen()}
      />
      {isCoach && (
        <Link
          href={showArchived ? "/library" : "/library?archived=1"}
          className="focus-ring text-meta hover:text-foreground w-fit text-2sm underline-offset-4 hover:underline"
        >
          {showArchived ? t("hideArchived") : t("showArchived")}
        </Link>
      )}
    </div>
  );
}
