"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LittleThing } from "@/modules/rulle";

/**
 * "Today's little things" (ADR 0034): the ride told with a smile after the
 * numbers — the climbing in Himmelbjerge, what passed and was passed, the
 * cows, the stops — and at the end the one that is not a joke, when every
 * block was on target. Nothing shown when there is nothing to tell.
 */
export function LittleThings({ things }: { things: LittleThing[] }) {
  const t = useTranslations("rulle.little");
  if (things.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles aria-hidden className="text-primary size-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {things.map((thing) => (
            <li
              key={thing.key}
              className={
                thing.key === "onTarget"
                  ? "text-primary text-reading font-medium"
                  : "text-reading leading-relaxed"
              }
            >
              {say(thing, t)}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function say(thing: LittleThing, t: ReturnType<typeof useTranslations<"rulle.little">>): string {
  switch (thing.key) {
    case "himmelbjerg":
      return t("himmelbjerg", { metres: thing.metres, times: thing.times });
    case "cafe":
      return t("cafe", { stops: thing.stops, cups: thing.cups });
    case "stand":
      return t("stand", { stops: thing.stops, bottles: thing.bottles });
    case "onTarget":
      return t("onTarget");
    default:
      return t(thing.key, { count: thing.count });
  }
}
