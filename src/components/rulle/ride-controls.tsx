"use client";

import {
  Map as MapIcon,
  Maximize,
  Minimize,
  Minus,
  Pause,
  Play,
  Plus,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { INTENSITY, type Live } from "./ride/engine";
import type { LinkState } from "./bluetooth/reconnect";

/**
 * The strip across the top of the ride: what is being ridden and where in
 * it, whether the trainer is still there, and the few things a rider
 * reaches for mid-ride — pause, the next block, the watts a little lower
 * or higher, ERG on or off, the sound, the little map, full screen, and the end. Every
 * control has a key as well (listed in `ride.keys`), so a rider can reach
 * a keyboard on the handlebars rather than the screen.
 */
export function RideControls({
  title,
  live,
  blockCount,
  canErg,
  connection,
  muted,
  mapShown,
  fullscreen,
  onReconnect,
  onPause,
  onResume,
  onSkip,
  onIntensity,
  onErg,
  onMute,
  onMap,
  onFullscreen,
  onEnd,
}: {
  title: string;
  live: Live;
  blockCount: number;
  canErg: boolean;
  connection: LinkState | null;
  muted: boolean;
  mapShown: boolean;
  fullscreen: { on: boolean; available: boolean };
  onReconnect: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onIntensity: (value: number) => void;
  onErg: (on: boolean) => void;
  onMute: () => void;
  onMap: () => void;
  onFullscreen: () => void;
  onEnd: () => void;
}) {
  const t = useTranslations("rulle.ride");
  const devices = useTranslations("rulle.devices");
  const paused = live.status === "paused";
  const withBlocks = live.totalSeconds !== null;
  const pct = Math.round(live.intensity * 100);

  return (
    <header className="bg-card/90 border-border flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2 sm:px-6">
      <div className="flex min-w-0 flex-col">
        <h1 className="text-ride-label truncate leading-tight font-semibold">{title}</h1>
        <p className="text-meta text-2sm flex flex-wrap items-center gap-x-3">
          {live.block && t("blockOf", { index: live.block.index + 1, count: blockCount })}
          {paused && (
            <span className="text-warning font-medium">
              {live.autoPaused ? t("autoPaused") : t("paused")}
            </span>
          )}
          {connection === "reconnecting" && (
            <span className="text-warning font-medium">{devices("reconnecting")}</span>
          )}
          {connection === "lost" && (
            <span className="text-warning flex items-center gap-2 font-medium">
              {devices("lost")}
              <Button size="xs" variant="outline" onClick={onReconnect}>
                {devices("again")}
              </Button>
            </span>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {withBlocks && (
          <div className="flex items-center gap-1" role="group" aria-label={t("intensityLabel")}>
            <Button
              size="icon-lg"
              variant="outline"
              aria-label={t("easier")}
              disabled={live.intensity <= INTENSITY.min}
              onClick={() => onIntensity(live.intensity - INTENSITY.step)}
            >
              <Minus />
            </Button>
            <span className="w-14 text-center text-sm font-semibold tabular-nums">
              {t("intensity", { pct })}
            </span>
            <Button
              size="icon-lg"
              variant="outline"
              aria-label={t("harder")}
              disabled={live.intensity >= INTENSITY.max}
              onClick={() => onIntensity(live.intensity + INTENSITY.step)}
            >
              <Plus />
            </Button>
          </div>
        )}
        {withBlocks && canErg && (
          <Button
            size="lg"
            variant={live.erg ? "default" : "outline"}
            aria-pressed={live.erg}
            title={live.erg ? t("ergOn") : t("ergOff")}
            onClick={() => onErg(!live.erg)}
          >
            {t("erg")}
          </Button>
        )}
        <Button
          size="icon-lg"
          variant="outline"
          aria-label={paused ? t("resume") : t("pause")}
          onClick={paused ? onResume : onPause}
        >
          {paused ? <Play /> : <Pause />}
        </Button>
        {withBlocks && (
          <Button size="icon-lg" variant="outline" aria-label={t("skip")} onClick={onSkip}>
            <SkipForward />
          </Button>
        )}
        <Button
          size="icon-lg"
          variant="outline"
          aria-label={muted ? t("soundOn") : t("soundOff")}
          onClick={onMute}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </Button>
        <Button
          size="icon-lg"
          variant="outline"
          aria-label={mapShown ? t("mapHide") : t("mapShow")}
          aria-pressed={mapShown}
          onClick={onMap}
        >
          <MapIcon />
        </Button>
        {fullscreen.available && (
          <Button
            size="icon-lg"
            variant="outline"
            aria-label={t("fullscreen")}
            aria-pressed={fullscreen.on}
            onClick={onFullscreen}
          >
            {fullscreen.on ? <Minimize /> : <Maximize />}
          </Button>
        )}
        <Button size="lg" variant="outline" className="text-destructive" onClick={onEnd}>
          <Square data-icon="inline-start" />
          {t("end")}
        </Button>
      </div>
    </header>
  );
}
