"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatStamp } from "@/core/dates";
import type { Recipient } from "./invitation-recipients";
import { ShareInvitationButton } from "./share-invitation-button";

/**
 * The people with a link, one row each: who they are to the team, the
 * address the link is bound to, until when it works, and "Del".
 */
export function RecipientList({ recipients, team }: { recipients: Recipient[]; team: string }) {
  const t = useTranslations("riders.recipients");
  const locale = useLocale();
  const children = (r: Recipient) =>
    new Intl.ListFormat(locale === "en" ? "en-GB" : "da-DK", { type: "conjunction" }).format(
      r.children,
    );

  return (
    <ul className="divide-hairline flex flex-col divide-y">
      {recipients.map((r) =>
        r.link ? (
          <li
            key={r.key}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-semibold">{r.name}</span>
              <span className="text-meta text-xs break-all">
                {r.kind === "rider" ? t("rider") : t("parentOf", { children: children(r) })}
                {" · "}
                {r.link.email}
              </span>
              <span className="text-meta text-xs">
                {t("until", { until: formatStamp(new Date(r.link.expiresAt), locale) })}
              </span>
            </span>
            <ShareInvitationButton recipient={r} link={r.link} team={team} />
          </li>
        ) : null,
      )}
    </ul>
  );
}
