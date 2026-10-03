"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { NumberField } from "@/components/workouts/number-field";
import { checkBike, TYRE_IDS, TYRES, validTeeth, type TyreId } from "@/modules/calc/gearing";
import { GEAR_CLASSES, YOUTH_GEARING, type GearClass } from "@/modules/dcu/gearing";
import { FieldSelect } from "./field-select";
import { GearProducts } from "./gear-products";
import { GearingResult } from "./gearing-result";
import { RingTable } from "./ring-table";

type Tyre = TyreId | "custom";

/**
 * The gearing calculator (ADR 0047): class, tyre, biggest chainring and
 * smallest sprocket in; the bike's biggest gear against DCU's limit, the
 * way back within it, the biggest chainring for each sprocket and the
 * parts that could help out. It runs in the browser; nothing is sent.
 */
export function GearingCalculator() {
  const t = useTranslations("calculators.gearing");
  const [gearClass, setGearClass] = useState<GearClass>("U17");
  const [tyre, setTyre] = useState<Tyre>("25");
  const [customMm, setCustomMm] = useState(2105);
  const [ring, setRing] = useState(50);
  const [cog, setCog] = useState(14);

  const circumference = tyre === "custom" ? customMm : TYRES[tyre];
  const limit = YOUTH_GEARING[gearClass].limitM;
  const valid = validTeeth(ring, cog) && circumference >= 1800 && circumference <= 2400;
  const className = t(`classes.${gearClass}` as "title");

  return (
    <div className="flex flex-col gap-6">
      <section className="border-border bg-card grid gap-3 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:grid-cols-2 sm:p-5">
        <FieldSelect
          label={t("class")}
          value={gearClass}
          onChange={setGearClass}
          options={GEAR_CLASSES.map((c) => ({ value: c, label: t(`classes.${c}` as "title") }))}
        />
        <FieldSelect<Tyre>
          label={t("tyre")}
          value={tyre}
          onChange={setTyre}
          options={[
            ...TYRE_IDS.map((id) => ({ value: id, label: t("tyreOption", { mm: id }) })),
            { value: "custom" as const, label: t("tyreCustom") },
          ]}
        />
        {tyre === "custom" && (
          <div className="flex flex-col gap-1 sm:col-span-2">
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
        <NumberField
          label={t("ring")}
          value={ring}
          onChange={setRing}
          min={20}
          max={60}
          suffix={t("teeth")}
        />
        <NumberField
          label={t("cog")}
          value={cog}
          onChange={setCog}
          min={9}
          max={52}
          suffix={t("teeth")}
        />
      </section>

      {valid ? (
        <GearingResult
          check={checkBike(ring, cog, circumference, limit)}
          limit={limit}
          className={className}
        />
      ) : (
        <p className="border-border bg-card rounded-xl border p-4 text-2sm">
          {t("result.invalid")}
        </p>
      )}

      {limit !== null && valid && (
        <RingTable limit={limit} circumference={circumference} className={className} />
      )}

      <GearProducts
        limit={valid ? limit : null}
        circumference={circumference}
        className={className}
      />
    </div>
  );
}
