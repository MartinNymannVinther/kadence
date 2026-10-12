import { TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * A quiet line on a recent ride whose best 20 minutes beat the saved FTP
 * by more than 5 % (`ftpLooksRaised`, docs/adr/0094): it points to the
 * proposal on the thresholds form and changes nothing itself.
 */
export async function FtpRaisedHint({ riderId, own }: { riderId: string; own: boolean }) {
  const t = await getTranslations("activities.ftpRaised");
  const href = own
    ? "/settings/me?forslag=1#thresholds"
    : `/riders/${riderId}?forslag=1#thresholds`;
  return (
    <p className="text-meta flex flex-wrap items-center gap-x-1.5 text-2sm">
      <TrendingUp aria-hidden className="text-primary size-4" />
      {own ? t("own") : t("coach")}
      <Link href={href} className="focus-ring text-primary font-medium hover:underline">
        {t("link")}
      </Link>
    </p>
  );
}
