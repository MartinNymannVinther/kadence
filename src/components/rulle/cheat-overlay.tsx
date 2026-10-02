"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useSyncExternalStore, type ReactNode } from "react";
import type { CheatMode, CheatState, Push } from "./ride/cheat";

/**
 * The cheat codes over the road (ADR 0045, 0048): as one comes on, a
 * banner in an old arcade machine's manner — what it is, the keys, and
 * that only the landscape is cheated; and on a touch screen four pads,
 * held down, for the speed or the watts and the steering. Its numbers and
 * buttons are in the tiles' place (`CheatPanel`).
 */
export function CheatOverlay({
  banner,
  state,
  onSteer,
}: {
  banner: CheatMode | null;
  state: NonNullable<CheatState>;
  onSteer: (throttle: Push, steer: Push) => void;
}) {
  const t = useTranslations("rulle.cheat");
  const watts = state.mode === "watts";
  /** The banner's words for the code that came on. */
  const said = (key: "on" | "keys" | "touch" | "honest") =>
    banner === "watts" ? t(`${key}Watts`) : t(key);
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
      className="bg-foreground/80 text-sticky grid size-16 touch-none place-items-center rounded-2xl shadow-[var(--surface-shadow)] select-none active:scale-95 [&_svg]:size-9"
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
            <p className="text-background mt-1 text-lg font-semibold">{said("on")}</p>
            <p className="text-background/85 mt-3 text-sm">{said(touch ? "touch" : "keys")}</p>
            <p className="text-background/70 mt-2 text-xs">{said("honest")}</p>
          </div>
        </div>
      )}
      {touch && (
        <>
          <div className="absolute top-1/2 left-3 flex -translate-y-1/2 gap-3">
            {pad("steer", -1, t("left"), <ChevronLeft />)}
            {pad("steer", 1, t("right"), <ChevronRight />)}
          </div>
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 flex-col gap-3">
            {pad("throttle", 1, watts ? t("more") : t("faster"), <ChevronUp />)}
            {pad("throttle", -1, watts ? t("less") : t("slower"), <ChevronDown />)}
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
