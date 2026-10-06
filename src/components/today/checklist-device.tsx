"use client";

import { useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { folderSupport } from "@/components/activities/read-device-folder";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { ProviderId } from "@/modules/devices/providers";
import { DEVICE_CHOICES, waysFor, type DeviceChoice, type Way } from "./checklist-steps";

const never = () => () => undefined;
const canFolder = () => folderSupport() !== null;

/** Where each way is done: the devices page, or the upload on Mig. */
const hrefOf = (way: Way) => (way.kind === "connect" ? "/settings/devices" : "/me#upload");

/**
 * "Hvad kører du med?": five answers, and then only the ways that work
 * for that answer on this installation and in this browser
 * (`waysFor`), each with the link that does it.
 */
export function DeviceStep({
  choice,
  configured,
  onChoose,
  onSettle,
}: {
  choice: DeviceChoice | null;
  configured: readonly ProviderId[];
  onChoose: (choice: DeviceChoice | null) => void;
  onSettle: () => void;
}) {
  const t = useTranslations("today.checklist.device");
  const names = useTranslations("devices");
  // Whether the browser can be handed a folder is known only in the browser.
  const folder = useSyncExternalStore(never, canFolder, () => false);

  if (choice === null) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-2sm leading-relaxed">{t("ask")}</p>
        <div className="flex flex-wrap gap-2">
          {DEVICE_CHOICES.map((c) => (
            <Button
              key={c}
              type="button"
              variant="outline"
              className="max-sm:h-11"
              onClick={() => onChoose(c)}
            >
              {t(`choice.${c}` as "choice.garmin")}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  const ways = waysFor(choice, { configured, folder });
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {ways.map((way) => {
          const name = way.kind === "connect" ? names(`name.${way.provider}` as "name.wahoo") : "";
          return (
            <li key={way.kind} className="flex flex-col gap-1">
              <p className="text-2sm leading-relaxed">
                {t(`way.${way.kind}` as "way.upload", { name })}
              </p>
              {way.kind !== "byHand" && (
                <Link
                  href={hrefOf(way)}
                  className="focus-ring text-primary flex min-h-9 w-fit items-center gap-1 text-2sm font-medium hover:underline"
                >
                  {t(`go.${way.kind}` as "go.upload", { name })}
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" className="max-sm:h-11" onClick={onSettle}>
          {t("settle")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="max-sm:h-11"
          onClick={() => onChoose(null)}
        >
          {t("change")}
        </Button>
      </div>
    </div>
  );
}
