import type { Metadata } from "next";
import { CalendarDays, CalendarRange, ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { FitUpload } from "@/components/activities/fit-upload";
import { GoalsCard, type GoalView } from "@/components/activities/goals-card";
import { RecordsCard } from "@/components/activities/records-card";
import { LoadPanel } from "@/components/load/load-panel";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { calendarHref } from "@/components/calendar/href";
import { accountState } from "@/components/team/account-badge";
import { ArchiveRider } from "@/components/team/archive-rider";
import { classText } from "@/components/team/class-text";
import { EraseRider } from "@/components/team/erase-rider";
import { GuardianList } from "@/components/team/guardian-list";
import { guardianState } from "@/components/team/guardian-state";
import { RiderAccount } from "@/components/team/rider-account";
import { RiderInsightCard } from "@/components/team/rider-insight-card";
import { RiderProfileForm } from "@/components/team/rider-profile-form";
import { ThresholdsForm } from "@/components/team/thresholds-form";
import { MeasurementsCard, type MeasurementRow } from "@/components/wellbeing/measurements-card";
import { zoneDays } from "@/components/wellbeing/zone-days";
import { getOrgContext } from "@/core/auth/session";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { listPendingInvitations } from "@/core/team/service";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getInsights } from "@/modules/insight/service";
import { whoAmI } from "@/modules/team/access";
import { listGuardians } from "@/modules/team/guardians";
import { getRider } from "@/modules/team/riders";
import { getTeamSettings } from "@/modules/team/settings";
import { dcuProposalFor, listGoals } from "@/modules/training/goals";
import { getRiderRecords } from "@/modules/training/records";
import { listCheckins } from "@/modules/wellbeing/checkins";
import { isYouth, listMeasurements } from "@/modules/wellbeing/measurements";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const ctx = await getOrgContext();
  const t = await getTranslations("riders");
  const rider = ctx ? await getRider(ctx, (await params).id) : null;
  return { title: rider?.name ?? t("title") };
}

/**
 * One rider, for a coach: the week's warnings and the last two weeks of
 * check-ins, the load chart and the weeks' hours against DCU, height
 * through the growth spurt, a ride uploaded on the rider's behalf; then
 * the profile, the thresholds the zones are worked out from, the rider's
 * own account and invitation, the parents and where their links stand,
 * the way to archive the rider — and, apart, to erase them.
 */
export default async function RiderPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("riders");
  const classes = await getTranslations("riders.class");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  if (!me?.isCoach) {
    return <EmptyState title={t("coachOnlyTitle")} hint={t("coachOnlyBody")} />;
  }
  const { id } = await params;
  const rider = await getRider(ctx, id);
  if (!rider) notFound();
  const today = todayInCopenhagen();
  const [guardians, invitations, insights, checkins, measurements, settings, riderRecords, goals] =
    await Promise.all([
      listGuardians(ctx, rider.id),
      listPendingInvitations(ctx.orgId),
      getInsights(ctx, { riderIds: [rider.id], today }),
      listCheckins(ctx, { from: addDaysIso(today, -13), to: today, riderIds: [rider.id] }),
      listMeasurements(ctx, rider.id),
      getTeamSettings(ctx),
      getRiderRecords(ctx, rider.id, { today }),
      listGoals(ctx, rider.id, today),
    ]);
  const insight = insights[0] ?? null;
  const shownMeasurements: MeasurementRow[] = measurements.flatMap((m) =>
    m.kind === "height_cm" || m.kind === "weight_kg"
      ? [{ id: m.id, measuredOn: m.measuredOn, kind: m.kind, value: Number(m.value) }]
      : [],
  );
  const pending = new Set(invitations.map((i) => i.id));
  const invitationFor = (invitationId: string | null) => {
    const found = invitations.find((i) => i.id === invitationId);
    return found ? { url: found.url, email: found.email } : null;
  };
  const account = accountState(rider, pending);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Link
        href="/riders"
        className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t("back")}
      </Link>
      <PageHeader
        size="detail"
        title={rider.name}
        subtitle={t("list.meta", {
          year: rider.birthYear,
          class: classText(rider, today, classes),
        })}
        actions={
          <>
            <Link
              href={calendarHref({ rider: rider.id })}
              className={cn(buttonVariants({ variant: "outline" }), "max-sm:h-11")}
            >
              <CalendarDays data-icon="inline-start" />
              {t("calendar")}
            </Link>
            <Link
              href={`/season?rider=${rider.id}`}
              className={cn(buttonVariants({ variant: "outline" }), "max-sm:h-11")}
            >
              <CalendarRange data-icon="inline-start" />
              {t("season")}
            </Link>
          </>
        }
      />
      <div className="grid max-w-3xl gap-8 [&>*]:min-w-0">
        <section aria-labelledby="rider-week" className="flex flex-col gap-3">
          <h2 id="rider-week" className="text-lg font-semibold">
            {t("sections.week")}
          </h2>
          <RiderInsightCard insight={insight} days={zoneDays(checkins, today)} today={today} />
        </section>
        {insight && (
          <section aria-labelledby="rider-form" className="flex flex-col gap-3">
            <h2 id="rider-form" className="text-lg font-semibold">
              {t("sections.form")}
            </h2>
            <LoadPanel insight={insight} firstName={insight.name.split(" ")[0] ?? null} />
          </section>
        )}
        <section aria-labelledby="rider-goals" className="flex flex-col gap-3">
          <h2 id="rider-goals" className="text-lg font-semibold">
            {t("sections.goals")}
          </h2>
          <GoalsCard
            riderId={rider.id}
            goals={goals.map((g) => ({ ...g, kind: g.kind as GoalView["kind"] }))}
            today={today}
            dcuProposal={dcuProposalFor(rider, goals, today)}
            canWrite
          />
        </section>
        <section aria-labelledby="rider-records" className="flex flex-col gap-3">
          <h2 id="rider-records" className="text-lg font-semibold">
            {t("sections.records")}
          </h2>
          <RecordsCard byPeriod={riderRecords.byPeriod} />
        </section>
        <MeasurementsCard
          riderId={rider.id}
          today={today}
          rows={shownMeasurements}
          weightAllowed={settings.allowYouthWeight || !isYouth(rider.birthYear, today)}
        />
        <section aria-labelledby="rider-upload" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="rider-upload" className="text-lg font-semibold">
              {t("sections.upload")}
            </h2>
            <p className="text-meta text-2sm">{t("sections.uploadBody")}</p>
          </div>
          <FitUpload riderId={rider.id} compact />
        </section>
      </div>
      <h2 className="mt-3 text-lg font-semibold">{t("sections.profile")}</h2>
      <div className="grid max-w-3xl gap-5">
        <RiderProfileForm
          rider={{
            id: rider.id,
            name: rider.name,
            birthYear: rider.birthYear,
            sex: rider.sex === "female" || rider.sex === "male" ? rider.sex : null,
            categoryOverride: rider.categoryOverride,
          }}
          classByYear={classText({ ...rider, categoryOverride: null }, today, classes)}
        />
        <ThresholdsForm
          riderId={rider.id}
          today={today}
          initial={{
            ftpWatts: rider.ftpWatts,
            thresholdHr: rider.thresholdHr,
            maxHr: rider.maxHr,
            restingHr: rider.restingHr,
            thresholdsOn: rider.thresholdsOn,
          }}
        />
        <RiderAccount
          riderId={rider.id}
          state={account}
          pending={account === "invited" ? invitationFor(rider.invitationId) : null}
        />
        <GuardianList
          riderId={rider.id}
          riderName={rider.name}
          guardians={guardians.map((g) => {
            const state = guardianState(g, rider.birthYear, pending);
            return {
              id: g.id,
              name: g.name,
              relation: g.relation,
              state,
              invitation: state === "invited" ? invitationFor(g.invitationId) : null,
            };
          })}
        />
        <div className="border-border flex flex-col items-start gap-2 border-t pt-5">
          <p className="text-meta text-2sm">
            {rider.archived ? t("archivedNote") : t("archiveNote")}
          </p>
          <ArchiveRider riderId={rider.id} name={rider.name} archived={rider.archived} />
        </div>
        <EraseRider riderId={rider.id} name={rider.name} />
      </div>
    </div>
  );
}
