"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { City } from "@/modules/rulle";
import type { SceneWords } from "./scene/small-things";

/**
 * The words painted in the landscape (ADR 0034, 0036, 0046): the rider's
 * name in chalk on the climb, the café's sign, the stand's, the finish's,
 * the hill sprint's and the feed and litter zones' — a city's own signs in
 * its own words.
 */
export function useSceneWords(name: string | null, city: City | null): SceneWords {
  const t = useTranslations("rulle.scene");
  return useMemo(
    () => ({
      name: name
        ? t("chalkName", { name: name.toLocaleUpperCase("da").slice(0, 16) })
        : t("chalkAnyone"),
      top: t("chalkTop"),
      cafe: t("cafe"),
      stand: city ? t(`standIn.${city}`) : t("stand"),
      finish: city === "montreal" ? t("finishIn.montreal") : t("finish"),
      hill: t("hill"),
      feed: t("feed"),
      litter: t("litter"),
    }),
    [name, t, city],
  );
}
