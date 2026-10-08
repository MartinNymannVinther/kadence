import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { BlockEditor } from "@/components/library/block-editor";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/core/auth/session";
import { redirect } from "@/i18n/navigation";
import { whoAmI } from "@/modules/team/access";
import { blockItemInput } from "@/modules/training/block-items";
import { getBlock } from "@/modules/training/blocks";
import { listTemplates } from "@/modules/training/templates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const ctx = await getOrgContext();
  const block = ctx ? await getBlock(ctx, (await params).id) : null;
  const t = await getTranslations("library.blocks");
  return { title: block?.name ?? t("title") };
}

/** One block, for a coach to change. */
export default async function BlockPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("library.blocks");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  if (!me?.isCoach) return <EmptyState title={t("coachOnly")} />;
  const { id } = await params;
  const [block, templates] = await Promise.all([getBlock(ctx, id), listTemplates(ctx)]);
  if (!block) notFound();
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader size="detail" title={block.name} subtitle={t("editBody")} />
      <BlockEditor
        initial={{
          id: block.id,
          name: block.name,
          description: block.description,
          weeks: block.weeks,
          items: block.items.map(blockItemInput),
        }}
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
