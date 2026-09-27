import type { BikeStructure, Repeat, Step } from "@/modules/workouts/structure";
import { cadenceOf, powerPct } from "./targets";

/**
 * A session as a Zwift workout (.zwo), which TrainerRoad, MyWhoosh, Rouvy
 * and most trainer apps read as well:
 *
 *     <workout_file>
 *       <author>Kadence</author>
 *       <name>…</name>
 *       <description>…</description>
 *       <sportType>bike</sportType>
 *       <workout>
 *         <Warmup Duration="600" PowerLow="0.655" PowerHigh="0.655"/>
 *         <IntervalsT Repeat="3" OnDuration="600" OffDuration="300" OnPower="0.98" OffPower="0.275"/>
 *         <SteadyState Duration="300" Power="0.83"/>
 *         <FreeRide Duration="600"/>
 *         <Cooldown Duration="600" PowerLow="0.655" PowerHigh="0.655"/>
 *       </workout>
 *     </workout_file>
 *
 * Power is a fraction of FTP (`targets.ts` says how each target becomes
 * one). A warmup or cooldown is flat — PowerLow equals PowerHigh — because
 * a Kadence step has one target, not a ramp. A step without power (RPE or
 * open) is a FreeRide: the trainer leaves ERG mode and the rider rides by
 * feel. A repeat of exactly one on/off pair is an IntervalsT; any other
 * repeat is written out step by step. A step's label shows as a text
 * message when it starts.
 */

export function toZwo(structure: BikeStructure, name: string, description = ""): string {
  const elements: string[] = [];
  for (const item of structure.steps) {
    if (item.kind === "step") elements.push(...stepElement(item));
    else elements.push(...repeatElements(item));
  }
  return [
    "<workout_file>",
    "  <author>Kadence</author>",
    `  <name>${xml(name)}</name>`,
    `  <description>${xml(description)}</description>`,
    "  <sportType>bike</sportType>",
    "  <workout>",
    ...elements.map((line) => `    ${line}`),
    "  </workout>",
    "</workout_file>",
    "",
  ].join("\n");
}

function stepElement(step: Step): string[] {
  const pct = powerPct(step.target);
  const cadence = cadenceOf(step);
  const attributes: [string, string | number][] = [["Duration", step.seconds]];

  let tag: string;
  if (pct === null) tag = "FreeRide";
  else if (step.intent === "warmup" || step.intent === "cooldown") {
    tag = step.intent === "warmup" ? "Warmup" : "Cooldown";
    attributes.push(["PowerLow", fraction(pct)], ["PowerHigh", fraction(pct)]);
  } else {
    tag = "SteadyState";
    attributes.push(["Power", fraction(pct)]);
  }
  if (cadence !== null) attributes.push(["Cadence", cadence]);
  return element(tag, attributes, step.label);
}

function repeatElements(repeat: Repeat): string[] {
  const [on, off] = repeat.steps;
  const onPct = on ? powerPct(on.target) : null;
  const offPct = off ? powerPct(off.target) : null;
  if (
    repeat.times < 2 ||
    repeat.steps.length !== 2 ||
    !on ||
    !off ||
    onPct === null ||
    offPct === null
  ) {
    const once = repeat.steps.flatMap(stepElement);
    return Array.from({ length: repeat.times }, () => once).flat();
  }

  const attributes: [string, string | number][] = [
    ["Repeat", repeat.times],
    ["OnDuration", on.seconds],
    ["OffDuration", off.seconds],
    ["OnPower", fraction(onPct)],
    ["OffPower", fraction(offPct)],
  ];
  const onCadence = cadenceOf(on);
  const offCadence = cadenceOf(off);
  if (onCadence !== null) attributes.push(["Cadence", onCadence]);
  if (offCadence !== null) attributes.push(["CadenceResting", offCadence]);
  return element("IntervalsT", attributes, on.label);
}

function element(tag: string, attributes: [string, string | number][], label?: string): string[] {
  const attrs = attributes.map(([key, value]) => `${key}="${xml(String(value))}"`).join(" ");
  if (!label?.trim()) return [`<${tag} ${attrs}/>`];
  return [
    `<${tag} ${attrs}>`,
    `  <textevent timeoffset="0" message="${xml(label.trim())}"/>`,
    `</${tag}>`,
  ];
}

/** Percent of FTP as Zwift's fraction, at most three decimals. */
function fraction(pct: number): string {
  return String(Math.round(pct * 10) / 1000);
}

/**
 * Text as XML character data or an attribute value: the five special
 * characters escaped, and the control characters XML 1.0 forbids removed.
 */
export function xml(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
