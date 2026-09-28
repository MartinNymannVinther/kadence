"use client";

import { useTranslations } from "next-intl";

/**
 * How to begin, shown above the curves while nothing is being read: how
 * to read a moment and — on a ride long enough to zoom — how to zoom in,
 * in words that fit the reader's pointer. A mouse or a pen drags; a
 * finger's sideways drag scrubs the reading by design, so a phone is
 * pointed at the select mode's button under the curves instead, by the
 * button's own name. The primary pointer decides (`pointer: coarse`); a
 * laptop with a touchscreen keeps the mouse's words.
 */
export function StreamsHint({ zoomable }: { zoomable: boolean }) {
  const t = useTranslations("activities.streams");
  return (
    <>
      {t("hint")}
      {zoomable && (
        <>
          {" "}
          <span className="pointer-coarse:hidden">{t("hintDrag")}</span>
          <span className="pointer-coarse:inline hidden">
            {t("hintTouch", { select: t("select") })}
          </span>
        </>
      )}
    </>
  );
}
