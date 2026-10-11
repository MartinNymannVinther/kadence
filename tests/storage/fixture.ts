import type { Pool } from "pg";
import { S3ObjectStore, s3Storage } from "@/core/files/s3";
import { configureFileStorage } from "@/core/files/storage";
import { SPORT } from "@/modules/fit";
import { encodeRide, steadyHour } from "../fit/fixtures";
import { startFakeS3, type FakeS3 } from "../helpers/fake-s3";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * What the storage tests share (docs/adr/0087): a fake S3 on the loopback
 * address made the installation's file storage for the length of a test
 * file, and a team with a coach and a rider who has an account. Every
 * ride here is the fixture hour of 1 September 2026, moved by whole days
 * so two rides never share a hash or a start.
 */

export type StorageTeam = {
  orgId: string;
  coach: { orgId: string; userId: string };
  rider: { orgId: string; userId: string };
  riderId: string;
};

/** The fake becomes the file storage; `restore()` puts the environment's back. */
export async function useFakeS3(): Promise<{ fake: FakeS3; restore: () => Promise<void> }> {
  const fake = await startFakeS3();
  configureFileStorage(
    s3Storage(
      new S3ObjectStore({
        endpoint: fake.endpoint,
        region: fake.region,
        bucket: fake.bucket,
        accessKey: fake.accessKey,
        secretKey: fake.secretKey,
      }),
    ),
  );
  return {
    fake,
    restore: async () => {
      configureFileStorage(null);
      await fake.close();
    },
  };
}

export async function seedStorageTeam(admin: Pool, prefix: string): Promise<StorageTeam> {
  const orgId = `org_${prefix}`;
  const coach = { orgId, userId: `user_${prefix}_coach` };
  const rider = { orgId, userId: `user_${prefix}_rider` };
  await seedPerson(admin, orgId, coach.userId, "owner", `Hold ${prefix}`);
  await seedPerson(admin, orgId, rider.userId, "member");
  const riderId = `${prefix}_rider`;
  const q = insertSql("riders", {
    org_id: orgId,
    id: riderId,
    user_id: rider.userId,
    name: "Rytter",
    birth_year: 2008,
    ftp_watts: 250,
  });
  await admin.query(q.text, q.values);
  return { orgId, coach, rider, riderId };
}

/** The fixture ride, `days` days after 1 September 2026. */
export function rideOn(days: number): Uint8Array {
  return encodeRide(
    steadyHour().map((sample) => ({ ...sample, s: sample.s + days * 86_400 })),
    { sport: SPORT.cycling, timerSeconds: 3600 },
  );
}

/** The one activity_files row of a ride, as the superuser sees it. */
export async function fileRow(admin: Pool, activityId: string) {
  const { rows } = await admin.query(
    `select id, org_id, rider_id, sha256, storage_key, size_bytes, octet_length(bytes) as in_row
     from activity_files where activity_id = $1`,
    [activityId],
  );
  return rows[0] as
    | {
        id: string;
        org_id: string;
        rider_id: string;
        sha256: string;
        storage_key: string | null;
        size_bytes: number;
        in_row: number | null;
      }
    | undefined;
}

export async function tombstones(admin: Pool): Promise<string[]> {
  const { rows } = await admin.query(
    `select storage_key from file_tombstones order by storage_key`,
  );
  return rows.map((r) => r.storage_key as string);
}

/** Makes every tombstone old enough for the job to take. */
export async function ageTombstones(admin: Pool): Promise<void> {
  await admin.query(`update file_tombstones set created_at = now() - interval '1 hour'`);
}
