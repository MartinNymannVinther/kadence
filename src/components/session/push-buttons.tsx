"use client";

import { useState } from "react";
import { CircleCheck, CircleX, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { pushErrorKey } from "@/components/devices/device-words";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { pushSessionAction } from "@/modules/devices/actions";
import type { ProviderId } from "@/modules/devices/providers";

type Provider = ProviderId;

/**
 * "Send til Wahoo" / "Send til Garmin", for a bike session whose rider has
 * connected one: the plan on the device's calendar, answered in words —
 * sent, or why not. Sending again after a change sends the change; to
 * Garmin, sending again with nothing changed sends nothing (docs/adr/0114).
 */
export function PushButtons({
  sessionId,
  providers,
}: {
  sessionId: string;
  providers: Provider[];
}) {
  const t = useTranslations("session.push");
  const names = useTranslations("devices.name");
  const [busy, setBusy] = useState<Provider | null>(null);
  const [answer, setAnswer] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  async function send(provider: Provider) {
    setBusy(provider);
    setAnswer(null);
    const name = names(provider);
    try {
      const result = await pushSessionAction({ sessionId, provider });
      // The line above the buttons says where the session now is.
      if (result.ok) router.refresh();
      setAnswer(
        result.ok
          ? { ok: true, text: t("sent", { name }) }
          : {
              ok: false,
              text: t(`error.${pushErrorKey(result.detail)}` as "error.generic", { name }),
            },
      );
    } catch {
      setAnswer({ ok: false, text: t("error.generic", { name }) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {providers.map((provider) => (
          <Button
            key={provider}
            type="button"
            variant="outline"
            className="max-sm:h-11"
            disabled={busy !== null}
            onClick={() => void send(provider)}
          >
            <Send data-icon="inline-start" />
            {busy === provider ? t("sending") : t("send", { name: names(provider) })}
          </Button>
        ))}
      </div>
      {answer && (
        <p
          role="status"
          className={
            answer.ok
              ? "bg-success-tint text-success flex items-start gap-2 rounded-md px-3 py-2 text-2sm"
              : "bg-warning-tint flex items-start gap-2 rounded-md px-3 py-2 text-2sm"
          }
        >
          {answer.ok ? (
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CircleX aria-hidden className="text-destructive mt-0.5 size-4 shrink-0" />
          )}
          {answer.text}
        </p>
      )}
    </div>
  );
}
