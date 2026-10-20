import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { ownerAccessSummary } from "@/core/access/summary";
import { getOrgContext } from "@/core/auth/session";
import { trialLine } from "@/modules/billing/banner";
import { formatLongDay } from "@/modules/billing/dates";
import { billingOn, workspacePlan } from "@/modules/billing/plan";
import { whoAmI } from "@/modules/team/access";
import { workspaceKind } from "@/modules/team/workspace-kind";
import { settingsGroups, settingsSubtitle } from "./settings-items";
import { SettingsNav } from "./settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("settings");
  const access = await ownerAccessSummary();
  const ctx = await getOrgContext();
  const me = ctx ? await whoAmI(ctx.orgId, ctx.userId) : null;
  const personal = ctx ? (await workspaceKind(ctx.orgId, ctx.userId)) === "personal" : false;
  const billing = billingOn();
  const who = { isCoach: Boolean(me?.isCoach), isRider: Boolean(me?.rider), personal, billing };
  // A trial's days, quietly, for the people who decide (docs/adr/0090).
  const trial = ctx && billing && who.isCoach ? trialLine(await workspacePlan(ctx)) : null;
  const locale = await getLocale();

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-1.5">
        <PageHeader size="section" title={t("title")} subtitle={t(settingsSubtitle(who))} />
        {trial && (
          <p className="text-meta text-2sm">
            {t("trialLine", {
              days: trial.daysLeft,
              date: formatLongDay(trial.lastDay, locale),
            })}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-6 @2xl:flex-row @2xl:gap-8">
        <SettingsNav groups={settingsGroups({ owner: access !== null, ...who })} access={access} />
        <div className="@container min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
