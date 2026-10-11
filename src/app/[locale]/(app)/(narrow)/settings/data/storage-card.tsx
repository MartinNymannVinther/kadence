import { HardDrive } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrgContext } from "@/core/db/tenant";
import { fileStorage } from "@/core/files/storage";
import { formatBytes } from "@/modules/storage/format";
import { fileQuota } from "@/modules/storage/quota";

/**
 * How much of the workspace's room for files is used (docs/adr/0087),
 * for a coach and for the owner of a personal workspace: a bar, the two
 * numbers, and where the files are kept. When the room is used up, new
 * files are refused with the same sentence every door says.
 */
export async function StorageCard({ ctx }: { ctx: OrgContext }) {
  const t = await getTranslations("app.dataExport.storage");
  const locale = await getLocale();
  const quota = await fileQuota(ctx);
  const used = formatBytes(quota.usedBytes, locale);
  const share =
    quota.quotaBytes === null ? 0 : Math.min(1, quota.usedBytes / Math.max(1, quota.quotaBytes));
  const full = quota.quotaBytes !== null && quota.usedBytes >= quota.quotaBytes;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive aria-hidden className="size-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {quota.quotaBytes !== null && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={quota.quotaBytes}
            aria-valuenow={Math.min(quota.usedBytes, quota.quotaBytes)}
            aria-label={t("title")}
            className="bg-muted h-2 w-full overflow-hidden rounded-full"
          >
            <div
              className={full ? "bg-destructive h-full" : "bg-primary h-full"}
              style={{ width: `${Math.round(share * 1000) / 10}%` }}
            />
          </div>
        )}
        <p className="text-2sm tabular-nums">
          {quota.quotaBytes === null
            ? t("usedNoQuota", { used })
            : t("usedOf", { used, quota: formatBytes(quota.quotaBytes, locale) })}
        </p>
        {full && (
          <p role="status" className="text-2sm">
            {t("full")}
          </p>
        )}
        <p className="text-meta text-2sm leading-relaxed">
          {t(fileStorage().mode === "s3" ? "inStore" : "inDatabase")}
        </p>
      </CardContent>
    </Card>
  );
}
