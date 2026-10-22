import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { FitUpload } from "@/components/activities/fit-upload";
import { OwnRidesList } from "@/components/activities/own-rides-list";
import { GoalsCard, type GoalView } from "@/components/activities/goals-card";
import { RecordsCard } from "@/components/activities/records-card";
import { withQuery } from "@/components/calendar/href";
import { SectionNav } from "@/components/common/section-nav";
import { LoadPanel } from "@/components/load/load-panel";
import { SendToDeviceButton } from "@/components/session/send-to-device-button";
import { SessionSheet } from "@/components/session/session-sheet";
import { SessionView } from "@/components/session/session-view";
import { WeekGlance } from "@/components/today/week-glance";
import { meElsewhere } from "@/components/today/where";
import { PageHeader } from "@/components/ui/page-header";
import { KnownPainsCard } from "@/components/wellbeing/known-pains-card";
import { ZoneStrip } from "@/components/wellbeing/zone-strip";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { modelConfigured } from "@/modules/ai/service";
import { Link, redirect } from "@/i18n/navigation";
import { whoAmI } from "@/modules/team/access";
import { getTeamSettings } from "@/modules/team/settings";
import { workspaceKind } from "@/modules/team/workspace-kind";
import { meData } from "./me-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("me");
  return { title: t("title") };
}

const hrefFor = (sessionId: string) => withQuery("/me", { session: sessionId });

function Section({
  id,
  title,
  body,
  children,
}: {
  id: string;
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-6 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          {title}
        </h2>
        {body && <p className="text-meta text-2sm leading-relaxed">{body}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Mig: the rider's own page (docs/adr/0063). Everything about the rider
 * that is not today — the week, the latest rides (docs/backlog.md P2-02),
 * the form with the words that explain it,
 * the last two weeks of check-ins and the known pains (ADR 0097), goals,
 * records, and the upload and the
 * way to a bike computer. Today keeps today. A coach or a parent who opens
 * it goes back to their own front page.
 */
export default async function MePage({
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
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const elsewhere = meElsewhere(me);
  if (elsewhere || !me?.rider) {
    redirect({ href: elsewhere ?? "/today", locale });
    return null;
  }
  const t = await getTranslations("me");
  const common = await getTranslations("common");
  const search = await searchParams;
  const openSession = typeof search.session === "string" ? search.session : undefined;
  const today = todayInCopenhagen();
  const riderId = me.rider.id;
  const data = await meData(ctx, riderId, today);
  const personal = me.isCoach && (await workspaceKind(ctx.orgId, ctx.userId)) === "personal";
  // The AI's reading of the form: with a model, where the AI may read the rider's data (ADR 0108).
  const story =
    data.insight && (await modelConfigured(ctx)) && (await getTeamSettings(ctx)).aiOnRiderData
      ? { riderId, own: true }
      : null;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader title={t("title")} subtitle={data.name || undefined} />
      <SectionNav
        label={common("sectionNav")}
        items={[
          { id: "week", label: t("nav.week") },
          { id: "rides", label: t("nav.rides") },
          ...(data.insight ? [{ id: "form", label: t("nav.form") }] : []),
          { id: "checkins", label: t("nav.checkins") },
          { id: "goals", label: t("nav.goals") },
          { id: "records", label: t("nav.records") },
          { id: "upload", label: t("nav.upload") },
        ]}
      />

      <Section id="week" title={t("week")}>
        <WeekGlance
          days={data.days}
          today={today}
          sessions={data.sessions}
          events={data.events}
          hrefFor={hrefFor}
        />
      </Section>

      <Section id="rides" title={t("rides.title")} body={t("rides.body")}>
        <OwnRidesList first={data.rides} today={today} />
      </Section>

      {data.insight && (
        <Section id="form" title={t("form")} body={t("formBody")}>
          <LoadPanel insight={data.insight} story={story} />
        </Section>
      )}

      <Section id="checkins" title={t("checkins")} body={t("checkinsBody")}>
        <ZoneStrip days={data.zones} today={today} />
        <KnownPainsCard riderId={riderId} pains={data.knownPains} own />
      </Section>

      <Section id="goals" title={t("goals")}>
        <GoalsCard
          riderId={riderId}
          goals={data.goals.map((g) => ({ ...g, kind: g.kind as GoalView["kind"] }))}
          today={today}
          dcuProposal={data.dcuProposal}
          canWrite
        />
      </Section>

      <Section id="records" title={t("records")}>
        <RecordsCard byPeriod={data.records.byPeriod} names={data.records.names} />
      </Section>

      <Section id="upload" title={t("upload")} body={t("uploadBody")}>
        <FitUpload riderId={riderId} compact />
        <SendToDeviceButton sessions={data.toDevice} week />
      </Section>

      {personal && (
        // In one's own workspace the person is also the coach (ADR 0080):
        // the coach's page about them holds the parents and the account.
        <p className="text-meta text-2sm leading-relaxed">
          {t("personal.body")}{" "}
          <Link href={`/riders/${riderId}`} className="focus-ring text-primary hover:underline">
            {t("personal.link")}
          </Link>
        </p>
      )}

      {openSession && (
        <SessionSheet key={openSession} closeHref="/me" title={t("sessionPanel")}>
          <SessionView ctx={ctx} me={me} sessionId={openSession} closeHref="/me" />
        </SessionSheet>
      )}
    </div>
  );
}
