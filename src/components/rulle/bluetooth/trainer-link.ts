import { CrankCadence, parsePowerMeasurement } from "@/modules/rulle/ble/cycling-power";
import {
  control,
  parseFeatures,
  parseIndoorBikeData,
  parsePowerRange,
  parseStatus,
  type MachineFeatures,
  type PowerRange,
} from "@/modules/rulle/ble/ftms";
import { CHARACTERISTIC, SERVICE } from "@/modules/rulle/ble/uuids";
import { logLine, type BleLogSink } from "./ble-log";
import { ControlPointQueue } from "./control-point";
import {
  LinkError,
  linkErrorOf,
  optionalCharacteristic,
  optionalService,
  readOptional,
  subscribe,
  type BluetoothDeviceLike,
  type BluetoothLike,
  type GattService,
} from "./gatt";
import { keepConnected, type LinkState } from "./reconnect";

/**
 * The trainer, over Bluetooth. A smart trainer speaks the Fitness Machine
 * Service: Rulle takes control, sets the watts of each block (ERG) or the
 * road's grade where Rulle is not holding the watts (ADR 0107), and reads
 * the watts, cadence and — when the trainer passes one on — the pulse. A
 * trainer or power meter that only speaks Cycling Power is read and not
 * steered: the session is then ridden in free mode. A device with both is
 * steered through the one and read through whichever reports the watts.
 *
 * Every Control Point command waits for the trainer's answer before the
 * next is written (`ControlPointQueue`: one GATT operation at a time, and
 * FTMS answers each command in turn), and a command the trainer already
 * holds is not sent again. When the trainer says another app took
 * control, or the connection drops and comes back, control is taken
 * again and the last target set again.
 */

export type SensorReading = {
  power?: number;
  cadence?: number;
  heartRate?: number;
  speedKmh?: number;
};

export type TrainerEvents = {
  onReading: (reading: SensorReading, atMs: number) => void;
  onState: (state: LinkState) => void;
  /** Every connect, service, characteristic, notification and control write, with `?ble=log` only. */
  onLog?: BleLogSink;
};

export type TrainerInfo = {
  name: string;
  /** Holds the watts it is given: ERG. */
  erg: boolean;
  /** Rides a simulated road: the route's grade where Rulle is not holding the watts. */
  simulation: boolean;
};

/** A Fitness Machine reading this recent wins over the Cycling Power one. */
const FTMS_FRESH_MS = 3000;

export class TrainerLink {
  info: TrainerInfo;
  private closed = false;
  private features: MachineFeatures | null = null;
  private range: PowerRange | null = null;
  private readonly controlQueue: ControlPointQueue;
  private hasControl = false;
  /** Watts to hold, or null and the road's grade; undefined before anything was asked. */
  private wanted: { watts: number | null; grade: number } | undefined = undefined;
  private sent: string | null = null;
  private ftmsPowerAt = 0;
  private ftmsCadenceAt = 0;
  private readonly crank = new CrankCadence();
  private unsubscribe: (() => void)[] = [];

  private constructor(
    private readonly device: BluetoothDeviceLike,
    private readonly events: TrainerEvents,
  ) {
    this.info = { name: device.name?.trim() ?? "", erg: false, simulation: false };
    this.controlQueue = new ControlPointQueue(events.onLog);
    keepConnected(device, {
      setup: async () => {
        await this.setup();
        await this.apply();
      },
      onState: (state) => {
        events.onLog?.(logLine.state("trainer", state));
        events.onState(state);
      },
      isClosed: () => this.closed,
    });
  }

  /** Opens the browser's chooser; must be called from a press. */
  static async connect(bluetooth: BluetoothLike, events: TrainerEvents): Promise<TrainerLink> {
    let device: BluetoothDeviceLike;
    try {
      device = await bluetooth.requestDevice({
        filters: [{ services: [SERVICE.fitnessMachine] }, { services: [SERVICE.cyclingPower] }],
        optionalServices: [SERVICE.fitnessMachine, SERVICE.cyclingPower, SERVICE.heartRate],
      });
    } catch (error) {
      throw linkErrorOf(error);
    }
    return TrainerLink.open(device, events);
  }

  /** A device already chosen (or allowed on an earlier visit), set up for riding. */
  static async open(device: BluetoothDeviceLike, events: TrainerEvents): Promise<TrainerLink> {
    const link = new TrainerLink(device, events);
    try {
      await link.setup();
    } catch (error) {
      link.close();
      throw linkErrorOf(error);
    }
    return link;
  }

  get deviceId(): string {
    return this.device.id;
  }

  /** Watts to hold (ERG), or null and a road of `grade` (rise over run), ridden on the rider's own gears. */
  async target(watts: number | null, grade = 0): Promise<void> {
    this.wanted = { watts, grade };
    await this.apply();
  }

  /** The ride is over: the trainer is let go, back to its own resistance. */
  async release(): Promise<void> {
    this.wanted = undefined;
    if (this.hasControl) await this.controlQueue.send(control.reset());
    this.hasControl = false;
    this.sent = null;
  }

  close(): void {
    this.closed = true;
    this.events.onLog?.(logLine.closed("trainer"));
    for (const off of this.unsubscribe.splice(0)) off();
    if (this.device.gatt?.connected) this.device.gatt.disconnect();
  }

  private async setup(): Promise<void> {
    const gatt = this.device.gatt;
    if (!gatt) throw new LinkError("unsupported");
    const server = await gatt.connect();
    this.events.onLog?.(logLine.connect("trainer", this.device.name ?? ""));
    for (const off of this.unsubscribe.splice(0)) off();
    this.hasControl = false;
    this.sent = null;
    this.controlQueue.attach(null);
    const ftms = await optionalService(server, SERVICE.fitnessMachine);
    const power = await optionalService(server, SERVICE.cyclingPower);
    if (!ftms && !power) throw new LinkError("no_service");
    if (ftms) this.events.onLog?.(logLine.service("trainer", "fitness_machine"));
    if (power) this.events.onLog?.(logLine.service("trainer", "cycling_power"));
    if (ftms) await this.setupFitnessMachine(ftms);
    if (power) {
      const measurement = await optionalCharacteristic(
        power,
        CHARACTERISTIC.cyclingPowerMeasurement,
      );
      if (measurement) {
        this.events.onLog?.(logLine.characteristic("trainer", "cycling_power_measurement"));
        this.unsubscribe.push(await subscribe(measurement, (v) => this.onPower(v)));
      }
    }
  }

  private async setupFitnessMachine(service: GattService): Promise<void> {
    // What it can do, and how much it holds, are read if the trainer lets them be.
    const feature = await readOptional(service, CHARACTERISTIC.fitnessMachineFeature);
    this.features = feature ? parseFeatures(feature) : null;
    const range = await readOptional(service, CHARACTERISTIC.supportedPowerRange);
    this.range = range ? parsePowerRange(range) : null;
    const data = await optionalCharacteristic(service, CHARACTERISTIC.indoorBikeData);
    if (data) {
      this.events.onLog?.(logLine.characteristic("trainer", "indoor_bike_data"));
      this.unsubscribe.push(await subscribe(data, (v) => this.onBikeData(v)));
    }
    const status = await optionalCharacteristic(service, CHARACTERISTIC.fitnessMachineStatus);
    if (status) this.events.onLog?.(logLine.characteristic("trainer", "fitness_machine_status"));
    const off = status && (await subscribe(status, (v) => this.onStatus(v)).catch(() => null));
    if (off) this.unsubscribe.push(off);
    const point = await optionalCharacteristic(service, CHARACTERISTIC.fitnessMachineControlPoint);
    if (!point) return;
    this.events.onLog?.(logLine.characteristic("trainer", "fitness_machine_control_point"));
    this.unsubscribe.push(await subscribe(point, (v) => this.controlQueue.onIndication(v)));
    this.controlQueue.attach(point);
    // A trainer that does not say what it supports is asked anyway: it answers "not supported".
    const erg = this.features?.targetPower ?? true;
    const simulation = this.features?.simulation ?? false;
    if (!erg && !simulation) return;
    this.hasControl = await this.takeControl();
    this.info = {
      ...this.info,
      erg: this.hasControl && erg,
      simulation: this.hasControl && simulation,
    };
  }

  private async takeControl(): Promise<boolean> {
    if ((await this.controlQueue.send(control.requestControl())) !== "success") return false;
    // Some trainers want to be started before they take a target; any answer will do.
    await this.controlQueue.send(control.startOrResume());
    return true;
  }

  private async apply(): Promise<void> {
    const wanted = this.wanted;
    if (wanted === undefined || this.closed || !(this.info.erg || this.info.simulation)) return;
    if (!this.hasControl) {
      this.hasControl = await this.takeControl();
      if (!this.hasControl) return;
    }
    let bytes: Uint8Array;
    if (wanted.watts !== null && this.info.erg)
      bytes = control.setTargetPower(wanted.watts, this.range);
    else if (this.info.simulation) bytes = control.setSimulation(wanted.grade);
    else {
      // A trainer that can hold watts and nothing else: let go of it for the free block.
      await this.release();
      this.wanted = { watts: null, grade: 0 };
      return;
    }
    const key = bytes.join(",");
    if (key === this.sent) return;
    const result = await this.controlQueue.send(bytes);
    this.sent = result === "success" ? key : null;
    if (result === "not_permitted") this.hasControl = false;
  }

  private onStatus(value: DataView): void {
    if (parseStatus(value) !== "control_lost" || this.closed) return;
    this.hasControl = false;
    this.sent = null;
    void this.apply();
  }

  private onBikeData(value: DataView): void {
    const data = parseIndoorBikeData(value);
    this.events.onLog?.(logLine.notify("trainer", "indoor_bike_data", value, data));
    const now = Date.now();
    if (data.power !== undefined) this.ftmsPowerAt = now;
    if (data.cadence !== undefined) this.ftmsCadenceAt = now;
    this.events.onReading(
      {
        power: data.power,
        cadence: data.cadence,
        heartRate: data.heartRate,
        speedKmh: data.speedKmh,
      },
      now,
    );
  }

  /** Cycling Power fills in what the Fitness Machine data leaves out, and is all a plain trainer has. */
  private onPower(value: DataView): void {
    const measurement = parsePowerMeasurement(value);
    this.events.onLog?.(logLine.notify("trainer", "cycling_power_measurement", value, measurement));
    if (!measurement) return;
    const now = Date.now();
    const cadence = measurement.crank ? this.crank.update(measurement.crank, now) : null;
    const reading: SensorReading = {};
    if (now - this.ftmsPowerAt >= FTMS_FRESH_MS) reading.power = measurement.power;
    if (now - this.ftmsCadenceAt >= FTMS_FRESH_MS && cadence !== null) reading.cadence = cadence;
    if (reading.power !== undefined || reading.cadence !== undefined)
      this.events.onReading(reading, now);
  }
}
