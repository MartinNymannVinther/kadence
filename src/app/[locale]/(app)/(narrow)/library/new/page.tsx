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

/** A new template for the library — a coach's to write. */
export default async function NewTemplatePage() {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("library");
  const me = await whoAmI(ctx.orgId, ctx.userId);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Link
        href="/library"
        className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t("back")}
      </Link>
      <PageHeader size="detail" title={t("newTitle")} subtitle={t("newSubtitle")} />
      {me?.isCoach ? (
        <TemplateEditor />
      ) : (
        <EmptyState title={t("coachOnlyTitle")} hint={t("coachOnlyBody")} />
      )}
    </div>
  );
}
