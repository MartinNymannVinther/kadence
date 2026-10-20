"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/** Seconds Rulle shows the route and one of the two riders before the countdown (ADR 0076). */
export const LOADING = 10;

/**
 * Before the first pedal stroke: while Rulle gets ready (ADR 0076), ten
 * seconds with the route's name and a bar that fills — the landscape
 * behind, one of the two riders turning at the start — and then
 * `onLoaded`; after that the countdown, three, two, one (ADR 0033).
 */
export function StartCurtain({
  loading,
  count,
  route,
  onLoaded,
}: {
  loading: boolean;
  /** Seconds left of the countdown; 0 when it is not running. */
  count: number;
  /** The route's name. */
  route: string;
  onLoaded: () => void;
}) {
  const t = useTranslations("rulle.ride");
  const loaded = useRef(onLoaded);
  // The bar starts empty and fills over the ten seconds, from the frame after it is drawn.
  const [filling, setFilling] = useState(false);

  useEffect(() => {
    loaded.current = onLoaded;
  });

  useEffect(() => {
    if (!loading) return;
    const frame = requestAnimationFrame(() => setFilling(true));
    const timer = setTimeout(() => loaded.current(), LOADING * 1000);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [loading]);

  if (loading)
    return (
      <div
        role="status"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-4 sm:p-8"
      >
        <div className="bg-card/90 w-[min(34rem,100%)] rounded-2xl px-6 py-5 shadow-[var(--dialog-shadow)]">
          <p className="text-ride-label text-muted-foreground font-medium">{t("loading")}</p>
          <p className="mt-1 text-xl font-semibold text-balance sm:text-2xl">{route}</p>
          <div className="bg-muted mt-4 h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-[width] ease-linear"
              style={{ width: filling ? "100%" : "0%", transitionDuration: `${LOADING}s` }}
            />
          </div>
        </div>
      </div>
    );

  if (count > 0)
    return (
      <div
        role="status"
        className="absolute inset-0 z-20 grid place-items-center bg-[var(--scrim)]"
      >
        <div className="bg-card flex flex-col items-center gap-2 rounded-2xl px-16 py-10 shadow-[var(--dialog-shadow)]">
          <p className="text-ride-label font-medium">{t("countdown")}</p>
          <p className="text-ride-hero leading-none font-semibold tabular-nums">{count}</p>
        </div>
      </div>
    );

  return null;
}
