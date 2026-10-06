import type { ControlResult } from "@/modules/rulle/ble/ftms";
import { OP } from "@/modules/rulle/ble/ftms";
import type { LinkState } from "./reconnect";

/**
 * A diagnostics log for Rulle's Bluetooth, kept only in memory and only
 * while `?ble=log` is on the URL (TECH-DEBT.md "Rulle has never met a
 * real trainer"; docs/rulle-proevetur.md is the checklist it is for).
 * Every line is built here, by `TrainerLink` and `HeartRateLink` calling
 * `logLine.*` and handing the result to a `BleLog`'s `add`; nothing is
 * sent anywhere, and the ring buffer forgets its oldest line once the
 * 501st arrives. The parsers themselves (`src/modules/rulle/ble`) are not
 * touched: this only reads what they already hand back.
 */

export const BLE_LOG_CAPACITY = 500;

export type BleDevice = "trainer" | "strap";

export type BleLogEntry = {
  /** Milliseconds since this log was opened. */
  atMs: number;
  line: string;
};

/** Where a log line goes: `BleLog.add`, or nowhere when diagnostics are off. */
export type BleLogSink = (line: string) => void;

/** A ring buffer of the last `BLE_LOG_CAPACITY` lines, each timestamped from when it was built. */
export class BleLog {
  private entries: readonly BleLogEntry[] = [];
  private readonly startedAtMs: number;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly now: () => number = () => Date.now()) {
    this.startedAtMs = this.now();
  }

  add(line: string): void {
    const next = [...this.entries, { atMs: this.now() - this.startedAtMs, line }];
    this.entries =
      next.length > BLE_LOG_CAPACITY ? next.slice(next.length - BLE_LOG_CAPACITY) : next;
    for (const listener of this.listeners) listener();
  }

  /** For `useSyncExternalStore`: the same array reference until the next `add`. */
  getSnapshot = (): readonly BleLogEntry[] => this.entries;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Every line so far, one per line, oldest first — what "Kopiér log" copies. */
  text(): string {
    return this.entries.map(formatEntry).join("\n");
  }
}

export function formatEntry(entry: BleLogEntry): string {
  return `[+${(entry.atMs / 1000).toFixed(3)}s] ${entry.line}`;
}

export function hexOfView(view: DataView): string {
  const out: string[] = [];
  for (let i = 0; i < view.byteLength; i++) out.push(byteHex(view.getUint8(i)));
  return out.join(" ");
}

export function hexOfBytes(bytes: Uint8Array): string {
  return Array.from(bytes, byteHex).join(" ");
}

function byteHex(byte: number): string {
  return byte.toString(16).padStart(2, "0");
}

const OP_NAMES = new Map<number, string>(Object.entries(OP).map(([name, code]) => [code, name]));

/** The Control Point op code's name (FTMS 4.16.1), or its hex when it is none Rulle sends. */
function opName(code: number): string {
  return OP_NAMES.get(code) ?? `0x${byteHex(code)}`;
}

const RESULT_NAMES: Record<ControlResult, string> = {
  success: "success",
  not_supported: "not supported",
  invalid_parameter: "invalid parameter",
  failed: "operation failed",
  not_permitted: "control not permitted",
  unknown: "unknown",
};

/** The result code, named as the FTMS spec names it (4.16.1); "timeout" is Rulle's own, for no answer at all. */
function resultName(result: ControlResult | "timeout"): string {
  return result === "timeout" ? "timeout" : RESULT_NAMES[result];
}

/** The lines `TrainerLink` and `HeartRateLink` hand to a `BleLog`, one call per kind of event. */
export const logLine = {
  connect(device: BleDevice, name: string): string {
    return `${device}: connected${name ? ` (${name})` : ""}`;
  },
  state(device: BleDevice, state: LinkState): string {
    return `${device}: ${state}`;
  },
  closed(device: BleDevice): string {
    return `${device}: closed`;
  },
  service(device: BleDevice, name: string): string {
    return `${device}: service found (${name})`;
  },
  characteristic(device: BleDevice, name: string): string {
    return `${device}: characteristic found (${name})`;
  },
  /** A notification or indication's raw bytes and what the parser read from them. */
  notify(device: BleDevice, label: string, view: DataView, parsed: unknown): string {
    return `${device}: notify ${label}  bytes=${hexOfView(view)}  ${JSON.stringify(parsed)}`;
  },
  write(bytes: Uint8Array): string {
    return `trainer: write control_point  op=${opName(bytes[0] ?? -1)}  bytes=${hexOfBytes(bytes)}`;
  },
  response(response: { opCode: number; result: ControlResult }, view: DataView): string {
    return (
      `trainer: control_point response  op=${opName(response.opCode)}` +
      `  result=${resultName(response.result)}  bytes=${hexOfView(view)}`
    );
  },
};
