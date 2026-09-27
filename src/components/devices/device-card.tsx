"use client";

import { Plug, RefreshCw, Unplug } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { cn } from "@/lib/utils";
import { disconnectAction } from "@/modules/devices/actions";
import { lastErrorKey } from "./device-words";

export type DeviceLink = {
  provider: "wahoo" | "garmin";
  configured: boolean;
  canPush: boolean;
  status: "connected" | "error" | "revoked" | null;
  lastSyncAt: string | null;
  lastError: string;
};

/**
 * One provider on the rider's devices page: not set up on this
 * installation (and FIT upload instead), not connected, connected with the
 * last sync and any trouble in words, or broken and waiting for a new
 * connection. Connecting is a plain link to the OAuth route — the browser
 * leaves Kadence for the provider and comes back.
 */
export function DeviceCard({ link }: { link: DeviceLink }) {
  const t = useTranslations("devices");
  const locale = useLocale();
  const { run } = useRun();
  const name = t(`name.${link.provider}`);
  const error = lastErrorKey(link.lastError);
  const synced = link.lastSyncAt
    ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Copenhagen",
      }).format(new Date(link.lastSyncAt))
    : null;
  const connect = (
    <a
      href={`/api/devices/${link.provider}/connect`}
      className={cn(
        buttonVariants({ variant: link.status ? "outline" : "default" }),
        "max-sm:h-11",
      )}
    >
      {link.status ? <RefreshCw data-icon="inline-start" /> : <Plug data-icon="inline-start" />}
      {link.status ? t("reconnect", { name }) : t("connect", { name })}
    </a>
  );

  return (
    <article className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{name}</h3>
        <span className="bg-muted text-meta rounded-full px-2.5 py-0.5 text-xs font-medium">
          {!link.configured
            ? t("state.notConfigured")
            : link.status === null
              ? t("state.notConnected")
              : t(`state.${link.status}`)}
        </span>
      </div>
      <p className="text-meta text-2sm leading-relaxed">{t(`about.${link.provider}`)}</p>

      {!link.configured ? (
        <p className="text-2sm leading-relaxed">{t("notConfigured")}</p>
      ) : (
        <>
          {link.status === "connected" && (
            <p className="text-2sm">{synced ? t("lastSync", { when: synced }) : t("noSyncYet")}</p>
          )}
          {error && (
            <p className="bg-warning-tint rounded-md px-3 py-2 text-2sm leading-relaxed">
              {t(`lastError.${error}` as "lastError.unknown", { name })}
            </p>
          )}
          {link.status === "connected" && link.canPush && (
            <p className="text-meta text-xs leading-relaxed">{t("canPush", { name })}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {link.status !== "connected" && connect}
            {link.status !== null && (
              <ConfirmButton
                title={t("disconnectTitle", { name })}
                body={t("disconnectBody", { name })}
                confirmLabel={t("disconnect")}
                size="default"
                onConfirm={() =>
                  run(() => disconnectAction({ provider: link.provider }), {
                    success: t("disconnected", { name }),
                  })
                }
              >
                <Unplug data-icon="inline-start" />
                {t("disconnect")}
              </ConfirmButton>
            )}
          </div>
        </>
      )}
    </article>
  );
}
