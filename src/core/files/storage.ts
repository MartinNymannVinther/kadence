import { env } from "@/core/env";
import { dbStorage } from "./db";
import { S3ObjectStore, s3Storage } from "./s3";
import type { FileStorage } from "./types";

/**
 * Where a ride's file lives (docs/adr/0087): in its row in the database,
 * as it always has (`db`, the default), or as an object in an
 * S3-compatible store in the EU (`s3`, `FILES_STORAGE` with the
 * `S3_FILES_*` settings). The row in `activity_files` is the same either
 * way and is what RLS decides about; it carries either `bytes` or a
 * `storage_key`, never both, and the bytes are fetched from the store
 * only after the row was read under the caller's own policies. No object
 * is ever public: the application is the store's only reader.
 *
 * The key is `<org id>/<rider id>/<sha256>.fit`, so a listing of the
 * bucket says nothing about anyone, and the same file for the same rider
 * is the same object.
 */

export {
  FILE_CONTENT_TYPE,
  keyOwner,
  objectKey,
  type FileLocation,
  type FileStorage,
  type ObjectStore,
} from "./types";

let configured: FileStorage | null = null;
let fromEnv: FileStorage | null = null;

function storageFromEnv(): FileStorage {
  if (env.FILES_STORAGE !== "s3") return dbStorage;
  return s3Storage(
    new S3ObjectStore({
      endpoint: env.S3_FILES_ENDPOINT!,
      region: env.S3_FILES_REGION!,
      bucket: env.S3_FILES_BUCKET!,
      accessKey: env.S3_FILES_ACCESS_KEY!,
      secretKey: env.S3_FILES_SECRET_KEY!,
    }),
  );
}

/** The installation's file storage, from the environment. */
export function fileStorage(): FileStorage {
  if (configured) return configured;
  fromEnv ??= storageFromEnv();
  return fromEnv;
}

/** Only for tests: use this storage instead of the environment's; null puts the environment's back. */
export function configureFileStorage(storage: FileStorage | null): void {
  configured = storage;
}
