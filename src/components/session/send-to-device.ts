"use client";

/**
 * Planned sessions onto a Garmin by cable (ADR 0031), the way Garmin's FIT
 * SDK documents it: a workout file put in the device's `Garmin/NewFiles`
 * folder is taken in when the device is ejected. Where the browser can
 * write to a folder the rider picks (the File System Access API, Chrome and
 * Edge on a computer, Chrome on Android), Kadence writes the files there
 * itself; elsewhere the rider downloads them and copies them over. Nothing
 * on the device is read or removed but the folder names on the way down.
 */

/** The part of the File System Access API used here; not in TypeScript's DOM library yet. */
export type Writable = { write(data: Uint8Array): Promise<void>; close(): Promise<void> };
export type DirectoryHandleLike = {
  kind: "directory";
  name: string;
  values(): AsyncIterable<{ kind: "file" | "directory"; name: string }>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandleLike>;
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<{ createWritable(): Promise<Writable> }>;
};
type PickerWindow = Window & {
  showDirectoryPicker?: (options: {
    id: string;
    mode: "readwrite";
  }) => Promise<DirectoryHandleLike>;
};

export type WorkoutFile = { name: string; bytes: Uint8Array };

/** The rider said no to the browser's question, or the browser may not ask. */
export class DeviceDenied extends Error {}

export function canWriteToDevice(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as PickerWindow).showDirectoryPicker === "function"
  );
}

async function childFolder(dir: DirectoryHandleLike, name: string) {
  for await (const entry of dir.values())
    if (entry.kind === "directory" && entry.name.toLowerCase() === name)
      return dir.getDirectoryHandle(entry.name);
  return null;
}

/**
 * The folder a Garmin takes new files from, from what the rider picked:
 * the drive (on a Mac a volume called GARMIN, with the Garmin folder
 * inside), the Garmin folder, or NewFiles itself. Null when it is none of
 * these. A Garmin folder without NewFiles gets one, as a person would make.
 */
export async function findNewFiles(
  picked: DirectoryHandleLike,
): Promise<DirectoryHandleLike | null> {
  const name = picked.name.toLowerCase();
  if (name === "newfiles") return picked;
  const garmin = (await childFolder(picked, "garmin")) ?? (name === "garmin" ? picked : null);
  if (!garmin) return null;
  return (
    (await childFolder(garmin, "newfiles")) ??
    garmin.getDirectoryHandle("NewFiles", { create: true })
  );
}

const refused = (error: unknown) =>
  error instanceof DOMException &&
  (error.name === "NotAllowedError" || error.name === "SecurityError");

/**
 * Asks for the device and answers with its NewFiles folder; null when the
 * rider closed the picker, "not_garmin" when what was picked is no Garmin.
 * The picker is the first thing a press does: the browser allows it only
 * while the press is fresh. The picker remembers where it was last, as
 * "Hent fra enheden"'s does.
 */
export async function pickNewFiles(): Promise<DirectoryHandleLike | "not_garmin" | null> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) return null;
  let picked: DirectoryHandleLike;
  try {
    picked = await picker.call(window, { id: "kadence-device", mode: "readwrite" });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    if (refused(error)) throw new DeviceDenied();
    throw error;
  }
  return (await findNewFiles(picked)) ?? "not_garmin";
}

/** Only names Kadence's own export gives: day, slug, ending. Anything else is not written to a device. */
const SAFE_NAME = /^[a-z0-9][a-z0-9.-]{0,120}\.fit$/;

/** A session's FIT workout from the export route, under the name the route gives it. */
export async function fetchWorkout(sessionId: string): Promise<WorkoutFile> {
  const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/export?format=fit`);
  if (!response.ok) throw new Error(`export ${response.status}`);
  const given = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1];
  const name =
    given && SAFE_NAME.test(given)
      ? given
      : `kadence-${sessionId.replace(/[^a-z0-9]/gi, "").slice(0, 40)}.fit`;
  return { name, bytes: new Uint8Array(await response.arrayBuffer()) };
}

export async function writeFiles(folder: DirectoryHandleLike, files: WorkoutFile[]): Promise<void> {
  for (const file of files) {
    try {
      const handle = await folder.getFileHandle(file.name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(file.bytes);
      await writable.close();
    } catch (error) {
      if (refused(error)) throw new DeviceDenied();
      throw error;
    }
  }
}
