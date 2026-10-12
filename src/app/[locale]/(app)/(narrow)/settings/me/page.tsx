import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { SIDEBAR_TONE_COOKIE, sidebarToneFrom } from "@/components/common/sidebar-tone";
import { AppearanceCard } from "@/components/settings/appearance-card";
import { buttonVariants } from "@/components/ui/button";
import { guardianState } from "@/components/team/guardian-state";
import { LeaveTeamButton } from "@/components/team/leave-team-button";
import { MyChildren } from "@/components/team/my-children";
import { MyGuardians } from "@/components/team/my-guardians";
import { RemindersCard } from "@/components/push/reminders-card";
import { WeekMailCard } from "@/components/push/week-mail-card";
import { OwnRacesCard } from "@/components/team/own-races-card";
import { SharingForm } from "@/components/team/sharing-form";
import { SeniorProfile } from "@/components/team/senior-profile";
import { RiderThresholds } from "@/components/team/rider-thresholds";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { env } from "@/core/env";
import { remindersOn } from "@/core/features";
import { mailConfigured } from "@/core/mail/mailer";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { weekMailOffered, weekMailState } from "@/modules/push/mail-choice";
import { kindsForMe } from "@/modules/push/subscriptions";
import { readsRacesFor } from "@/modules/results/switch";
import { dcuProfileUrl, formatUciId } from "@/modules/results/uci-id";
import { whoAmI } from "@/modules/team/access";
import { listGuardians } from "@/modules/team/guardians";
import { getRider } from "@/modules/team/riders";
import { leavesFromMe } from "../settings-items";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.me");
  return { title: t("title") };
}

/**
 * The person's own corner. A rider decides what their parents see,
 * confirms each parent, keeps their thresholds, chooses their training
 * profile when they ride as a senior (docs/adr/0091) and may give their UCI ID;
 * a parent sees their links and may end one; everybody finds their
 * security settings here, and whoever is not a coach the way off the team
 * at the bottom (P1-07). "Udseende" — light or dark, and the rail in moss
 * or on paper — is this device's choice (docs/adr/0077).
 */
export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ forslag?: string }>;
}) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("settings.me");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const rider = me?.rider ? await getRider(ctx, me.rider.id) : null;
  const guardians = rider ? await listGuardians(ctx, rider.id) : [];
  // What parents see, and who they are, is only a question once a parent
  // is linked to the rider (confirmed or waiting): a rider alone, an adult
  // or a youth whose coach has added no parent, is not asked about parents
  // they do not have. The sharing choice keeps its value meanwhile.
  const hasParents = guardians.length > 0;
  const nothing = !rider && (me?.children.length ?? 0) === 0;
  const tone = sidebarToneFrom((await cookies()).get(SIDEBAR_TONE_COOKIE)?.value);
  // The parents' week by mail too, where the installation sends mail (docs/adr/0086).
  const weekMail = mailConfigured() && weekMailOffered(me) ? await weekMailState(ctx) : null;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-meta text-2sm leading-relaxed">
          {t(rider && !hasParents ? "subtitleNoParents" : "subtitle")}
        </p>
      </div>

      <AppearanceCard tone={tone} />

      {rider && (
        <>
          {hasParents && (
            <>
              <SharingForm
                initial={{
                  shareTraining: rider.shareTraining,
                  shareWellbeing: rider.shareWellbeing,
                }}
              />
              <MyGuardians
                guardians={guardians.map((g) => ({
                  id: g.id,
                  name: g.name,
                  relation: g.relation,
                  state: guardianState(g, rider.birthYear, new Set()),
                  account: g.accountEmail
                    ? `${g.accountName ?? ""} · ${g.accountEmail}`.trim()
                    : null,
                }))}
              />
            </>
          )}
          <RiderThresholds
            ctx={ctx}
            rider={rider}
            today={todayInCopenhagen()}
            own
            ask={(await searchParams).forslag}
          />
          <SeniorProfile rider={rider} today={todayInCopenhagen()} />
          <OwnRacesCard
            riderId={rider.id}
            printed={rider.uciId ? formatUciId(rider.uciId) : null}
            profileUrl={rider.uciId ? dcuProfileUrl(rider.uciId) : null}
            reads={readsRacesFor(env.DCU_RESULTS, rider.uciId)}
          />
        </>
      )}

      {me && me.children.length > 0 && <MyChildren links={me.children} />}

      {me && remindersOn() && env.PUSH_PUBLIC_KEY && kindsForMe(me).length > 0 && (
        <RemindersCard
          publicKey={env.PUSH_PUBLIC_KEY}
          offered={kindsForMe(me)}
          coach={me.isCoach}
        />
      )}

      {weekMail && <WeekMailCard initial={weekMail.on} email={weekMail.email} />}

      {nothing && (
        <p className="border-border bg-card text-meta rounded-xl border p-4 text-2sm leading-relaxed">
          {me?.isCoach ? t("coachNote") : t("memberNote")}
        </p>
      )}

      <Link
        href="/settings/security"
        className={cn(buttonVariants({ variant: "outline" }), "self-start max-sm:h-11")}
      >
        <ShieldCheck data-icon="inline-start" />
        {t("security")}
      </Link>

      {leavesFromMe(me) && (
        <div className="border-hairline border-t pt-5">
          <LeaveTeamButton place="me" history={Boolean(rider)} />
        </div>
      )}
    </div>
  );
}
