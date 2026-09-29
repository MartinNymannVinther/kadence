import { afterEach, describe, expect, it, vi } from "vitest";
import { LinkError } from "@/components/rulle/bluetooth/gatt";
import { HeartRateLink } from "@/components/rulle/bluetooth/heart-rate-link";
import type { LinkState } from "@/components/rulle/bluetooth/reconnect";
import { TrainerLink, type SensorReading } from "@/components/rulle/bluetooth/trainer-link";
import { SERVICE } from "@/modules/rulle/ble/uuids";
import { FakeBluetooth, fakeStrap, fakeTrainer } from "./fake-bluetooth";

function listen() {
  const readings: SensorReading[] = [];
  const states: LinkState[] = [];
  return {
    readings,
    states,
    events: {
      onReading: (reading: SensorReading) => readings.push(reading),
      onState: (state: LinkState) => states.push(state),
    },
  };
}

/** Lets the trainer's answers, which come as microtasks, arrive. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.useRealTimers();
});

describe("a smart trainer (FTMS)", () => {
  it("is asked for by either service, and takes control on connecting", async () => {
    const trainer = fakeTrainer();
    const link = await TrainerLink.connect(trainer.bluetooth, listen().events);
    expect(trainer.bluetooth.asked?.filters).toEqual([
      { services: [SERVICE.fitnessMachine] },
      { services: [SERVICE.cyclingPower] },
    ]);
    expect(link.info).toEqual({ name: "KICKR CORE", erg: true, simulation: true });
    expect(trainer.controlPoint.written).toEqual([[0x00], [0x07]]);
  });

  it("holds each block's watts, once, and a flat road in a free block", async () => {
    const trainer = fakeTrainer();
    const link = await TrainerLink.connect(trainer.bluetooth, listen().events);
    await link.target(250);
    await link.target(250);
    await link.target(null);
    await link.target(180);
    expect(trainer.controlPoint.written.slice(2)).toEqual([
      [0x05, 0xfa, 0x00],
      [0x11, 0, 0, 0, 0, 40, 51],
      [0x05, 0xb4, 0x00],
    ]);
  });

  it("passes on what the trainer reports", async () => {
    const trainer = fakeTrainer();
    const { readings, events } = listen();
    await TrainerLink.connect(trainer.bluetooth, events);
    trainer.bikeData.notify([0x44, 0x00, 0xea, 0x0b, 0xb4, 0x00, 0xfa, 0x00]);
    expect(readings).toEqual([{ speedKmh: 30.5, cadence: 90, power: 250, heartRate: undefined }]);
  });

  it("takes control again when another app has taken it, and sets the watts again", async () => {
    const trainer = fakeTrainer();
    const link = await TrainerLink.connect(trainer.bluetooth, listen().events);
    await link.target(250);
    trainer.status.notify([0xff]);
    await settle();
    await settle();
    expect(trainer.controlPoint.written.slice(3)).toEqual([[0x00], [0x07], [0x05, 0xfa, 0x00]]);
  });

  it("connects again by itself after a drop, and sets the watts again", async () => {
    vi.useFakeTimers();
    const trainer = fakeTrainer();
    const { states, events } = listen();
    const link = await TrainerLink.connect(trainer.bluetooth, events);
    await link.target(250);
    trainer.device.gatt.refuse = 1;
    trainer.device.drop();
    await vi.advanceTimersByTimeAsync(600);
    expect(states).toEqual(["reconnecting"]);
    await vi.advanceTimersByTimeAsync(1_600);
    expect(states).toEqual(["reconnecting", "connected"]);
    expect(trainer.controlPoint.written.slice(3)).toEqual([[0x00], [0x07], [0x05, 0xfa, 0x00]]);
  });

  it("gives up after half a minute, and says so", async () => {
    vi.useFakeTimers();
    const trainer = fakeTrainer();
    const { states, events } = listen();
    await TrainerLink.connect(trainer.bluetooth, events);
    trainer.device.gatt.refuse = 100;
    trainer.device.drop();
    await vi.advanceTimersByTimeAsync(40_000);
    expect(states).toEqual(["reconnecting", "lost"]);
  });

  it("lets go of a trainer that can only hold watts in a free block, and takes it again after", async () => {
    const trainer = fakeTrainer({ simulation: false });
    const link = await TrainerLink.connect(trainer.bluetooth, listen().events);
    expect(link.info).toMatchObject({ erg: true, simulation: false });
    await link.target(250);
    await link.target(null);
    await link.target(200);
    expect(trainer.controlPoint.written.slice(2)).toEqual([
      [0x05, 0xfa, 0x00],
      [0x01],
      [0x00],
      [0x07],
      [0x05, 0xc8, 0x00],
    ]);
  });

  it("is read but not steered when it will not give control", async () => {
    const trainer = fakeTrainer({ controlAnswer: 0x05 });
    const link = await TrainerLink.connect(trainer.bluetooth, listen().events);
    expect(link.info).toMatchObject({ erg: false, simulation: false });
    await link.target(250);
    expect(trainer.controlPoint.written).toEqual([[0x00]]);
  });

  it("is let go at the end of the ride", async () => {
    const trainer = fakeTrainer();
    const link = await TrainerLink.connect(trainer.bluetooth, listen().events);
    await link.target(250);
    await link.release();
    expect(trainer.controlPoint.written.at(-1)).toEqual([0x01]);
  });
});

describe("a trainer or power meter that only measures (Cycling Power)", () => {
  it("is read, not steered: watts, and the cadence from the crank", async () => {
    const trainer = fakeTrainer({ ftms: false, cyclingPower: true });
    const { readings, events } = listen();
    const link = await TrainerLink.connect(trainer.bluetooth, events);
    expect(link.info).toMatchObject({ erg: false, simulation: false });
    trainer.power.notify([0x20, 0x00, 0xc8, 0x00, 0x64, 0x00, 0x00, 0x00]);
    trainer.power.notify([0x20, 0x00, 0xc8, 0x00, 0x65, 0x00, 0xab, 0x02]);
    expect(readings).toEqual([{ power: 200 }, { power: 200, cadence: 90 }]);
  });

  it("fills in only what the Fitness Machine data leaves out, on a trainer with both", async () => {
    const trainer = fakeTrainer({ cyclingPower: true });
    const { readings, events } = listen();
    await TrainerLink.connect(trainer.bluetooth, events);
    // Power but no cadence from FTMS; then Cycling Power with a crank.
    trainer.bikeData.notify([0x41, 0x00, 0xfa, 0x00]);
    trainer.power.notify([0x20, 0x00, 0xc8, 0x00, 0x64, 0x00, 0x00, 0x00]);
    trainer.power.notify([0x20, 0x00, 0xc8, 0x00, 0x65, 0x00, 0xab, 0x02]);
    expect(readings).toEqual([
      { power: 250, cadence: undefined, heartRate: undefined, speedKmh: undefined },
      { cadence: 90 },
    ]);
  });
});

describe("what can go wrong on connecting", () => {
  it("is the rider's no when the chooser is closed", async () => {
    const bluetooth = new FakeBluetooth(new DOMException("Cancelled", "NotFoundError"));
    await expect(TrainerLink.connect(bluetooth, listen().events)).rejects.toEqual(
      new LinkError("cancelled"),
    );
  });

  it("is a device that is no trainer", async () => {
    const { bluetooth } = fakeStrap();
    const error = await TrainerLink.connect(bluetooth, listen().events).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LinkError);
    expect((error as LinkError).code).toBe("no_service");
  });
});

describe("a heart-rate strap", () => {
  it("passes on the pulse", async () => {
    const strap = fakeStrap();
    const beats: number[] = [];
    const link = await HeartRateLink.connect(strap.bluetooth, {
      onHeartRate: (bpm) => beats.push(bpm),
      onState: () => {},
    });
    strap.measurement.notify([0x00, 0x48]);
    strap.measurement.notify([0x04, 0x48]);
    expect(beats).toEqual([72]);
    expect(link.name).toBe("TICKR");
  });
});
