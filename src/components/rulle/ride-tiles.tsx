"use client";

import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { clockText } from "@/components/training/duration";
import { useTargetText } from "@/components/workouts/use-target-text";
import { cn } from "@/lib/utils";
import { ergWatts, type Block, type Standing } from "@/modules/rulle";
import type { Thresholds } from "@/modules/load";
import type { Live } from "./ride/engine";

/**
 * The three numbers read from the saddle, two metres from the screen:
 * the watts now against the block's, the time left of the block and what
 * comes next, and the legs and the heart. Sized by the screen
 * (`text-ride-*`, ADR 0033). On target is said three ways at once — the
 * tile's tone, an arrow and a word — so it never rests on colour alone.
 */

const TONE: Record<Standing, string> = {
  on: "bg-success-tint text-success border-success/30",
  under: "bg-warning-tint text-warning border-warning/30",
  over: "bg-warning-tint text-warning border-warning/30",
  free: "bg-card",
  unknown: "bg-card",
};

function Tile({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "border-border bg-card flex min-w-0 flex-col justify-between gap-1 rounded-xl border px-4 py-3 shadow-surface sm:px-5 lg:px-7 lg:py-5",
        className,
      )}
    >
      <h2 className="text-ride-label leading-tight font-medium tracking-wide uppercase opacity-80">
        {label}
      </h2>
      {children}
    </section>
  );
}

const Hero = ({ children }: { children: React.ReactNode }) => (
  <p className="text-ride-hero leading-none font-semibold tracking-tight tabular-nums">
    {children}
  </p>
);

const Sub = ({ children }: { children: React.ReactNode }) => (
  <p className="text-ride-label leading-tight font-medium">{children}</p>
);

export function WattTile({ live, rider }: { live: Live; rider: Thresholds | null }) {
  const t = useTranslations("rulle.ride");
  const targetText = useTargetText();
  const block = live.block?.block ?? null;
  const aim = block ? ergWatts(block, live.intensity) : null;
  const Icon = live.standing === "under" ? ArrowUp : live.standing === "over" ? ArrowDown : Check;
  const said = live.standing === "on" || live.standing === "under" || live.standing === "over";
  // A block without watts says what it asks for instead: a pulse, an RPE, or nothing at all.
  const free = (b: Block) =>
    b.bpm
      ? t("pulseTarget", { low: b.bpm.low, high: b.bpm.high })
      : b.target.kind === "open"
        ? t("free")
        : targetText(b.target, rider).main;
  return (
    <Tile label={t("watt")} className={TONE[live.standing]}>
      <div className="flex items-end gap-3">
        <Hero>{live.power3s ?? "–"}</Hero>
        {said && (
          <span className="text-ride-value flex items-center gap-1 leading-none font-semibold">
            <Icon aria-hidden className="size-[0.9em]" strokeWidth={3} />
            <span className="text-ride-label">{t(live.standing as "on")}</span>
          </span>
        )}
      </div>
      {aim !== null ? (
        <p className="text-ride-label leading-tight font-medium">
          {t.rich("target", {
            watts: aim,
            big: (chunks) => (
              <span className="text-ride-value font-semibold tabular-nums">{chunks}</span>
            ),
          })}
        </p>
      ) : (
        <Sub>{block ? free(block) : t("free")}</Sub>
      )}
    </Tile>
  );
}

export function BlockTile({ live }: { live: Live }) {
  const t = useTranslations("rulle.ride");
  const intents = useTranslations("workouts.intent");
  if (!live.block) {
    return (
      <Tile label={t("ridden")}>
        <Hero>{clockText(Math.floor(live.ridden))}</Hero>
        <Sub>{live.status === "paused" ? t("paused") : t("freeRide")}</Sub>
      </Tile>
    );
  }
  const next = live.next;
  const nextWatts = next ? ergWatts(next, live.intensity) : null;
  return (
    <Tile label={t("block")}>
      <Hero>{clockText(Math.max(0, Math.ceil(live.block.remaining - (live.second % 1))))}</Hero>
      <Sub>
        {next
          ? t("next", {
              what: [
                clockText(next.seconds),
                intents(next.intent),
                nextWatts ? `${nextWatts} W` : null,
              ]
                .filter(Boolean)
                .join(" · "),
            })
          : t("last")}
      </Sub>
    </Tile>
  );
}

export function BodyTile({ live }: { live: Live }) {
  const t = useTranslations("rulle.ride");
  const cadence = live.block?.block.cadence ?? null;
  return (
    <section className="border-border bg-card grid h-full min-w-0 grid-cols-2 gap-3 rounded-xl border px-4 py-3 shadow-surface sm:px-5 lg:px-7 lg:py-5">
      <div className="flex min-w-0 flex-col justify-between gap-1">
        <h2 className="text-ride-label leading-tight font-medium tracking-wide uppercase opacity-80">
          {t("cadence")}
        </h2>
        <p className="text-ride-value leading-none font-semibold tabular-nums">
          {live.cadence === null ? "–" : Math.round(live.cadence)}
        </p>
        <Sub>{cadence ? t("cadenceTarget", { rpm: cadence }) : " "}</Sub>
      </div>
      <div className="flex min-w-0 flex-col justify-between gap-1">
        <h2 className="text-ride-label leading-tight font-medium tracking-wide uppercase opacity-80">
          {t("pulse")}
        </h2>
        <p className="text-ride-value leading-none font-semibold tabular-nums">
          {live.heartRate ?? "–"}
        </p>
        <Sub> </Sub>
      </div>
    </section>
  );
}
