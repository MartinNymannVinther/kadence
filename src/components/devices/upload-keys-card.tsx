"use client";

import { useRef } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Link } from "@/i18n/navigation";
import { removeUploadKeyAction } from "@/modules/devices/actions";
import { keyErrorKey } from "./device-words";
import { NewUploadKey } from "./new-upload-key";

export type UploadKey = {
  id: string;
  name: string;
  hint: string;
  createdAt: string;
  lastUsedAt: string | null;
  lastError: string;
};

/**
 * A rider's upload keys (ADR 0029): each with its name, the end of the
 * key to tell two apart, when it was last used and whether the last file
 * could be read. The rider makes a new one here; a coach, on the rider's
 * page, sees them and can remove one that has gone astray. The key itself
 * is shown once, when it is made, and never here.
 */
export function UploadKeysCard({
  keys,
  max,
  endpoint,
  own,
}: {
  keys: UploadKey[];
  max: number;
  /** Where a helper sends its files: this installation's own address. */
  endpoint: string;
  /** The rider's own page: keys can be made here. A coach only sees and removes. */
  own: boolean;
}) {
  const t = useTranslations("devices.keys");
  const locale = useLocale();
  const { run } = useRun();
  const heading = useRef<HTMLHeadingElement>(null);
  const format = (iso: string, withTime: boolean) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
      day: "numeric",
      month: "short",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : { year: "numeric" }),
      timeZone: "Europe/Copenhagen",
    }).format(new Date(iso));

  return (
    <section
      aria-labelledby="upload-keys"
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-surface sm:p-5"
    >
      <div className="flex flex-col gap-1.5">
        <h3
          id="upload-keys"
          ref={heading}
          // Reached by the keyboard only when the dialog hands it back here.
          tabIndex={-1}
          className="flex items-center gap-2 text-base font-semibold outline-none"
        >
          <KeyRound aria-hidden className="text-primary size-4 shrink-0" />
          {t("title")}
        </h3>
        <p className="text-meta text-2sm leading-relaxed">{own ? t("body") : t("coachBody")}</p>
      </div>

      {keys.length === 0 ? (
        <p className="text-2sm">{t("empty")}</p>
      ) : (
        <ul className="divide-border border-border flex flex-col divide-y rounded-lg border">
          {keys.map((key) => {
            const error = keyErrorKey(key.lastError);
            return (
              <li key={key.id} className="flex flex-wrap items-start justify-between gap-3 p-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{key.name}</span>
                  <span className="text-meta text-xs">
                    {t("endsIn", { hint: key.hint })} ·{" "}
                    {t("created", { date: format(key.createdAt, false) })}
                  </span>
                  <span className="text-2sm">
                    {key.lastUsedAt
                      ? t("lastUsed", { when: format(key.lastUsedAt, true) })
                      : t("neverUsed")}
                  </span>
                  {error && (
                    <span className="bg-warning-tint mt-1 rounded-md px-2.5 py-1.5 text-2sm leading-relaxed">
                      {t(`lastError.${error}` as "lastError.unknown")}
                    </span>
                  )}
                </div>
                <ConfirmButton
                  title={t("removeTitle", { name: key.name })}
                  body={t("removeBody")}
                  confirmLabel={t("remove")}
                  variant="outline"
                  size="default"
                  onConfirm={() =>
                    run(() => removeUploadKeyAction({ keyId: key.id }), { success: t("removed") })
                  }
                >
                  <Trash2 data-icon="inline-start" />
                  {t("remove")}
                  <span className="sr-only">{` ${key.name}`}</span>
                </ConfirmButton>
              </li>
            );
          })}
        </ul>
      )}

      {own && (
        <p className="text-meta text-xs leading-relaxed">
          {t("address")}{" "}
          <code className="bg-muted text-foreground rounded px-1.5 py-0.5 break-all">
            {endpoint}
          </code>
        </p>
      )}
      {own && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <NewUploadKey
            endpoint={endpoint}
            full={keys.length >= max}
            max={max}
            returnFocus={heading}
          />
          <Link
            href="/help#help-keys"
            className="focus-ring text-primary flex min-h-9 items-center text-2sm font-medium hover:underline"
          >
            {t("guide")}
          </Link>
        </div>
      )}
    </section>
  );
}
