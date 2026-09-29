import { sleep, type BluetoothDeviceLike } from "./gatt";

/**
 * A trainer or a strap that drops out mid-ride — a phone call on the
 * same radio, a cable kicked, the trainer's own hiccup — is connected
 * again without the rider doing anything: at once, then after a few
 * seconds, then less often, for about half a minute. After that the page
 * asks for a press, because only a press may open the browser's chooser.
 * The ride goes on meanwhile; it is only the readings that pause.
 */

export type LinkState = "connected" | "reconnecting" | "lost";

export const RECONNECT_DELAYS_MS = [500, 1500, 3000, 6000, 8000, 10_000] as const;

export function keepConnected(
  device: BluetoothDeviceLike,
  options: {
    setup: () => Promise<void>;
    onState: (state: LinkState) => void;
    isClosed: () => boolean;
    delays?: readonly number[];
  },
): void {
  let busy = false;
  device.addEventListener("gattserverdisconnected", () => {
    if (busy || options.isClosed()) return;
    busy = true;
    options.onState("reconnecting");
    void (async () => {
      try {
        for (const delay of options.delays ?? RECONNECT_DELAYS_MS) {
          await sleep(delay);
          if (options.isClosed()) return;
          try {
            await options.setup();
            options.onState("connected");
            return;
          } catch {
            // Not back yet; the next delay is longer.
          }
        }
        options.onState("lost");
      } finally {
        busy = false;
      }
    })();
  });
}
