import type {
  BluetoothDeviceLike,
  BluetoothLike,
  GattCharacteristic,
  GattServer,
  GattService,
  RequestDeviceOptions,
} from "@/components/rulle/bluetooth/gatt";
import { viewOf } from "@/modules/rulle/ble/bytes";
import { CHARACTERISTIC, SERVICE } from "@/modules/rulle/ble/uuids";

/**
 * A trainer and a strap made of Web Bluetooth's shapes, for the tests:
 * characteristics that are read, written and notify, a server that
 * connects and drops, and a trainer's Control Point that answers every
 * command the way FTMS says it does ([0x80, op code, result]).
 */

export class FakeCharacteristic extends EventTarget implements GattCharacteristic {
  value: DataView | null = null;
  notifying = false;
  readonly written: number[][] = [];

  constructor(
    private readonly options: { read?: () => number[]; onWrite?: (bytes: number[]) => void } = {},
  ) {
    super();
  }

  async readValue(): Promise<DataView> {
    return viewOf(this.options.read?.() ?? []);
  }

  async writeValueWithResponse(value: BufferSource): Promise<void> {
    const bytes = Array.from(new Uint8Array(value as ArrayBuffer));
    this.written.push(bytes);
    this.options.onWrite?.(bytes);
  }

  async startNotifications(): Promise<GattCharacteristic> {
    this.notifying = true;
    return this;
  }

  notify(bytes: number[]): void {
    if (!this.notifying) return;
    this.value = viewOf(bytes);
    this.dispatchEvent(new Event("characteristicvaluechanged"));
  }
}

class FakeServer implements GattServer {
  connected = false;
  /** Connections to refuse before the next one succeeds. */
  refuse = 0;

  constructor(private readonly services: Map<number, Map<number, FakeCharacteristic>>) {}

  async connect(): Promise<GattServer> {
    if (this.refuse > 0) {
      this.refuse--;
      throw new DOMException("Connection failed", "NetworkError");
    }
    this.connected = true;
    return this;
  }

  disconnect(): void {
    this.connected = false;
  }

  async getPrimaryService(id: number | string): Promise<GattService> {
    const characteristics = this.services.get(Number(id));
    if (!characteristics) throw new DOMException("No service", "NotFoundError");
    return {
      async getCharacteristic(cid: number | string) {
        const found = characteristics.get(Number(cid));
        if (!found) throw new DOMException("No characteristic", "NotFoundError");
        return found;
      },
    };
  }
}

export class FakeDevice extends EventTarget implements BluetoothDeviceLike {
  readonly gatt: FakeServer;

  constructor(
    readonly id: string,
    readonly name: string,
    services: Map<number, Map<number, FakeCharacteristic>>,
  ) {
    super();
    this.gatt = new FakeServer(services);
  }

  /** The radio drops the connection. */
  drop(): void {
    this.gatt.connected = false;
    this.dispatchEvent(new Event("gattserverdisconnected"));
  }
}

export class FakeBluetooth implements BluetoothLike {
  asked: RequestDeviceOptions | null = null;
  constructor(private readonly device: FakeDevice | Error) {}

  async requestDevice(options: RequestDeviceOptions): Promise<BluetoothDeviceLike> {
    this.asked = options;
    if (this.device instanceof Error) throw this.device;
    return this.device;
  }
}

export type TrainerOptions = {
  ftms?: boolean;
  cyclingPower?: boolean;
  erg?: boolean;
  simulation?: boolean;
  /** The result code the trainer answers a request for control with (1 is success). */
  controlAnswer?: number;
};

export function fakeTrainer(options: TrainerOptions = {}) {
  const { ftms = true, cyclingPower = false, erg = true, simulation = true } = options;
  const services = new Map<number, Map<number, FakeCharacteristic>>();
  const controlPoint = new FakeCharacteristic({
    onWrite: (bytes) => {
      const op = bytes[0]!;
      const result = op === 0x00 ? (options.controlAnswer ?? 0x01) : 0x01;
      queueMicrotask(() => controlPoint.notify([0x80, op, result]));
    },
  });
  const bikeData = new FakeCharacteristic();
  const status = new FakeCharacteristic();
  const power = new FakeCharacteristic();
  if (ftms) {
    const target = (erg ? 1 << 3 : 0) | (simulation ? 1 << 13 : 0);
    const features = [0x02, 0x44, 0x00, 0x00, target & 0xff, (target >> 8) & 0xff, 0x00, 0x00];
    services.set(
      SERVICE.fitnessMachine,
      new Map([
        [CHARACTERISTIC.fitnessMachineFeature, new FakeCharacteristic({ read: () => features })],
        [
          CHARACTERISTIC.supportedPowerRange,
          new FakeCharacteristic({ read: () => [0x00, 0x00, 0xd0, 0x07, 0x01, 0x00] }),
        ],
        [CHARACTERISTIC.indoorBikeData, bikeData],
        [CHARACTERISTIC.fitnessMachineControlPoint, controlPoint],
        [CHARACTERISTIC.fitnessMachineStatus, status],
      ]),
    );
  }
  if (cyclingPower)
    services.set(SERVICE.cyclingPower, new Map([[CHARACTERISTIC.cyclingPowerMeasurement, power]]));
  const device = new FakeDevice("trainer-1", "KICKR CORE", services);
  return { device, bluetooth: new FakeBluetooth(device), controlPoint, bikeData, status, power };
}

export function fakeStrap() {
  const measurement = new FakeCharacteristic();
  const device = new FakeDevice(
    "strap-1",
    "TICKR",
    new Map([[SERVICE.heartRate, new Map([[CHARACTERISTIC.heartRateMeasurement, measurement]])]]),
  );
  return { device, bluetooth: new FakeBluetooth(device), measurement };
}
