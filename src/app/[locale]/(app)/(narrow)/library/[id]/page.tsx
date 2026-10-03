import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { TemplateActions } from "@/components/library/template-actions";
import { TemplateEditor } from "@/components/library/template-editor";
import { StructureView } from "@/components/workouts/structure-view";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { whoAmI } from "@/modules/team/access";
import { getTemplate } from "@/modules/training/templates";
import { readStructure } from "@/modules/workouts/structure";
import { ridersToPlanFor } from "../riders-for";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const ctx = await getOrgContext();
  const t = await getTranslations("library");
  const template = ctx ? await getTemplate(ctx, (await params).id) : null;
  return { title: template?.name ?? t("title") };
}

/**
 * One template: a coach's own opens in the builder; DCU's and, for
 * everyone else, any template reads as the session it describes, with the
 * way to plan it and — for a coach — to copy it and adapt the copy.
 */
export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("library");
  const { id } = await params;
  const [me, template] = await Promise.all([whoAmI(ctx.orgId, ctx.userId), getTemplate(ctx, id)]);
  if (!template) notFound();
  const isCoach = Boolean(me?.isCoach);
  // A rider's own session is the rider's to change (ADR 0050); the team's, a coach's.
  const own = template.riderId !== null;
  const editable = own ? me?.rider?.id === template.riderId : isCoach && template.source === "own";
  const allRiders = await ridersToPlanFor(ctx, me);
  const riders = own ? allRiders.filter((r) => r.id === template.riderId) : allRiders;
  const sport = template.sport as "bike" | "strength" | "other";
  const card = {
    id: template.id,
    name: template.name,
    sport: template.sport,
    description: template.description,
    plannedMinutes: template.plannedMinutes,
    source: template.source,
    archived: template.archived,
  };

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
        title={template.name}
        subtitle={
          template.source === "dcu" ? t("dcuSubtitle") : own ? t("own.detailSubtitle") : undefined
        }
        kicker={template.source === "dcu" ? <Badge variant="secondary">DCU</Badge> : undefined}
      />
      {!own && (
        <TemplateActions
          template={card}
          riders={riders}
          isCoach={isCoach}
          today={todayInCopenhagen()}
          showEdit={false}
        />
      )}
      {editable ? (
        <TemplateEditor
          assist={!own}
          template={{
            id: template.id,
            name: template.name,
            sport: template.sport,
            description: template.description,
            structure: template.structure,
          }}
        />
      ) : (
        <div className="flex max-w-2xl flex-col gap-4">
          {template.description && (
            <p className="text-reading leading-relaxed whitespace-pre-line">
              {template.description}
            </p>
          )}
          <StructureView structure={readStructure(template.structure, sport)} rider={null} />
        </div>
      )}
    </div>
  );
}
