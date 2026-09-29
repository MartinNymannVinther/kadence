"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  browserBluetooth,
  linkErrorOf,
  type BluetoothLike,
  type LinkErrorCode,
} from "./bluetooth/gatt";
import { HeartRateLink } from "./bluetooth/heart-rate-link";
import type { LinkState } from "./bluetooth/reconnect";
import { TrainerLink, type TrainerInfo } from "./bluetooth/trainer-link";
import type { Sensors } from "./ride/sensors";

/**
 * The trainer and the strap, as the page knows them: connected at a press
 * (the browser's chooser needs one), their readings handed to `sensors`,
 * their state — connected, finding their way back, lost — for the screen,
 * and let go when the page is left. Whether this browser has Bluetooth at
 * all is known only after the page has mounted.
 */

export type TrainerState = { link: TrainerLink; info: TrainerInfo; state: LinkState };
export type StrapState = { link: HeartRateLink; state: LinkState };

// The browser's Bluetooth does not come and go while the page is open.
const unchanging = () => () => {};
const serverBluetooth = () => undefined;

export function useDevices(sensors: Sensors) {
  const bluetooth: BluetoothLike | null | undefined = useSyncExternalStore(
    unchanging,
    browserBluetooth,
    serverBluetooth,
  );
  const [trainer, setTrainer] = useState<TrainerState | null>(null);
  const [strap, setStrap] = useState<StrapState | null>(null);
  const [busy, setBusy] = useState<"trainer" | "strap" | null>(null);
  const [error, setError] = useState<LinkErrorCode | null>(null);
  const links = useRef<{ trainer: TrainerLink | null; strap: HeartRateLink | null }>({
    trainer: null,
    strap: null,
  });

  useEffect(() => {
    const current = links.current;
    return () => {
      current.trainer?.close();
      current.strap?.close();
    };
  }, []);

  const connectTrainer = useCallback(async () => {
    if (!bluetooth || busy) return;
    setBusy("trainer");
    setError(null);
    try {
      const link = await TrainerLink.connect(bluetooth, {
        onReading: (reading, at) => sensors.fromTrainer(reading, at),
        onState: (state) => setTrainer((t) => (t && t.link === link ? { ...t, state } : t)),
      });
      links.current.trainer?.close();
      links.current.trainer = link;
      setTrainer({ link, info: link.info, state: "connected" });
    } catch (e) {
      const code = linkErrorOf(e).code;
      if (code !== "cancelled") setError(code);
    } finally {
      setBusy(null);
    }
  }, [bluetooth, busy, sensors]);

  const connectStrap = useCallback(async () => {
    if (!bluetooth || busy) return;
    setBusy("strap");
    setError(null);
    try {
      const link = await HeartRateLink.connect(bluetooth, {
        onHeartRate: (bpm, at) => sensors.fromStrap(bpm, at),
        onState: (state) => setStrap((s) => (s && s.link === link ? { ...s, state } : s)),
      });
      links.current.strap?.close();
      links.current.strap = link;
      setStrap({ link, state: "connected" });
    } catch (e) {
      const code = linkErrorOf(e).code;
      if (code !== "cancelled") setError(code);
    } finally {
      setBusy(null);
    }
  }, [bluetooth, busy, sensors]);

  return {
    /** Undefined until the page knows; null where the browser has none. */
    bluetooth,
    trainer,
    strap,
    busy,
    error,
    connectTrainer,
    connectStrap,
  };
}

export type Devices = ReturnType<typeof useDevices>;
