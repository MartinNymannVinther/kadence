"use client";

import { Download, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { deleteActivityAction } from "@/modules/devices/actions";

/**
 * The ride's file back out, as it came in (dogma 3), and the way to delete
 * the ride and its file. A session it fulfilled opens again.
 */
export function ActivityActions({
  activityId,
  hasFile,
  canWrite,
  afterDeleteHref,
}: {
  activityId: string;
  hasFile: boolean;
  canWrite: boolean;
  afterDeleteHref: string;
}) {
  const t = useTranslations("activities.actions");
  const router = useRouter();
  const { run } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      {hasFile && (
        <a
          href={`/api/activities/${activityId}/file`}
          download
          className={cn(buttonVariants({ variant: "outline" }), "max-sm:h-11")}
        >
          <Download data-icon="inline-start" />
          {t("download")}
        </a>
      )}
      {canWrite && (
        <ConfirmButton
          title={t("deleteTitle")}
          body={t("deleteBody")}
          confirmLabel={t("delete")}
          size="default"
          onConfirm={async () => {
            const done = await run(() => deleteActivityAction({ activityId }), {
              refresh: false,
            });
            if (done !== null) router.replace(afterDeleteHref);
          }}
        >
          <Trash2 data-icon="inline-start" />
          {t("delete")}
        </ConfirmButton>
      )}
    </div>
  );
}
