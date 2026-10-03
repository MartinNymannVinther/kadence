import type { Metadata } from "next";
import { Bike, Dumbbell, Plus, Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { InstallDcuButton } from "@/components/library/install-dcu-button";
import { BlockList } from "@/components/library/block-list";
import { LibraryList } from "@/components/library/library-list";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { whoAmI } from "@/modules/team/access";
import { listBlocks } from "@/modules/training/blocks";
import { listOwnTemplates, listTemplates } from "@/modules/training/templates";
import { OwnTemplates } from "@/components/library/own-templates";
import { ridersToPlanFor } from "./riders-for";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("library");
  return { title: t("title") };
}

/**
 * The team's workout library: sessions and programmes. Everyone reads it;
 * coaches keep it, and start a new bike or strength session from the top
 * of it. `?archived=1` shows what was put away as well.
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
  const isCoach = Boolean(me?.isCoach);
  const [templates, riders, blocks, own] = await Promise.all([
    listTemplates(ctx, showArchived),
    ridersToPlanFor(ctx, me),
    listBlocks(ctx),
    // A rider's own sessions, and for a coach every rider's (ADR 0050).
    isCoach || me?.rider
      ? listOwnTemplates(ctx, isCoach ? {} : { riderId: me!.rider!.id })
      : Promise.resolve([]),
  ]);
  const adopted = new Set(templates.map((tpl) => tpl.copiedFrom).filter(Boolean));
  const ownMode = isCoach ? ("coach" as const) : me?.rider ? ("rider" as const) : null;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          isCoach ? (
            // The coach's corner of the library: a new session of either
            // kind, one built with AI (ADR 0038), and DCU's strength
            // programmes fetched into it (ADR 0014).
            <>
              <Link href="/library/new?sport=bike" className={cn(buttonVariants(), "max-sm:h-11")}>
                <Bike data-icon="inline-start" />
                {t("newBike")}
              </Link>
              <Link
                href="/library/new?sport=strength"
                className={cn(buttonVariants({ variant: "outline" }), "max-sm:h-11")}
              >
                <Dumbbell data-icon="inline-start" />
                {t("newStrength")}
              </Link>
              <Link
                href="/library/new?ai=1"
                className={cn(buttonVariants({ variant: "outline" }), "max-sm:h-11")}
              >
                <Sparkles data-icon="inline-start" />
                {t("newWithAi")}
              </Link>
              <InstallDcuButton />
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
      {ownMode && (
        <section aria-labelledby="library-own" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <h2 id="library-own" className="text-lg font-semibold">
                {t(ownMode === "rider" ? "own.titleRider" : "own.titleCoach")}
              </h2>
              <p className="text-meta text-2sm">
                {t(ownMode === "rider" ? "own.subtitleRider" : "own.subtitleCoach")}
              </p>
            </div>
            {ownMode === "rider" && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/library/new?sport=bike&mine=1"
                  className={cn(buttonVariants({ variant: "outline" }), "max-sm:h-11")}
                >
                  <Bike data-icon="inline-start" />
                  {t("newBike")}
                </Link>
                <Link
                  href="/library/new?sport=strength&mine=1"
                  className={cn(buttonVariants({ variant: "outline" }), "max-sm:h-11")}
                >
                  <Dumbbell data-icon="inline-start" />
                  {t("newStrength")}
                </Link>
              </div>
            )}
          </div>
          <OwnTemplates
            mode={ownMode}
            riders={riders}
            today={todayInCopenhagen()}
            templates={own.map((tpl) => ({
              id: tpl.id,
              name: tpl.name,
              sport: tpl.sport,
              description: tpl.description,
              plannedMinutes: tpl.plannedMinutes,
              source: tpl.source,
              archived: tpl.archived,
              riderId: tpl.riderId!,
              riderName: tpl.riderName,
              adopted: adopted.has(tpl.id),
            }))}
          />
        </section>
      )}
      <section aria-labelledby="library-blocks" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 id="library-blocks" className="text-lg font-semibold">
              {t("blocks.title")}
            </h2>
            <p className="text-meta text-2sm">{t("blocks.subtitle")}</p>
          </div>
          {isCoach && (
            <Link
              href="/library/blocks/new"
              className={cn(buttonVariants({ variant: "outline" }), "max-sm:h-11")}
            >
              <Plus data-icon="inline-start" />
              {t("blocks.new")}
            </Link>
          )}
        </div>
        <BlockList
          blocks={blocks.map((b) => ({
            id: b.id,
            name: b.name,
            description: b.description,
            weeks: b.weeks,
            sessions: b.items.length,
            bikeHours: b.items
              .filter((i) => i.sport === "bike")
              .reduce((s, i) => s + i.plannedMinutes / 60, 0),
          }))}
          riders={riders}
          isCoach={isCoach}
          today={todayInCopenhagen()}
        />
      </section>
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
