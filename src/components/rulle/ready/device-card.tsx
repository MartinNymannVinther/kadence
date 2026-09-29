"use client";

import { Bluetooth, HeartPulse } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Devices } from "../use-devices";

/**
 * The trainer and the strap, connected before the start. A browser
 * without Web Bluetooth (Safari, Firefox) is told so plainly, with where
 * it does work, and with the way to ride anyway: on the clock, saying
 * afterwards how hard it was.
 */
export function DeviceCard({ devices }: { devices: Devices }) {
  const t = useTranslations("rulle.devices");
  const { bluetooth, trainer, strap, busy, error } = devices;
  const name = (value: string) => value || t("unnamed");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("heading")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {bluetooth === null && (
          <p className="bg-warning-tint text-warning text-2sm rounded-lg px-3 py-2 leading-relaxed">
            {t("noBluetooth")}
          </p>
        )}
        {bluetooth && (
          <>
            {trainer ? (
              <p className="flex items-start gap-2 text-sm">
                <Bluetooth aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
                <span>
                  {trainer.info.erg
                    ? t("erg", { name: name(trainer.info.name) })
                    : t("measures", { name: name(trainer.info.name) })}
                  {trainer.state !== "connected" && (
                    <span className="text-warning">
                      {" "}
                      {trainer.state === "lost" ? t("lost") : t("reconnecting")}
                    </span>
                  )}
                </span>
              </p>
            ) : null}
            {strap && (
              <p className="flex items-start gap-2 text-sm">
                <HeartPulse aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
                {t("pulse", { name: name(strap.link.name) })}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="lg"
                variant={trainer ? "outline" : "default"}
                disabled={busy !== null}
                onClick={() => void devices.connectTrainer()}
              >
                <Bluetooth data-icon="inline-start" />
                {busy === "trainer" ? t("connecting") : trainer ? t("otherTrainer") : t("trainer")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={busy !== null}
                onClick={() => void devices.connectStrap()}
              >
                <HeartPulse data-icon="inline-start" />
                {busy === "strap" ? t("connecting") : t("strap")}
              </Button>
            </div>
            {error && (
              <p role="alert" className="text-destructive text-2sm leading-relaxed">
                {t(`error.${error}` as "error.failed")}
              </p>
            )}
          </>
        )}
        <p className="text-meta text-2sm leading-relaxed">{t("without")}</p>
      </CardContent>
    </Card>
  );
}
