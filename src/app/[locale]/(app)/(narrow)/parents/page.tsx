import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { withQuery } from "@/components/calendar/href";
import { ChildCard, type ChildView } from "@/components/parents/child-card";
import { ParentBasics } from "@/components/parents/parent-basics";
import { ParentGuide } from "@/components/parents/parent-guide";
import { SessionSheet } from "@/components/session/session-sheet";
import { SessionView } from "@/components/session/session-view";
import { dayLong } from "@/components/training/day-label";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { redirect } from "@/i18n/navigation";
import { whoAmI } from "@/modules/team/access";
import { weekDates, weekFrom } from "@/modules/training/week";
import { GuidesCard } from "@/components/guides/guides-card";
import { childView } from "./child-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parents");
  return { title: t("title") };
}

const hrefFor = (sessionId: string) => withQuery("/parents", { session: sessionId });

/**
 * The parents' page, and a parent's whole Kadence: their Today lands here
 * (docs/adr/0063). Child first — with one child the page is titled with
 * the child's name — each confirmed child's week with when and where each
 * session starts, what is coming the next 30 days, how the child is doing
 * if the child shares it, the conversations about the training and the
 * form in plain words; the one pen is for the family's own days in the
 * child's calendar (docs/adr/0069). Below, for everyone, "Forældreguiden"
 * in Kadence's own words with links to Team Danmark's originals, and
 * three plain sections: sleep, school beside sport, and what a parent can
 * see here and why.
 */
export default async function ParentsPage({
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
  const t = await getTranslations("parents");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const search = await searchParams;
  const openSession = typeof search.session === "string" ? search.session : undefined;
  const today = todayInCopenhagen();
  const monday = weekFrom(undefined, today);
  const days = weekDates(monday);
  const week = { monday, sunday: days[6] ?? today, today };
  const confirmed = (me?.children ?? []).filter((c) => c.confirmed);
  const waiting = (me?.children ?? []).some((c) => !c.confirmed);
  // Confirmed, but the rider does not share training: the database hides the row (ADR 0011).
  const hidden = (me?.children ?? []).some((c) => c.confirmed && c.name === null);
  const children = (
    await Promise.all(confirmed.map((c) => childView(ctx, c.riderId, week)))
  ).filter((c): c is ChildView => c !== null);

  const only = children.length === 1 ? children[0] : undefined;

  return (
    <div className="flex min-w-0 max-w-4xl flex-col gap-10">
      <PageHeader
        title={only ? only.name : t("title")}
        subtitle={
          only ? (
            <span className="first-letter:uppercase">{dayLong(today, locale)}</span>
          ) : (
            t("subtitle")
          )
        }
      />

      {children.map((child) => (
        <ChildCard
          key={child.riderId}
          child={child}
          days={days}
          today={today}
          hrefFor={hrefFor}
          single={Boolean(only)}
        />
      ))}
      {waiting && <EmptyState title={t("waitingTitle")} hint={t("waitingBody")} />}
      {hidden && <EmptyState title={t("hiddenTitle")} hint={t("hiddenBody")} />}

      <GuidesCard body="fromParents" />

      <section aria-labelledby="parent-guide" className="flex flex-col gap-4">
        <ParentGuide />
      </section>

      <section aria-labelledby="parent-basics" className="flex flex-col gap-4">
        <h2 id="parent-basics" className="text-lg font-semibold">
          {t("basicsTitle")}
        </h2>
        <ParentBasics />
      </section>

      {openSession && me && (
        <SessionSheet key={openSession} closeHref="/parents" title={t("sessionPanel")}>
          <SessionView ctx={ctx} me={me} sessionId={openSession} closeHref="/parents" />
        </SessionSheet>
      )}
    </div>
  );
}
