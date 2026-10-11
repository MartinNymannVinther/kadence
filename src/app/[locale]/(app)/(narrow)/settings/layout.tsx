import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { ownerAccessSummary } from "@/core/access/summary";
import { getOrgContext } from "@/core/auth/session";
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
  const who = { isCoach: Boolean(me?.isCoach), isRider: Boolean(me?.rider), personal };

  return (
    <div className="flex flex-col gap-[22px]">
      <PageHeader size="section" title={t("title")} subtitle={t(settingsSubtitle(who))} />
      <div className="flex flex-col gap-6 @2xl:flex-row @2xl:gap-8">
        <SettingsNav groups={settingsGroups({ owner: access !== null, ...who })} access={access} />
        <div className="@container min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
