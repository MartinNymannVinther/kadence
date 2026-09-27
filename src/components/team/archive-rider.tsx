"use client";

import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { archiveRiderAction } from "@/modules/team/actions";

/**
 * A rider who has left the team keeps their history; archiving hides them
 * from the lists and the calendar, and can be undone.
 */
export function ArchiveRider({
  riderId,
  name,
  archived,
}: {
  riderId: string;
  name: string;
  archived: boolean;
}) {
  const t = useTranslations("riders.archive");
  const { run } = useRun();
  return (
    <ConfirmButton
      title={archived ? t("restoreTitle", { name }) : t("title", { name })}
      body={archived ? t("restoreBody") : t("body")}
      confirmLabel={archived ? t("restore") : t("confirm")}
      variant={archived ? "outline" : "destructive"}
      onConfirm={() => run(() => archiveRiderAction({ riderId, archived: !archived }))}
    >
      {archived ? t("restore") : t("button")}
    </ConfirmButton>
  );
}
