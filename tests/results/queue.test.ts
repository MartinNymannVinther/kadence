import { afterEach, describe, expect, it, vi } from "vitest";
import { enqueue, whenIdle } from "@/modules/results/queue";

/**
 * The line readings from Cykling Danmark wait in (ADR 0039): one at a
 * time, ten seconds between pages actually fetched, nobody in it twice,
 * and a failure never stops the riders behind it.
 */

afterEach(() => {
  vi.useRealTimers();
});

describe("the line of readings", () => {
  it("reads one at a time, ten seconds apart, and takes nobody twice", async () => {
    vi.useFakeTimers();
    const started: Array<[string, number]> = [];
    const t0 = Date.now();
    const job = (key: string) => async () => {
      started.push([key, Date.now() - t0]);
      return true;
    };
    enqueue("a", job("a"));
    enqueue("b", job("b"));
    enqueue("a", job("a again"));
    enqueue("c", job("c"));
    await vi.advanceTimersByTimeAsync(25_000);
    await whenIdle();
    expect(started).toEqual([
      ["a", 0],
      ["b", 10_000],
      ["c", 20_000],
    ]);
  });

  it("lets the next go at once when there was nothing to fetch", async () => {
    const order: string[] = [];
    enqueue("fresh", async () => {
      order.push("fresh");
      return false;
    });
    enqueue("next", async () => {
      order.push("next");
      return false;
    });
    await whenIdle();
    expect(order).toEqual(["fresh", "next"]);
  });

  it("goes on past a reading that fails, and takes the rider again later", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const order: string[] = [];
    enqueue("broken", async () => {
      throw new Error("down");
    });
    enqueue("after", async () => {
      order.push("after");
      return false;
    });
    await whenIdle();
    enqueue("broken", async () => {
      order.push("broken again");
      return false;
    });
    await whenIdle();
    expect(order).toEqual(["after", "broken again"]);
  });
});
