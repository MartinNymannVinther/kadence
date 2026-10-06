"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Push } from "./ride/cheat";

/**
 * The cheat code on the screen (ADR 0045): as it comes on, a banner in an
 * old arcade machine's manner — what it is, the keys, and that only the
 * landscape is cheated; while it is on, the bike's speed in big digits
 * and a cross that turns it off; and on a touch screen four pads, held
 * down, for the speed and the steering.
 */
export function CheatOverlay({
  banner,
  kmh,
  onOff,
  onSteer,
}: {
  banner: boolean;
  /** The speed shown, km/h. */
  kmh: number;
  onOff: () => void;
  onSteer: (throttle: Push, steer: Push) => void;
}) {
  const t = useTranslations("rulle.cheat");
  const touch = useSyncExternalStore(subscribe, coarse, () => false);
  const held = useRef({ throttle: 0 as Push, steer: 0 as Push });
  const hold = (axis: "throttle" | "steer", value: Push) => {
    held.current[axis] = value;
    onSteer(held.current.throttle, held.current.steer);
  };
  const pad = (axis: "throttle" | "steer", value: Push, label: string, icon: ReactNode) => (
    <button
      type="button"
      aria-label={label}
      className="bg-foreground/80 text-sticky grid size-16 touch-none place-items-center rounded-2xl shadow-surface select-none active:scale-95 [&_svg]:size-9"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        hold(axis, value);
      }}
      onPointerUp={() => hold(axis, 0)}
      onPointerCancel={() => hold(axis, 0)}
    >
      {icon}
    </button>
  );

  return (
    <>
      {banner && (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center px-4"
        >
          <div className="animate-in fade-in zoom-in-75 bg-foreground/90 border-sticky max-w-md rounded-2xl border-4 px-8 py-5 text-center shadow-[var(--dialog-shadow)] duration-300 motion-reduce:animate-none">
            <p className="text-sticky text-4xl font-black tracking-[0.3em] uppercase">
              {t("title")}
            </p>
            <p className="text-background mt-1 text-lg font-semibold">{t("on")}</p>
            <p className="text-background/85 mt-3 text-sm">{touch ? t("touch") : t("keys")}</p>
            <p className="text-background/70 mt-2 text-xs">{t("honest")}</p>
          </div>
        </div>
      )}
      <div className="bg-foreground/85 absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-xl py-1.5 pr-1.5 pl-4 shadow-surface">
        <span className="text-sticky text-xs font-black tracking-[0.25em] uppercase">
          {t("badge")}
        </span>
        <span className="text-background text-ride-value leading-none font-black tabular-nums">
          {Math.round(kmh)}
        </span>
        <span className="text-background/80 text-ride-label">{t("unit")}</span>
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-background/80 hover:text-foreground"
          aria-label={t("off")}
          onClick={onOff}
        >
          <X />
        </Button>
      </div>
      {touch && (
        <>
          <div className="absolute top-1/2 left-3 flex -translate-y-1/2 gap-3">
            {pad("steer", -1, t("left"), <ChevronLeft />)}
            {pad("steer", 1, t("right"), <ChevronRight />)}
          </div>
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 flex-col gap-3">
            {pad("throttle", 1, t("faster"), <ChevronUp />)}
            {pad("throttle", -1, t("slower"), <ChevronDown />)}
          </div>
        </>
      )}
    </>
  );
}

/** A touch screen, where a finger is the pointer: the pads are shown. */
const QUERY = "(pointer: coarse)";
const coarse = () => window.matchMedia(QUERY).matches;
function subscribe(listener: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
