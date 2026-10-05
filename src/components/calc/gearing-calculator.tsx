"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { NumberField } from "@/components/workouts/number-field";
import { checkBike, TYRE_IDS, TYRES, type TyreId } from "@/modules/calc/gearing";
import { YOUTH_GEARING, type GearClass } from "@/modules/dcu/gearing";
import { ClassPicker } from "./class-picker";
import { GearProducts } from "./gear-products";
import { GearingResult } from "./gearing-result";
import { GearSlider } from "./gear-slider";
import { RingTable } from "./ring-table";
import { RolloutScene } from "./rollout-scene";

const span = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** The big chainrings a road or 1× bike can carry, and the smallest sprockets a cassette starts on. */
const RINGS = span(28, 56);
const COGS = span(10, 16);
const WIDTHS = TYRE_IDS.map(Number);

/**
 * The gearing calculator (ADR 0047, 0055): the class chosen on large
 * buttons; tyre, biggest chainring and smallest sprocket on sliders; one
 * turn of the pedals drawn to scale against DCU's limit; then the parts
 * that would build that gear. It runs in the browser; nothing is sent.
 */
export function GearingCalculator() {
  const t = useTranslations("calculators.gearing");
  const measuredId = useId();
  const [gearClass, setGearClass] = useState<GearClass>("U17");
  const [tyre, setTyre] = useState<TyreId>("25");
  const [measured, setMeasured] = useState(false);
  const [customMm, setCustomMm] = useState(2105);
  const [ring, setRing] = useState(50);
  const [cog, setCog] = useState(14);

  const circumference = measured ? customMm : TYRES[tyre];
  const limit = YOUTH_GEARING[gearClass].limitM;
  const valid = circumference >= 1800 && circumference <= 2400;
  const className = t(`classes.${gearClass}` as "title");
  const teeth = (n: number) => t("slider.teeth", { n });
  const spokenTeeth = (n: number) => t("slider.teethSpoken", { n });

  return (
    <div className="flex flex-col gap-6">
      <ClassPicker value={gearClass} onChange={setGearClass} />

      <section className="border-border bg-card flex flex-col gap-5 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5">
        <h2 className="text-lg font-semibold">{t("scene.title")}</h2>
        {valid ? (
          <RolloutScene
            ring={ring}
            cog={cog}
            circumferenceMm={circumference}
            limit={limit}
            className={className}
          />
        ) : (
          <p className="bg-secondary rounded-md px-3 py-2 text-2sm">{t("circumferenceInvalid")}</p>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <GearSlider
              label={t("tyre")}
              values={WIDTHS}
              value={Number(tyre)}
              onChange={(mm) => setTyre(String(mm) as TyreId)}
              shown={(mm) => t("tyreOption", { mm })}
              spoken={(mm) => t("slider.tyreSpoken", { mm })}
              less={t("slider.narrower")}
              more={t("slider.wider")}
              disabled={measured}
            />
            <div className="flex items-center gap-2">
              <Switch
                id={measuredId}
                checked={measured}
                onChange={(e) => setMeasured(e.target.checked)}
              />
              <label htmlFor={measuredId} className="text-2sm">
                {t("tyreCustom")}
              </label>
            </div>
            {measured && (
              <div className="flex flex-col gap-1">
                <NumberField
                  label={t("circumference")}
                  value={customMm}
                  onChange={setCustomMm}
                  min={1800}
                  max={2400}
                  suffix="mm"
                />
                <p className="text-meta text-xs">{t("circumferenceHint")}</p>
              </div>
            )}
          </div>
          <GearSlider
            label={t("ring")}
            values={RINGS}
            value={ring}
            onChange={setRing}
            shown={teeth}
            spoken={spokenTeeth}
            less={t("slider.fewer", { what: t("ring") })}
            more={t("slider.more", { what: t("ring") })}
          />
          <GearSlider
            label={t("cog")}
            values={COGS}
            value={cog}
            onChange={setCog}
            shown={teeth}
            spoken={spokenTeeth}
            less={t("slider.fewer", { what: t("cog") })}
            more={t("slider.more", { what: t("cog") })}
          />
        </div>

        {valid && (
          <GearingResult
            check={checkBike(ring, cog, circumference, limit)}
            limit={limit}
            className={className}
            circumferenceMm={circumference}
          />
        )}
      </section>

      <GearProducts
        ring={ring}
        cog={cog}
        limit={limit}
        circumferenceMm={valid ? circumference : TYRES[tyre]}
        className={className}
      />

      {limit !== null && valid && (
        <RingTable limit={limit} circumference={circumference} className={className} cog={cog} />
      )}
    </div>
  );
}
