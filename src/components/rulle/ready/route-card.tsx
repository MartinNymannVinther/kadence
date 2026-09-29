"use client";

import { useId } from "react";
import { MapPinned } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BundledRoute } from "@/modules/rulle";
import { RouteProfile } from "../route-profile";
import type { CourseState } from "../use-course";

/**
 * The road to ride through: the route that comes with Kadence, with its
 * length, its climbing and where its roads and heights come from, or a
 * GPX of the rider's own, read on this device and sent nowhere.
 */
export function RouteCard({
  state,
  route,
  bundledName,
  onFile,
  onBundled,
}: {
  state: CourseState;
  route: BundledRoute;
  bundledName: string;
  onFile: (file: File) => void;
  onBundled: () => void;
}) {
  const t = useTranslations("rulle.route");
  const credits = useTranslations("rulle.credits");
  const locale = useLocale();
  const inputId = useId();
  const number = (value: number, digits = 0) =>
    new Intl.NumberFormat(locale === "en" ? "en-GB" : "da-DK", {
      maximumFractionDigits: digits,
    }).format(value);
  const own = state.status !== "loading" && state.own;

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("heading")}</CardDescription>
        <CardTitle className="leading-snug">
          {state.status === "ready"
            ? state.course.name || bundledName
            : bundledName || t("loading")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {state.status === "loading" && <p className="text-meta text-2sm">{t("loading")}</p>}
        {state.status === "ready" && (
          <>
            <p className="text-meta text-2sm">
              {t("facts", {
                km: number(state.course.length / 1000, 1),
                climb: number(state.course.ascent),
              })}
            </p>
            <RouteProfile course={state.course} className="h-16" />
            {!own && (
              <p className="text-meta text-xs leading-relaxed">
                {route.credits.map((c) => credits(c)).join(" · ")}
              </p>
            )}
          </>
        )}
        {state.status === "error" && (
          <p role="alert" className="text-destructive text-2sm leading-relaxed">
            {t(`error.${state.code}` as "error.corrupt")}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={inputId}
            className="border-input bg-card hover:bg-secondary has-focus-visible:outline-ring flex h-11 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm font-medium has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
          >
            <MapPinned aria-hidden className="size-4" />
            {t("own")}
            <input
              id={inputId}
              type="file"
              accept=".gpx,application/gpx+xml"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
                e.target.value = "";
              }}
            />
          </label>
          {own && (
            <Button variant="ghost" className="h-11" onClick={onBundled}>
              {t("bundled", { name: bundledName })}
            </Button>
          )}
        </div>
        <p className="text-meta text-xs leading-relaxed">{t("ownHint")}</p>
      </CardContent>
    </Card>
  );
}
