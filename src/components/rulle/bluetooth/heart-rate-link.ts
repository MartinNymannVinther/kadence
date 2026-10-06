import { parseHeartRate } from "@/modules/rulle/ble/heart-rate";
import { CHARACTERISTIC, SERVICE } from "@/modules/rulle/ble/uuids";
import { logLine, type BleLogSink } from "./ble-log";
import {
  LinkError,
  linkErrorOf,
  optionalCharacteristic,
  optionalService,
  subscribe,
  type BluetoothDeviceLike,
  type BluetoothLike,
} from "./gatt";
import { keepConnected, type LinkState } from "./reconnect";

export type HeartRateEvents = {
  onHeartRate: (bpm: number, atMs: number) => void;
  onState: (state: LinkState) => void;
  /** Every connect, service, characteristic and notification, with `?ble=log` only. */
  onLog?: BleLogSink;
};

/**
 * A heart-rate strap or a watch that broadcasts its pulse, for the rider
 * whose trainer does not pass one on. Read only; connected again by
 * itself when it drops, like the trainer.
 */
export class HeartRateLink {
  private closed = false;
  private unsubscribe: (() => void)[] = [];
  readonly name: string;

  private constructor(
    private readonly device: BluetoothDeviceLike,
    private readonly events: HeartRateEvents,
  ) {
    this.name = device.name?.trim() ?? "";
    keepConnected(device, {
      setup: () => this.setup(),
      onState: (state) => {
        events.onLog?.(logLine.state("strap", state));
        events.onState(state);
      },
      isClosed: () => this.closed,
    });
  }

  /** Opens the browser's chooser; must be called from a press. */
  static async connect(bluetooth: BluetoothLike, events: HeartRateEvents): Promise<HeartRateLink> {
    let device: BluetoothDeviceLike;
    try {
      device = await bluetooth.requestDevice({ filters: [{ services: [SERVICE.heartRate] }] });
    } catch (error) {
      throw linkErrorOf(error);
    }
    const link = new HeartRateLink(device, events);
    try {
      await link.setup();
    } catch (error) {
      link.close();
      throw linkErrorOf(error);
    }
    return link;
  }

  close(): void {
    this.closed = true;
    this.events.onLog?.(logLine.closed("strap"));
    for (const off of this.unsubscribe.splice(0)) off();
    if (this.device.gatt?.connected) this.device.gatt.disconnect();
  }

  private async setup(): Promise<void> {
    const gatt = this.device.gatt;
    if (!gatt) throw new LinkError("unsupported");
    const server = await gatt.connect();
    this.events.onLog?.(logLine.connect("strap", this.name));
    for (const off of this.unsubscribe.splice(0)) off();
    const service = await optionalService(server, SERVICE.heartRate);
    if (service) this.events.onLog?.(logLine.service("strap", "heart_rate"));
    const measurement =
      service && (await optionalCharacteristic(service, CHARACTERISTIC.heartRateMeasurement));
    if (!measurement) throw new LinkError("no_service");
    this.events.onLog?.(logLine.characteristic("strap", "heart_rate_measurement"));
    this.unsubscribe.push(
      await subscribe(measurement, (value) => {
        const bpm = parseHeartRate(value);
        this.events.onLog?.(logLine.notify("strap", "heart_rate_measurement", value, { bpm }));
        if (bpm !== null) this.events.onHeartRate(bpm, Date.now());
      }),
    );
  }
}
