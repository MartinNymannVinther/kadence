import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { resetRateLimits } from "@/core/rate-limit";
import {
  createUploadKey,
  hashUploadKey,
  listUploadKeys,
  noteKeyUse,
  removeUploadKey,
  uploadKeyOwner,
} from "@/modules/devices/upload-keys";
import { archiveRider, eraseRider } from "@/modules/team/riders";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * What follows an upload key through a rider's life (docs/adr/0029): it
 * goes when the rider is archived and does not come back with them, it
 * does not pass to the next account to hold the rider row, it belongs to
 * one team when its maker rides on two, it leaves no hash in the audit
 * trail, and it is erased with the rider, trail and all.
 */

const ORG = "org_key_life";
const SECOND = "org_key_life_b";
const COACH = { orgId: ORG, userId: "user_kl_coach" };
const IDA = { orgId: ORG, userId: "user_kl_ida" };
const NEXT = { orgId: ORG, userId: "user_kl_next" };
const GONE = { orgId: ORG, userId: "user_kl_gone" };
const IDA_ELSEWHERE = { orgId: SECOND, userId: IDA.userId };

let admin: Pool;

const keysOf = async (riderId: string) =>
  (await admin.query("select id from upload_keys where rider_id = $1", [riderId])).rows.length;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [IDA, NEXT, GONE]) await seedPerson(admin, ORG, p.userId, "member");
  await seedPerson(admin, SECOND, "user_kl_coach_b", "owner");
  // The same person on a second team: a membership of its own.
  await admin.query(
    `insert into memberships (id, organization_id, user_id, role) values ($1, $2, $3, 'member')`,
    ["mem_kl_ida_b", SECOND, IDA.userId],
  );
  for (const [org, id, uid] of [
    [ORG, "kl_ida", IDA.userId],
    [ORG, "kl_gone", GONE.userId],
    [SECOND, "kl_ida_b", IDA.userId],
  ]) {
    const q = insertSql("riders", { org_id: org, id, user_id: uid, name: id, birth_year: 2009 });
    await admin.query(q.text, q.values);
  }
});

beforeEach(() => resetRateLimits());

afterAll(async () => {
  await admin.end();
});

describe("a rider who is archived", () => {
  it("takes no keys along, and gets none back on returning", async () => {
    const made = await createUploadKey(IDA, "Fars computer");
    expect(await uploadKeyOwner(made.key)).not.toBeNull();

    await archiveRider(COACH, "kl_ida", true);
    expect(await keysOf("kl_ida")).toBe(0);
    expect(await uploadKeyOwner(made.key)).toBeNull();

    await archiveRider(COACH, "kl_ida", false);
    expect(await uploadKeyOwner(made.key)).toBeNull();
    expect(await listUploadKeys(IDA)).toEqual([]);
  });
});

describe("a rider row that passes to another account", () => {
  it("does not hand its keys on", async () => {
    const made = await createUploadKey(IDA, "Telefon");
    await admin.query("update riders set user_id = $1 where id = 'kl_ida'", [NEXT.userId]);
    try {
      expect(await keysOf("kl_ida")).toBe(0);
      expect(await uploadKeyOwner(made.key)).toBeNull();
      // The new holder starts with none, and makes their own.
      expect(await listUploadKeys(NEXT)).toEqual([]);
      const theirs = await createUploadKey(NEXT, "Min egen");
      expect(await uploadKeyOwner(theirs.key)).toMatchObject({ riderUserId: NEXT.userId });
      await removeUploadKey(NEXT, theirs.id);
    } finally {
      await admin.query("update riders set user_id = $1 where id = 'kl_ida'", [IDA.userId]);
    }
    expect(await uploadKeyOwner(made.key)).toBeNull();
  });
});

describe("one person riding on two teams", () => {
  it("has a key in each, and each key lands in its own team", async () => {
    const here = await createUploadKey(IDA, "Klubben");
    const there = await createUploadKey(IDA_ELSEWHERE, "Landsholdet");
    expect(await uploadKeyOwner(here.key)).toMatchObject({ orgId: ORG, riderId: "kl_ida" });
    expect(await uploadKeyOwner(there.key)).toMatchObject({ orgId: SECOND, riderId: "kl_ida_b" });
    // Each team shows its own key only.
    expect((await listUploadKeys(IDA)).map((k) => k.name)).toEqual(["Klubben"]);
    expect((await listUploadKeys(IDA_ELSEWHERE)).map((k) => k.name)).toEqual(["Landsholdet"]);
    // Removed in one team, the other's still works.
    await removeUploadKey(IDA, here.id);
    expect(await uploadKeyOwner(here.key)).toBeNull();
    expect(await uploadKeyOwner(there.key)).not.toBeNull();
    await removeUploadKey(IDA_ELSEWHERE, there.id);
  });
});

describe("the audit trail", () => {
  it("says that a key was made, used and removed, and never holds the key or its hash", async () => {
    const made = await createUploadKey(IDA, "Revideret");
    const owner = (await uploadKeyOwner(made.key))!;
    await noteKeyUse(owner, "invalid_file");
    await removeUploadKey(COACH, made.id);

    const { rows } = await admin.query(
      `select action, actor_user_id, before_data, after_data from audit_log
       where entity_type = 'upload_keys' and entity_id = $1 order by created_at, id`,
      [made.id],
    );
    expect(rows.map((r) => [r.action, r.actor_user_id])).toEqual([
      ["upload_keys.insert", IDA.userId],
      ["upload_keys.update", IDA.userId],
      ["upload_keys.delete", COACH.userId],
    ]);
    const written = JSON.stringify(rows);
    expect(written).toContain("Revideret");
    expect(written).not.toContain(made.key);
    expect(written).not.toContain(hashUploadKey(made.key));
    expect(written).not.toContain("key_hash");
  });
});

describe("a rider who is erased", () => {
  it("leaves no key and no trace of one", async () => {
    const made = await createUploadKey(GONE, "Skal væk");
    await noteKeyUse((await uploadKeyOwner(made.key))!, "");
    await eraseRider(COACH, "kl_gone");

    expect(await keysOf("kl_gone")).toBe(0);
    expect(await uploadKeyOwner(made.key)).toBeNull();
    const { rows } = await admin.query(
      `select 1 from audit_log where entity_type = 'upload_keys'
       and (entity_id = $1 or before_data ->> 'rider_id' = 'kl_gone'
            or after_data ->> 'rider_id' = 'kl_gone')`,
      [made.id],
    );
    expect(rows).toEqual([]);
  });
});
