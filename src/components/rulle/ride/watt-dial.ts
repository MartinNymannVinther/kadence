import { PHYSICS, resistance } from "@/modules/rulle/physics";

/**
 * The WATT cheat code's dial (ADR 0048): the watts the avatar rides at,
 * set in watts or in watts per kilo of an avatar whose weight is chosen
 * on the screen — the avatar's, never the rider's, and kept nowhere but
 * here for as long as the ride lasts. A key or a button pressed is one
 * step; held, it steps on after a moment, the way a held key types. No
 * React and no browser in it.
 */

export type WattUnit = "w" | "wkg";

/** What the panel's buttons do: a step either way, the unit, the avatar's weight. */
export type WattTune = "more" | "less" | "unit" | "heavier" | "lighter";

export const WATT_DIAL = {
  /** The most and the least it rides at, W. */
  most: 1500,
  least: 0,
  /** Where it starts when the speed it takes over from is held by less. */
  floor: 100,
  /** One step of the keys and the buttons: 5 W, or 0.1 W/kg. */
  step: { w: 5, wkg: 0.1 },
  /** Seconds a key is held before it steps on, and between the steps after. */
  delay: 0.4,
  every: 0.1,
  /** The avatar's weight, kg: where it starts, and how light and how heavy it may be. */
  kg: { start: 70, least: 30, most: 120 },
} as const;

const clamp = (value: number, least: number, most: number) =>
  Math.max(least, Math.min(most, value));

export class WattDial {
  watts = 200;
  kg: number = WATT_DIAL.kg.start;
  unit: WattUnit = "w";
  private push: -1 | 0 | 1 = 0;
  private heldFor = 0;

  /** Watts per kilo of the avatar. */
  get wkg(): number {
    return this.watts / this.kg;
  }

  /** Rider and bike, kg: what the physics pushes. */
  get massKg(): number {
    return this.kg + PHYSICS.bikeKg;
  }

  /** Takes over from a bike going `speed` on `grade`: the watts that hold that speed, on the step. */
  startFrom(speed: number, grade: number): void {
    const holding = speed * resistance(speed, grade, this.massKg);
    const step = WATT_DIAL.step.w;
    this.watts = clamp(Math.round(holding / step) * step, WATT_DIAL.floor, WATT_DIAL.most);
    this.push = 0;
  }

  /** One step up (1) or down (-1), in the unit shown, landing on that unit's round numbers. */
  step(direction: -1 | 1): void {
    if (this.unit === "w") {
      const step = WATT_DIAL.step.w;
      this.watts = clamp(
        (Math.round(this.watts / step) + direction) * step,
        WATT_DIAL.least,
        WATT_DIAL.most,
      );
      return;
    }
    const step = WATT_DIAL.step.wkg;
    const wkg = (Math.round(this.wkg / step) + direction) * step;
    this.watts = clamp(wkg * this.kg, WATT_DIAL.least, WATT_DIAL.most);
  }

  /** The key held up, down or let go: the first step at once, the rest from `advance`. */
  hold(push: -1 | 0 | 1): void {
    if (push === this.push) return;
    this.push = push;
    this.heldFor = 0;
    if (push !== 0) this.step(push);
  }

  /** `seconds` more with the key held: the steps that fall due. */
  advance(seconds: number): void {
    if (this.push === 0) return;
    // A hair over, so tenths of a second added up land on the step they make, not just short of it.
    const due = (held: number) =>
      held < WATT_DIAL.delay - 1e-9
        ? 0
        : Math.floor((held - WATT_DIAL.delay) / WATT_DIAL.every + 1e-9) + 1;
    const before = due(this.heldFor);
    this.heldFor += seconds;
    for (let n = due(this.heldFor) - before; n > 0; n--) this.step(this.push);
  }

  /** Watts or watts per kilo: the watts stay what they are. */
  toggleUnit(): void {
    this.unit = this.unit === "w" ? "wkg" : "w";
  }

  /**
   * The avatar a kilo heavier (1) or lighter (-1). In watts per kilo the
   * W/kg is what was chosen, so the watts follow the weight; in watts they
   * stay.
   */
  weigh(direction: -1 | 1): void {
    const wkg = this.wkg;
    this.kg = clamp(this.kg + direction, WATT_DIAL.kg.least, WATT_DIAL.kg.most);
    if (this.unit === "wkg") this.watts = clamp(wkg * this.kg, WATT_DIAL.least, WATT_DIAL.most);
  }
}
