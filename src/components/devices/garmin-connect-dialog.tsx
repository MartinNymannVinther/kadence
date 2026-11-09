"use client";

import { useId, useState } from "react";
import { ExternalLink, Plug, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Garmin's own privacy notice for Garmin Connect. */
const GARMIN_PRIVACY = "https://www.garmin.com/privacy/connect";

/**
 * Before the browser leaves for Garmin: what goes to and from Garmin, a
 * link to Garmin's privacy notice, the word to a rider who may not put
 * data in their Garmin account, and a box to tick: the rider's own yes
 * (src/modules/consent/garmin.ts).
 * "Fortsæt til Garmin" is a plain link to the connect route with the yes
 * in it; the route writes the yes before it sends the browser on.
 */
export function GarminConnectDialog({ again }: { again: boolean }) {
  const t = useTranslations("garmin.connect");
  const devices = useTranslations("devices");
  const locale = useLocale();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const href = `/api/devices/garmin/connect?consent=yes&locale=${locale === "en" ? "en" : "da"}`;

  return (
    <>
      <Button
        type="button"
        variant={again ? "outline" : "default"}
        className="max-sm:h-11"
        onClick={() => {
          setAgreed(false);
          setOpen(true);
        }}
      >
        {again ? <RefreshCw data-icon="inline-start" /> : <Plug data-icon="inline-start" />}
        {again ? devices("reconnect", { name: "Garmin" }) : devices("connect", { name: "Garmin" })}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("body")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-2sm leading-relaxed">
            <p>{t("garminOwn")}</p>
            <a
              href={GARMIN_PRIVACY}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring text-primary flex w-fit items-center gap-1 font-medium hover:underline"
            >
              {t("privacy")}
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
            <p>{t("restricted")}</p>
            <label
              htmlFor={id}
              className="border-border bg-card has-checked:border-primary has-focus-visible:outline-ring flex cursor-pointer gap-3 rounded-lg border p-3 has-focus-visible:outline-2"
            >
              <input
                id={id}
                type="checkbox"
                checked={agreed}
                className="accent-primary mt-0.5 size-5 shrink-0"
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>{t("agree")}</span>
            </label>
            <p className="text-meta text-xs">{t("withdraw")}</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="max-sm:h-11"
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
            {agreed ? (
              <a href={href} className={cn(buttonVariants(), "max-sm:h-11")}>
                {t("continue")}
              </a>
            ) : (
              <Button type="button" disabled className="max-sm:h-11">
                {t("continue")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
