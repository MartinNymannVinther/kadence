import type { Metadata } from "next";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { calendarHref } from "@/components/calendar/href";
import { accountState } from "@/components/team/account-badge";
import { ArchiveRider } from "@/components/team/archive-rider";
import { classText } from "@/components/team/class-text";
import { GuardianList } from "@/components/team/guardian-list";
import { guardianState } from "@/components/team/guardian-state";
import { RiderAccount } from "@/components/team/rider-account";
import { RiderProfileForm } from "@/components/team/rider-profile-form";
import { ThresholdsForm } from "@/components/team/thresholds-form";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { listPendingInvitations } from "@/core/team/service";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { whoAmI } from "@/modules/team/access";
import { listGuardians } from "@/modules/team/guardians";
import { getRider } from "@/modules/team/riders";

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
 * One rider, for a coach: the profile, the thresholds the zones are
 * worked out from, the rider's own account and invitation, the parents
 * and where their links stand, and the way to archive the rider.
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
  const [guardians, invitations] = await Promise.all([
    listGuardians(ctx, rider.id),
    listPendingInvitations(ctx.orgId),
  ]);
  const pending = new Set(invitations.map((i) => i.id));
  const invitationFor = (invitationId: string | null) => {
    const found = invitations.find((i) => i.id === invitationId);
    return found ? { url: found.url, email: found.email } : null;
  };
  const today = todayInCopenhagen();
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
          <Link
            href={calendarHref({ rider: rider.id })}
            className={cn(buttonVariants({ variant: "outline" }), "max-sm:h-11")}
          >
            <CalendarDays data-icon="inline-start" />
            {t("calendar")}
          </Link>
        }
      />
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
      </div>
    </div>
  );
}
