/**
 * The three words for friskhed, and the colours of the load chart's
 * three series, in one place so the chart, its tiles, the explainer and
 * the parents' sentence agree (ADR 0016, 0109).
 *
 * Kondition is moss and træthed clay — a lightness step apart, the pair
 * the theme made for charts — and friskhed has a hue of its own, the
 * theme's third series (blue), so the difference is never mistaken for
 * one of the two it is made from. Above zero the strip is tinted moss and
 * below zero clay, with the words beside: rested and tired.
 */

export const FITNESS_COLOUR = "var(--series-1)";
export const FATIGUE_COLOUR = "var(--series-2)";
export const FORM_COLOUR = "var(--series-3)";

/** Below this friskhed the rider is more than a training week's tired. Kadence's judgement. */
export const VERY_TIRED_BELOW = -15;

export type FormState = "rested" | "tired" | "veryTired";

/** The word for a day's friskhed: rested at or above zero, a little tired just under, tired further down. */
export function formState(form: number): FormState {
  if (form >= 0) return "rested";
  return form > VERY_TIRED_BELOW ? "tired" : "veryTired";
}
