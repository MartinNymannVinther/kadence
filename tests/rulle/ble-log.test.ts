import { describe, expect, it } from "vitest";
import {
  BLE_LOG_CAPACITY,
  BleLog,
  formatEntry,
  hexOfBytes,
  hexOfView,
  logLine,
} from "@/components/rulle/bluetooth/ble-log";
import { viewOf } from "@/modules/rulle/ble/bytes";

/**
 * Rulle's Bluetooth diagnostics (`?ble=log`, TECH-DEBT.md "Rulle has
 * never met a real trainer"): a ring buffer that forgets its oldest line,
 * timestamped from when it opened, and the lines `TrainerLink` and
 * `HeartRateLink` build for it. Pure: no DOM, no Bluetooth.
 */

describe("BleLog", () => {
  it("times each line from when the log was opened, not from the epoch", () => {
    // The constructor reads the clock once, for its own start; each `add` reads it again.
    const times = [1_000, 1_000, 10_000];
    let i = 0;
    const log = new BleLog(() => times[i++]!);
    log.add("trainer: connected (KICKR CORE)");
    log.add("trainer: notify indoor_bike_data  bytes=44 00  {}");
    expect(log.getSnapshot()).toEqual([
      { atMs: 0, line: "trainer: connected (KICKR CORE)" },
      { atMs: 9_000, line: "trainer: notify indoor_bike_data  bytes=44 00  {}" },
    ]);
  });

  it("keeps only the last BLE_LOG_CAPACITY lines, oldest first to go", () => {
    const log = new BleLog(() => 0);
    for (let n = 0; n < BLE_LOG_CAPACITY + 10; n++) log.add(`line ${n}`);
    const entries = log.getSnapshot();
    expect(entries).toHaveLength(BLE_LOG_CAPACITY);
    expect(entries[0]!.line).toBe("line 10");
    expect(entries.at(-1)!.line).toBe(`line ${BLE_LOG_CAPACITY + 9}`);
  });

  it("gives a new snapshot reference on every add, for useSyncExternalStore", () => {
    const log = new BleLog(() => 0);
    const before = log.getSnapshot();
    log.add("one");
    const after = log.getSnapshot();
    expect(after).not.toBe(before);
    expect(log.getSnapshot()).toBe(after);
  });

  it("tells its subscribers on every add, until they unsubscribe", () => {
    const log = new BleLog(() => 0);
    let calls = 0;
    const off = log.subscribe(() => calls++);
    log.add("one");
    log.add("two");
    off();
    log.add("three");
    expect(calls).toBe(2);
  });

  it('joins every line, oldest first, as plain text — what "Kopiér log" copies', () => {
    const times = [0, 0, 1_500];
    let i = 0;
    const log = new BleLog(() => times[i++]!);
    log.add("trainer: connected (KICKR CORE)");
    log.add("strap: connected (TICKR)");
    expect(log.text()).toBe(
      "[+0.000s] trainer: connected (KICKR CORE)\n[+1.500s] strap: connected (TICKR)",
    );
  });

  it("formats a single entry the same way text() does", () => {
    expect(formatEntry({ atMs: 12_345, line: "trainer: lost" })).toBe("[+12.345s] trainer: lost");
  });
});

describe("hex formatting", () => {
  it("reads every byte of a DataView as lowercase hex, space-separated", () => {
    expect(hexOfView(viewOf([0x00, 0x2a, 0xff]))).toBe("00 2a ff");
    expect(hexOfView(viewOf([]))).toBe("");
  });

  it("does the same for a plain Uint8Array of bytes written to the device", () => {
    expect(hexOfBytes(Uint8Array.of(0x05, 0xfa, 0x00))).toBe("05 fa 00");
  });
});

describe("logLine", () => {
  it("names a connect, a state change and a close, per device", () => {
    expect(logLine.connect("trainer", "KICKR CORE")).toBe("trainer: connected (KICKR CORE)");
    expect(logLine.connect("strap", "")).toBe("strap: connected");
    expect(logLine.state("trainer", "reconnecting")).toBe("trainer: reconnecting");
    expect(logLine.state("strap", "lost")).toBe("strap: lost");
    expect(logLine.closed("trainer")).toBe("trainer: closed");
  });

  it("names a service and a characteristic found", () => {
    expect(logLine.service("trainer", "fitness_machine")).toBe(
      "trainer: service found (fitness_machine)",
    );
    expect(logLine.characteristic("strap", "heart_rate_measurement")).toBe(
      "strap: characteristic found (heart_rate_measurement)",
    );
  });

  it("carries a notification's raw bytes and what the parser read from them", () => {
    const view = viewOf([0x44, 0x00, 0xea, 0x0b, 0xb4, 0x00, 0xfa, 0x00]);
    const line = logLine.notify("trainer", "indoor_bike_data", view, {
      speedKmh: 30.5,
      cadence: 90,
      power: 250,
    });
    expect(line).toBe(
      'trainer: notify indoor_bike_data  bytes=44 00 ea 0b b4 00 fa 00  {"speedKmh":30.5,"cadence":90,"power":250}',
    );
  });

  it("names a control point write by its op code", () => {
    expect(logLine.write(Uint8Array.of(0x05, 0xfa, 0x00))).toBe(
      "trainer: write control_point  op=setTargetPower  bytes=05 fa 00",
    );
    expect(logLine.write(Uint8Array.of(0x00))).toBe(
      "trainer: write control_point  op=requestControl  bytes=00",
    );
  });

  it("falls back to hex for a write with no name in the op table", () => {
    expect(logLine.write(Uint8Array.of(0x42))).toBe(
      "trainer: write control_point  op=0x42  bytes=42",
    );
  });

  it("names the result code as the FTMS spec names it", () => {
    const view = viewOf([0x80, 0x05, 0x01]);
    expect(logLine.response({ opCode: 0x05, result: "success" }, view)).toBe(
      "trainer: control_point response  op=setTargetPower  result=success  bytes=80 05 01",
    );
    expect(logLine.response({ opCode: 0x00, result: "not_supported" }, view)).toBe(
      "trainer: control_point response  op=requestControl  result=not supported  bytes=80 05 01",
    );
    expect(
      logLine.response({ opCode: 0x00, result: "invalid_parameter" }, view).split("result=")[1],
    ).toBe("invalid parameter  bytes=80 05 01");
    expect(logLine.response({ opCode: 0x00, result: "failed" }, view).split("result=")[1]).toBe(
      "operation failed  bytes=80 05 01",
    );
    expect(
      logLine.response({ opCode: 0x00, result: "not_permitted" }, view).split("result=")[1],
    ).toBe("control not permitted  bytes=80 05 01");
    expect(logLine.response({ opCode: 0x00, result: "unknown" }, view).split("result=")[1]).toBe(
      "unknown  bytes=80 05 01",
    );
  });
});
