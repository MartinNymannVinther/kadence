"use client";

import { useId } from "react";
import { Check, Flag, MapPinned } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BundledRoute } from "@/modules/rulle";
import { RouteProfile } from "../route-profile";
import type { CourseState } from "../use-course";

/**
 * The road to ride through (ADR 0035): one of the routes that come with
 * Kadence — the B&U DM course with its finish, Vejle's fjord and
 * Kiddesvej, Himmelbjerget from Ry — each with its length, its climbing
 * and where it comes from, or a GPX of the rider's own, read on this
 * device and sent nowhere.
 */
export function RouteCard({
  state,
  route,
  routes,
  onChoose,
  onFile,
}: {
  state: CourseState;
  route: BundledRoute;
  routes: readonly BundledRoute[];
  onChoose: (key: string) => void;
  onFile: (file: File) => void;
}) {
  const t = useTranslations("rulle.route");
  const names = useTranslations("rulle.routes");
  const credits = useTranslations("rulle.credits");
  const locale = useLocale();
  const inputId = useId();
  const number = (value: number, digits = 0) =>
    new Intl.NumberFormat(locale === "en" ? "en-GB" : "da-DK", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  const own = state.status !== "loading" && state.own;

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("heading")}</CardDescription>
        <CardTitle className="leading-snug">
          {own && state.status === "ready"
            ? state.course.name || t("ownTitle")
            : names(`${route.key}.name` as "vejle.name")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div role="radiogroup" aria-label={t("pick")} className="flex flex-col gap-2">
          {routes.map((r) => {
            const chosen = !own && r.key === route.key;
            return (
              <button
                key={r.key}
                type="button"
                role="radio"
                aria-checked={chosen}
                onClick={() => onChoose(r.key)}
                className={cn(
                  "focus-ring flex min-h-11 items-start gap-3 rounded-lg border px-3 py-2.5 text-left",
                  chosen ? "border-primary bg-primary/5" : "border-border hover:bg-secondary",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {r.finish && <Flag aria-hidden className="text-primary size-3.5 shrink-0" />}
                    {names(`${r.key}.name` as "vejle.name")}
                  </span>
                  <span className="text-meta text-xs leading-relaxed">
                    {names(`${r.key}.about` as "vejle.about")}
                  </span>
                  <span className="text-meta text-xs tabular-nums">
                    {t("facts", { km: number(r.km, 1), climb: number(r.climb) })}
                  </span>
                </span>
                {chosen && <Check aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />}
              </button>
            );
          })}
        </div>

        {state.status === "loading" && <p className="text-meta text-2sm">{t("loading")}</p>}
        {state.status === "ready" && (
          <>
            {own && (
              <p className="text-meta text-2sm">
                {t("facts", {
                  km: number(state.course.length / 1000, 1),
                  climb: number(state.course.ascent),
                })}
              </p>
            )}
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
        <label
          htmlFor={inputId}
          className={cn(
            "has-focus-visible:outline-ring flex h-11 cursor-pointer items-center gap-2 self-start rounded-md border px-4 text-sm font-medium has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
            own ? "border-primary bg-primary/5" : "border-input bg-card hover:bg-secondary",
          )}
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
        <p className="text-meta text-xs leading-relaxed">{t("ownHint")}</p>
      </CardContent>
    </Card>
  );
}
