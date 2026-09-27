import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { guardianState } from "@/components/team/guardian-state";
import { MyChildren } from "@/components/team/my-children";
import { MyGuardians } from "@/components/team/my-guardians";
import { SharingForm } from "@/components/team/sharing-form";
import { ThresholdsForm } from "@/components/team/thresholds-form";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { whoAmI } from "@/modules/team/access";
import { listGuardians } from "@/modules/team/guardians";
import { getRider } from "@/modules/team/riders";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.me");
  return { title: t("title") };
}

/**
 * The person's own corner. A rider decides what their parents see,
 * confirms each parent and keeps their thresholds; a parent sees their
 * links and may end one; everybody finds their security settings here.
 */
export default async function MePage() {
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
  const nothing = !rider && (me?.children.length ?? 0) === 0;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-meta text-2sm leading-relaxed">{t("subtitle")}</p>
      </div>

      {rider && (
        <>
          <SharingForm
            initial={{ shareTraining: rider.shareTraining, shareWellbeing: rider.shareWellbeing }}
          />
          <MyGuardians
            guardians={guardians.map((g) => ({
              id: g.id,
              name: g.name,
              relation: g.relation,
              state: guardianState(g, rider.birthYear, new Set()),
            }))}
          />
          <ThresholdsForm
            riderId={rider.id}
            today={todayInCopenhagen()}
            initial={{
              ftpWatts: rider.ftpWatts,
              thresholdHr: rider.thresholdHr,
              maxHr: rider.maxHr,
              restingHr: rider.restingHr,
              thresholdsOn: rider.thresholdsOn,
            }}
          />
        </>
      )}

      {me && me.children.length > 0 && <MyChildren links={me.children} />}

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
    </div>
  );
}
