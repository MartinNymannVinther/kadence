/**
 * The part of Web Bluetooth Rulle uses, typed here rather than taken from
 * a package: TypeScript's DOM library does not carry Web Bluetooth, and
 * the dozen members below are all Rulle touches. Chrome and Edge on a
 * computer and on Android have it; Safari and Firefox do not, and the
 * page says so instead of offering a button that cannot work. It needs a
 * secure context (https, or localhost while developing), and the
 * Permissions-Policy names `bluetooth=(self)` (next.config.ts).
 */

export type BluetoothId = number | string;

export interface GattCharacteristic extends EventTarget {
  readonly value?: DataView | null;
  readValue(): Promise<DataView>;
  writeValue?(value: BufferSource): Promise<void>;
  writeValueWithResponse?(value: BufferSource): Promise<void>;
  startNotifications(): Promise<GattCharacteristic>;
}

export interface GattService {
  getCharacteristic(id: BluetoothId): Promise<GattCharacteristic>;
}

export interface GattServer {
  readonly connected: boolean;
  connect(): Promise<GattServer>;
  disconnect(): void;
  getPrimaryService(id: BluetoothId): Promise<GattService>;
}

export interface BluetoothDeviceLike extends EventTarget {
  readonly id: string;
  readonly name?: string;
  readonly gatt?: GattServer;
}

export interface RequestDeviceOptions {
  filters: { services: BluetoothId[] }[];
  optionalServices?: BluetoothId[];
}

export interface BluetoothLike {
  getAvailability?(): Promise<boolean>;
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDeviceLike>;
  /** Devices this site was allowed before; not every Chrome has it. */
  getDevices?(): Promise<BluetoothDeviceLike[]>;
}

/** The browser's Bluetooth, or null where there is none to be had. */
export function browserBluetooth(): BluetoothLike | null {
  if (typeof navigator === "undefined" || typeof window === "undefined") return null;
  if (!window.isSecureContext) return null;
  const bluetooth = (navigator as Navigator & { bluetooth?: BluetoothLike }).bluetooth;
  return bluetooth ?? null;
}

/** Why connecting failed, in the words the page has for it. */
export type LinkErrorCode = "cancelled" | "unsupported" | "no_service" | "failed";

export class LinkError extends Error {
  constructor(readonly code: LinkErrorCode) {
    super(code);
    this.name = "LinkError";
  }
}

/** The chooser closed without a device is the rider's no, not a failure. */
export function linkErrorOf(error: unknown): LinkError {
  if (error instanceof LinkError) return error;
  // A DOMException, which is not an Error in every browser.
  const name =
    typeof error === "object" && error !== null && "name" in error ? String(error.name) : "";
  if (name === "NotFoundError" || name === "AbortError") return new LinkError("cancelled");
  if (name === "SecurityError" || name === "NotSupportedError") return new LinkError("unsupported");
  return new LinkError("failed");
}

/** A service the device may not have: null rather than an error. */
export async function optionalService(server: GattServer, id: BluetoothId) {
  try {
    return await server.getPrimaryService(id);
  } catch {
    return null;
  }
}

export async function optionalCharacteristic(service: GattService, id: BluetoothId) {
  try {
    return await service.getCharacteristic(id);
  } catch {
    return null;
  }
}

/** A characteristic's value if the device has it and lets it be read, else null. */
export async function readOptional(service: GattService, id: BluetoothId) {
  const characteristic = await optionalCharacteristic(service, id);
  return characteristic ? characteristic.readValue().catch(() => null) : null;
}

/** Every value the characteristic notifies or indicates, handed to `onValue`. */
export async function subscribe(
  characteristic: GattCharacteristic,
  onValue: (value: DataView) => void,
): Promise<() => void> {
  const listener = (event: Event) => {
    const value = (event.target as GattCharacteristic | null)?.value;
    if (value) onValue(value);
  };
  characteristic.addEventListener("characteristicvaluechanged", listener);
  await characteristic.startNotifications();
  return () => characteristic.removeEventListener("characteristicvaluechanged", listener);
}

/** A write the device acknowledges, where the browser can ask for that. */
export async function write(characteristic: GattCharacteristic, bytes: Uint8Array): Promise<void> {
  const data = bytes.slice().buffer;
  if (characteristic.writeValueWithResponse) await characteristic.writeValueWithResponse(data);
  else if (characteristic.writeValue) await characteristic.writeValue(data);
  else throw new LinkError("failed");
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
