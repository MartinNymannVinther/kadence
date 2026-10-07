import { PROVIDER_IDS, type ProviderId } from "./providers";

/**
 * Where a provider's company sits, so the devices page can name only the
 * providers this installation actually has keys for (ADR 0057), instead
 * of a fixed sentence about Wahoo, Garmin and Polar whenever any one of
 * them is on the page.
 *
 * Wahoo and Garmin are American; Polar is Finnish, inside the EU.
 */
const US: readonly ProviderId[] = ["wahoo", "garmin"];
const EU: readonly ProviderId[] = ["polar"];

export type ProviderOrigin = {
  /** The configured providers whose company is American, in PROVIDER_IDS order. */
  us: ProviderId[];
  /** The configured providers whose company is inside the EU. */
  eu: ProviderId[];
};

/** Splits the installation's configured providers by where their company is. */
export function providerOrigin(configured: readonly ProviderId[]): ProviderOrigin {
  const order = (ids: readonly ProviderId[]) =>
    PROVIDER_IDS.filter((id) => ids.includes(id) && configured.includes(id));
  return { us: order(US), eu: order(EU) };
}
