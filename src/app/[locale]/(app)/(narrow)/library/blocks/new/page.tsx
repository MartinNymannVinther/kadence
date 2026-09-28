import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { BlockEditor } from "@/components/library/block-editor";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/core/auth/session";
import { redirect } from "@/i18n/navigation";
import { whoAmI } from "@/modules/team/access";
import { listTemplates } from "@/modules/training/templates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("library.blocks");
  return { title: t("new") };
}

/** A new block, for a coach. */
export default async function NewBlockPage() {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("library.blocks");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  if (!me?.isCoach) return <EmptyState title={t("coachOnly")} />;
  const templates = await listTemplates(ctx);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader size="detail" title={t("new")} subtitle={t("newBody")} />
      <BlockEditor
        initial={{ id: null, name: "", description: "", weeks: 4, items: [] }}
        templates={templates.map((tpl) => ({
          id: tpl.id,
          name: tpl.name,
          sport: tpl.sport,
          plannedMinutes: tpl.plannedMinutes,
        }))}
      />
    </div>
  );
}
