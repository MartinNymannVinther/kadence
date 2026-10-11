import { eq } from "drizzle-orm";
import { appPool } from "@/core/db/client";
import { fileTombstones } from "@/core/db/schema";
import type { AppTransaction } from "@/core/db/tenant";
import { fileStorage, type FileLocation } from "@/core/files/storage";
import { errorName, log } from "@/core/log";

/**
 * Putting a file where the installation keeps files, so that a row and
 * its object never part (docs/adr/0087). The database cannot write to an
 * object store in a transaction, so the order is:
 *
 *  1. `placeFile` writes the key to `file_tombstones` on its own
 *     connection (committed at once), then uploads the object. If the
 *     transaction that follows never commits, the tombstone stands and
 *     the job `files.tombstones` deletes the object a few minutes later.
 *  2. The caller inserts the row and calls `keepPlaced` in the same
 *     transaction, which deletes the tombstone: the row and the object
 *     now stand together, or neither does.
 *  3. If the insert fails, `discardPlaced` deletes the object at once
 *     (and the tombstone stays as the net under it).
 *
 * In `db` mode the file is the row's own bytes and all three are plain.
 */

export type Placed = FileLocation & { key: string; size: number };

/** The tombstone written before an upload, on its own connection so it outlives a rollback. */
export async function reserveKey(key: string): Promise<void> {
  await appPool.query(
    `insert into file_tombstones (storage_key) values ($1) on conflict do nothing`,
    [key],
  );
}

export async function placeFile(key: string, bytes: Uint8Array): Promise<Placed> {
  const storage = fileStorage();
  if (storage.mode === "s3") await reserveKey(key);
  const location = await storage.store(key, bytes);
  return { ...location, key, size: bytes.byteLength };
}

/** In the transaction that wrote the row: the key is held, the tombstone goes. */
export async function keepPlaced(tx: AppTransaction, placed: Placed): Promise<void> {
  if (placed.storageKey === null) return;
  await tx.delete(fileTombstones).where(eq(fileTombstones.storageKey, placed.storageKey));
}

/** The row was not written: the object goes now. Never throws; the tombstone is the net. */
export async function discardPlaced(placed: Placed): Promise<void> {
  if (placed.storageKey === null) return;
  try {
    await fileStorage().discard(placed.storageKey);
  } catch (error) {
    await log.warn("files: could not discard an object after a failed insert", {
      error: errorName(error),
    });
  }
}

/** The file behind a row that was read under RLS; null when the object is gone. */
export async function loadFile(location: FileLocation): Promise<Uint8Array | null> {
  return fileStorage().load(location);
}
