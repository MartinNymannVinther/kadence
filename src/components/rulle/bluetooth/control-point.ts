import { parseControlResponse, type ControlResult } from "@/modules/rulle/ble/ftms";
import { logLine, type BleLogSink } from "./ble-log";
import { write, type GattCharacteristic } from "./gatt";

/**
 * The Fitness Machine Control Point, one command at a time: FTMS answers
 * each command before the next may be written, so a write waits for the
 * last answer (or its timeout) before it goes. Pulled out of
 * `TrainerLink` to keep that file under the line limit; diagnostics
 * (`onLog`, `?ble=log`) see every write and every indication here.
 */

const RESPONSE_TIMEOUT_MS = 2500;

export class ControlPointQueue {
  private point: GattCharacteristic | null = null;
  private pending: { opCode: number; answer: (result: ControlResult | "timeout") => void } | null =
    null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly onLog?: BleLogSink) {}

  /** The characteristic to write to; null once the device is gone or not yet found. */
  attach(point: GattCharacteristic | null): void {
    this.point = point;
  }

  /** The trainer's indication: settles the command it answers, if one is waiting for it. */
  onIndication(value: DataView): void {
    const response = parseControlResponse(value);
    if (!response) return;
    this.onLog?.(logLine.response(response, value));
    if (this.pending && response.opCode === this.pending.opCode)
      this.pending.answer(response.result);
  }

  /** One command, answered (or timed out) before the next is written. */
  send(bytes: Uint8Array): Promise<ControlResult | "timeout"> {
    const run = async (): Promise<ControlResult | "timeout"> => {
      const point = this.point;
      if (!point) return "failed";
      const answer = new Promise<ControlResult | "timeout">((resolve) => {
        const timer = setTimeout(() => settle("timeout"), RESPONSE_TIMEOUT_MS);
        const settle = (result: ControlResult | "timeout") => {
          clearTimeout(timer);
          if (this.pending?.answer === settle) this.pending = null;
          resolve(result);
        };
        this.pending = { opCode: bytes[0]!, answer: settle };
      });
      this.onLog?.(logLine.write(bytes));
      try {
        await write(point, bytes);
      } catch {
        this.pending?.answer("failed");
      }
      return answer;
    };
    const next = this.queue.then(run, run);
    this.queue = next;
    return next;
  }
}
