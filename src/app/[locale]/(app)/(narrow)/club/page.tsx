import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CrownChampions, NewChampionship, NewRound } from "@/components/club/club-forms";
import { HonourRoll } from "@/components/club/honour-roll";
import { RoundCard } from "@/components/club/round-card";
import { StandingsBoard } from "@/components/club/standings-board";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { notFoundWithout } from "@/core/feature-gate";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getChampionship, listChampions, listChampionships } from "@/modules/club/service";
import type { ClubClass } from "@/modules/club/standings";
import { riderClass } from "@/modules/season/class";
import { seasonStartYear } from "@/modules/dcu";
import { whoAmI } from "@/modules/team/access";
import { getRiders } from "@/modules/team/riders";

export async function generateMetadata(): Promise<Metadata> {
  notFoundWithout("clubChampionship");
  const t = await getTranslations("club");
  return { title: t("title") };
}

/**
 * "Klubmester" (ADR 0051): the club's own championship — the season's
 * standings per class, the rounds and their results, the year's biggest
 * improvement and the roll of honour. The one page in Kadence where
 * riders and parents see placings. A coach keeps it on the same page.
 * While the installation has the championship off, the page is not there
 * for anyone, whatever the team chose (ADR 0056).
 */
export default async function ClubPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  notFoundWithout("clubChampionship");
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("club");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const isCoach = Boolean(me?.isCoach);
  const championships = await listChampionships(ctx);
  if (championships === null) {
    if (!isCoach) notFound();
    return (
      <div className="flex max-w-3xl flex-col gap-5">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <EmptyState title={t("off.title")} hint={t("off.body")} />
        <Link href="/settings/team" className="text-primary text-2sm hover:underline">
          {t("off.link")}
        </Link>
      </div>
    );
  }

  const today = todayInCopenhagen();
  const year = Number(today.slice(0, 4));
  const asked = (await searchParams).c;
  const selected = championships.find((c) => c.id === asked) ?? championships[0];
  const [view, champions, riders] = await Promise.all([
    selected ? getChampionship(ctx, selected.id) : null,
    listChampions(ctx),
    isCoach ? getRiders(ctx) : Promise.resolve([]),
  ]);
  const season = seasonStartYear(today);
  const choices = riders.map((r) => {
    const category = riderClass(r, season).category;
    const cls: ClubClass =
      category === "U17" || category === "U19" || category === "U23" ? category : "open";
    return { id: r.id, name: r.name, class: cls };
  });

  return (
    <div className="flex min-w-0 max-w-4xl flex-col gap-7">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {championships.length > 1 && (
        <nav aria-label={t("seasons")} className="flex flex-wrap gap-2">
          {championships.map((c) => (
            <Link
              key={c.id}
              href={`/club?c=${c.id}`}
              aria-current={c.id === selected?.id ? "page" : undefined}
              className={cn(
                "rounded-md border px-3 py-1.5 text-2sm",
                c.id === selected?.id ? "border-primary font-semibold" : "border-border",
              )}
            >
              {c.title}
            </Link>
          ))}
        </nav>
      )}

      {isCoach && <NewChampionship year={year} />}

      {view ? (
        <>
          <section aria-labelledby="club-standings" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="club-standings" className="text-lg font-semibold">
                {view.title}
              </h2>
              {isCoach && <CrownChampions championshipId={view.id} />}
            </div>
            <StandingsBoard standings={view.standings} improvement={view.improvement} />
          </section>
          <section aria-labelledby="club-rounds" className="flex flex-col gap-3">
            <h2 id="club-rounds" className="text-lg font-semibold">
              {t("rounds")}
            </h2>
            {isCoach && <NewRound championshipId={view.id} today={today} />}
            {view.rounds.length === 0 ? (
              <p className="text-meta text-2sm">{t(isCoach ? "noRoundsCoach" : "noRounds")}</p>
            ) : (
              view.rounds.map((round) => (
                <RoundCard key={round.id} round={round} riders={choices} isCoach={isCoach} />
              ))
            )}
          </section>
        </>
      ) : (
        <EmptyState title={t("none.title")} hint={t(isCoach ? "none.coach" : "none.body")} />
      )}

      <section aria-labelledby="club-honour" className="flex flex-col gap-3">
        <h2 id="club-honour" className="text-lg font-semibold">
          {t("honour.title")}
        </h2>
        <HonourRoll
          isCoach={isCoach}
          year={year}
          champions={champions.map((c) => ({
            id: c.id,
            year: c.year,
            class: c.class,
            title: c.title,
            name: c.name,
            note: c.note,
          }))}
        />
      </section>
    </div>
  );
}
