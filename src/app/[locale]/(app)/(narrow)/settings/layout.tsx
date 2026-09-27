import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { ownerAccessSummary } from "@/core/access/summary";
import { getOrgContext } from "@/core/auth/session";
import { whoAmI } from "@/modules/team/access";
import { SettingsNav } from "./settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("settings");
  const access = await ownerAccessSummary();
  const ctx = await getOrgContext();
  const me = ctx ? await whoAmI(ctx.orgId, ctx.userId) : null;

  return (
    <div className="flex flex-col gap-[22px]">
      <PageHeader size="section" title={t("title")} subtitle={t("subtitle")} />
      <div className="flex flex-col gap-6 @2xl:flex-row @2xl:gap-8">
        <SettingsNav access={access} isCoach={Boolean(me?.isCoach)} isRider={Boolean(me?.rider)} />
        <div className="@container min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
