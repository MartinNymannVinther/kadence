import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/core/auth/session";
import { redirect } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("today");
  return { title: t("title") };
}

/**
 * The front page for everyone on the team. Wave 0 has nothing to show
 * yet; wave 1 gives the rider today's session, the coach the team and the
 * parent the week.
 */
export default async function TodayPage() {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("today");
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={t("title")} />
      <EmptyState title={t("emptyTitle")} hint={t("emptyBody")} />
    </div>
  );
}
