"use client";

import { useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { platformOf, type Platform } from "./checklist-steps";

/**
 * "Læg Kadence på hjemmeskærmen", in the words of the phone in the hand:
 * Safari's Del → Føj til hjemmeskærm on an iPhone, Chrome's own install
 * where the browser offers it (`beforeinstallprompt`), and the menu where
 * it does not. Nothing is installed without the rider's own press.
 */

type InstallPrompt = Event & { prompt: () => Promise<void> };

let offered: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((listener) => listener());

// The browser offers the install once, when it decides to; kept from the
// moment this file is loaded so a later press can use it. The browser's
// own offer is left alone.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    offered = event as InstallPrompt;
    tell();
  });
  window.addEventListener("appinstalled", () => {
    offered = null;
    tell();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const platformNow = (): Platform =>
  platformOf({
    standalone: standalone(),
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  });

const never = () => () => undefined;

/** The platform, known only in the browser: null on the server. */
export function usePlatform(): Platform | null {
  return useSyncExternalStore(never, platformNow, () => null);
}

export function HomeScreenStep({ platform }: { platform: Platform | null }) {
  const t = useTranslations("today.checklist.homeScreen");
  const prompt = useSyncExternalStore(
    subscribe,
    () => offered,
    () => null,
  );

  async function install() {
    const event = offered;
    if (!event) return;
    offered = null;
    tell();
    await event.prompt().catch(() => undefined);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-2sm leading-relaxed">
        {platform === "ios"
          ? t("ios")
          : platform === "android"
            ? prompt
              ? t("androidPrompt")
              : t("android")
            : t("other")}
      </p>
      {prompt && (
        <Button type="button" onClick={install} className="self-start max-sm:h-11">
          <Download data-icon="inline-start" />
          {t("install")}
        </Button>
      )}
    </div>
  );
}
