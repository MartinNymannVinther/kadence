import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TemplateEditor } from "@/components/library/template-editor";
import { getOrgContext } from "@/core/auth/session";
import { Link, redirect } from "@/i18n/navigation";
import { whoAmI } from "@/modules/team/access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("library");
  return { title: t("newTitle") };
}

const TITLES = { bike: "newTitleBike", strength: "newTitleStrength" } as const;

/**
 * A new template for the library — a coach's to write. `?sport=` opens
 * the builder on that sport, which can still be changed in the form, and
 * `?ai=1` with "Byg med AI" open (ADR 0038).
 */
export default async function NewTemplatePage({
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
  const search = await searchParams;
  const asked = search.sport;
  const sport = asked === "bike" || asked === "strength" ? asked : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Link
        href="/library"
        className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t("back")}
      </Link>
      <PageHeader
        size="detail"
        title={t(sport ? TITLES[sport] : "newTitle")}
        subtitle={t("newSubtitle")}
      />
      {me?.isCoach ? (
        <TemplateEditor sport={sport} assistOpen={search.ai === "1"} />
      ) : (
        <EmptyState title={t("coachOnlyTitle")} hint={t("coachOnlyBody")} />
      )}
    </div>
  );
}
