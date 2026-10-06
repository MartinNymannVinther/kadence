"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CreatedLine } from "@/modules/team/bulk-invite";
import { recipientsFromCreated } from "./invitation-recipients";
import { RecipientList } from "./recipient-list";

/**
 * After "Inviter hele holdet": every person with a link and "Del", and
 * the ones without an address, who were created without one. The same
 * links stay under "Links, der venter" on the page until they are used.
 */
export function BulkResult({
  lines,
  team,
  onDone,
}: {
  lines: CreatedLine[];
  team: string;
  onDone: () => void;
}) {
  const t = useTranslations("riders.bulk");
  const who = useTranslations("riders.recipients");
  const locale = useLocale();
  const recipients = recipientsFromCreated(lines);
  const withLink = recipients.filter((r) => r.link);
  const without = recipients.filter((r) => !r.link);
  const list = (names: string[]) =>
    new Intl.ListFormat(locale === "en" ? "en-GB" : "da-DK", { type: "conjunction" }).format(names);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{t("doneTitle")}</DialogTitle>
        <DialogDescription>{t("doneBody")}</DialogDescription>
      </DialogHeader>
      {withLink.length > 0 && <RecipientList recipients={withLink} team={team} />}
      {without.length > 0 && (
        <div className="bg-muted/60 flex flex-col gap-1.5 rounded-lg p-3">
          <p className="text-sm font-medium">{t("noLinkTitle")}</p>
          <p className="text-meta text-xs leading-relaxed">{t("noLinkBody")}</p>
          <ul className="flex flex-col gap-0.5 text-sm">
            {without.map((r) => (
              <li key={r.key}>
                {r.name}{" "}
                <span className="text-meta text-xs">
                  (
                  {r.kind === "rider"
                    ? who("rider")
                    : who("parentOf", { children: list(r.children) })}
                  )
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <DialogFooter>
        <Button className="max-sm:h-11" onClick={onDone}>
          {t("done")}
        </Button>
      </DialogFooter>
    </div>
  );
}
