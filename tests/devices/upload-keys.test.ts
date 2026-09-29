import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { resetRateLimits } from "@/core/rate-limit";
import {
  createUploadKey,
  hashUploadKey,
  listUploadKeys,
  looksLikeUploadKey,
  MAX_KEYS_PER_RIDER,
  newUploadKey,
  noteKeyUse,
  removeUploadKey,
  uploadKeyOwner,
} from "@/modules/devices/upload-keys";
import { adminPool, appClient, asApp } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A rider's upload keys (docs/adr/0029): made by the rider and nobody
 * else, shown once and kept only as a hash, seen and removed by a coach,
 * invisible to a parent and a teammate — and found again from the key
 * alone, for a file that arrives with nobody signed in, only while the
 * rider is still the rider who made it. What follows a key through a
 * rider's archiving, erasure and the audit trail is in
 * upload-keys-life.test.ts.
 */

const ORG = "org_upload_keys";
const COACH = { orgId: ORG, userId: "user_uk_coach" };
const IDA = { orgId: ORG, userId: "user_uk_ida" };
const MIKKEL = { orgId: ORG, userId: "user_uk_mikkel" };
const PARENT = { orgId: ORG, userId: "user_uk_parent" };

let admin: Pool;
let app: Client;

const keysOf = (riderId: string) =>
  admin.query("select * from upload_keys where rider_id = $1 order by created_at", [riderId]);

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [IDA, MIKKEL, PARENT]) await seedPerson(admin, ORG, p.userId, "member");
  for (const [id, uid] of [
    ["uk_ida", IDA.userId],
    ["uk_mikkel", MIKKEL.userId],
  ]) {
    const q = insertSql("riders", { org_id: ORG, id, user_id: uid, name: id, birth_year: 2009 });
    await admin.query(q.text, q.values);
  }
  const g = insertSql("guardians", {
    org_id: ORG,
    rider_id: "uk_ida",
    user_id: PARENT.userId,
    name: "Mor",
    confirmed_at: new Date(),
  });
  await admin.query(g.text, g.values);
});

beforeEach(() => resetRateLimits());

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("a key", () => {
  it("is 32 random bytes behind a prefix, and no two are alike", () => {
    const a = newUploadKey();
    const b = newUploadKey();
    expect(a.key).toMatch(/^kad_[A-Za-z0-9_-]{43}$/);
    expect(a.key).not.toBe(b.key);
    expect(a.hash).toBe(hashUploadKey(a.key));
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hint).toBe(a.key.slice(-4));
  });

  it("is told from anything else by its shape", () => {
    expect(looksLikeUploadKey(newUploadKey().key)).toBe(true);
    for (const not of ["", "kad_", "kad_short", `xyz_${"a".repeat(43)}`, `kad_${"a".repeat(44)}`])
      expect(looksLikeUploadKey(not), not).toBe(false);
  });
});

describe("making a key", () => {
  it("gives the rider the key once and keeps only its hash", async () => {
    const made = await createUploadKey(IDA, "  Fars computer ");
    expect(looksLikeUploadKey(made.key)).toBe(true);
    const { rows } = await keysOf("uk_ida");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: made.id,
      org_id: ORG,
      name: "Fars computer",
      key_hash: hashUploadKey(made.key),
      hint: made.key.slice(-4),
      created_by: IDA.userId,
      last_used_at: null,
      last_error: "",
    });
    expect(JSON.stringify(rows[0])).not.toContain(made.key);
  });

  it("is the rider's alone: not a coach's, not a parent's", async () => {
    await expect(createUploadKey(COACH, "Trænerens")).rejects.toMatchObject({
      code: "forbidden",
      detail: "not_a_rider",
    });
    await expect(createUploadKey(PARENT, "Mors")).rejects.toMatchObject({ code: "forbidden" });
    expect((await keysOf("uk_ida")).rows).toHaveLength(1);
  });

  it("asks for a name of one to sixty characters", async () => {
    for (const name of ["", "   ", "x".repeat(61)])
      await expect(createUploadKey(IDA, name)).rejects.toMatchObject({ code: "invalid" });
  });

  it("stops at a handful, also when the presses come at once", async () => {
    const tries = await Promise.allSettled(
      Array.from({ length: MAX_KEYS_PER_RIDER + 3 }, (_, i) =>
        createUploadKey(MIKKEL, `Nøgle ${i + 1}`),
      ),
    );
    expect(tries.filter((t) => t.status === "fulfilled")).toHaveLength(MAX_KEYS_PER_RIDER);
    for (const t of tries.filter((t) => t.status === "rejected"))
      expect(t.reason).toMatchObject({ code: "conflict", detail: "too_many_keys" });
    expect((await keysOf("uk_mikkel")).rows).toHaveLength(MAX_KEYS_PER_RIDER);
  });

  it("is not a way around a limit: ten an hour, however many are removed", async () => {
    for (const key of await listUploadKeys(MIKKEL)) await removeUploadKey(MIKKEL, key.id);
    resetRateLimits();
    for (let i = 0; i < 10; i++) {
      const made = await createUploadKey(MIKKEL, `Runde ${i + 1}`);
      await removeUploadKey(MIKKEL, made.id);
    }
    await expect(createUploadKey(MIKKEL, "Den ellevte")).rejects.toMatchObject({
      code: "conflict",
      detail: "too_many_keys_made",
    });
    expect((await keysOf("uk_mikkel")).rows).toHaveLength(0);
  });
});

describe("seeing and removing keys", () => {
  it("shows the rider their own, how each is doing, and never a hash", async () => {
    const [key] = await listUploadKeys(IDA);
    expect(Object.keys(key!).sort()).toEqual(
      ["createdAt", "hint", "id", "lastError", "lastUsedAt", "name"].sort(),
    );
    expect(key).toMatchObject({ name: "Fars computer", lastUsedAt: null, lastError: "" });
  });

  it("shows a coach a rider's keys, and a parent and a teammate none", async () => {
    expect(await listUploadKeys(COACH, "uk_ida")).toHaveLength(1);
    expect(await listUploadKeys(COACH)).toEqual([]);
    expect(await listUploadKeys(PARENT, "uk_ida")).toEqual([]);
    expect(await listUploadKeys(MIKKEL, "uk_ida")).toEqual([]);
  });

  it("lets nobody but the rider and a coach remove one", async () => {
    const [key] = await listUploadKeys(IDA);
    for (const who of [MIKKEL, PARENT])
      await expect(removeUploadKey(who, key!.id)).rejects.toMatchObject({ code: "notFound" });
    expect(await listUploadKeys(IDA)).toHaveLength(1);

    const second = await createUploadKey(IDA, "Telefon");
    await removeUploadKey(COACH, second.id);
    expect((await listUploadKeys(IDA)).map((k) => k.name)).toEqual(["Fars computer"]);
    await expect(removeUploadKey(IDA, second.id)).rejects.toMatchObject({ code: "notFound" });
  });
});

describe("finding the rider from a key", () => {
  let key: string;
  let keyId: string;

  beforeAll(async () => {
    const made = await createUploadKey(IDA, "Gadgetbridge");
    key = made.key;
    keyId = made.id;
  });

  it("names the key, the team, the rider and the account, and nothing else", async () => {
    expect(await uploadKeyOwner(key)).toEqual({
      keyId,
      orgId: ORG,
      riderId: "uk_ida",
      riderUserId: IDA.userId,
    });
    const rows = await asApp(app, null, (c) =>
      c.query("select * from upload_key_owner($1)", [hashUploadKey(key)]),
    );
    expect(rows.rows).toEqual([
      { key_id: keyId, org_id: ORG, rider_id: "uk_ida", rider_user_id: IDA.userId },
    ]);
  });

  it("answers nothing to a key it does not know, or to what is no key", async () => {
    expect(await uploadKeyOwner(newUploadKey().key)).toBeNull();
    for (const not of ["", "kad_", key.slice(0, -1), `${key}x`, key.toUpperCase()])
      expect(await uploadKeyOwner(not), not).toBeNull();
    // The hash is not the key.
    expect(await uploadKeyOwner(hashUploadKey(key))).toBeNull();
  });

  it("answers nothing for a rider who is no longer on the team", async () => {
    await admin.query("delete from memberships where user_id = $1", [IDA.userId]);
    try {
      expect(await uploadKeyOwner(key)).toBeNull();
    } finally {
      await seedPerson(admin, ORG, IDA.userId, "member");
    }
    expect(await uploadKeyOwner(key)).not.toBeNull();
  });

  it("answers nothing for a key another account made than the one that holds the rider row", async () => {
    const foreign = newUploadKey();
    const q = insertSql("upload_keys", {
      org_id: ORG,
      rider_id: "uk_ida",
      name: "Lagt ind udenom",
      key_hash: foreign.hash,
      hint: foreign.hint,
      created_by: MIKKEL.userId,
    });
    await admin.query(q.text, q.values);
    expect(await uploadKeyOwner(foreign.key)).toBeNull();
    await admin.query("delete from upload_keys where key_hash = $1", [foreign.hash]);
  });

  it("answers nothing once the key is removed", async () => {
    await removeUploadKey(IDA, keyId);
    expect(await uploadKeyOwner(key)).toBeNull();
  });

  it("cannot be asked by the auth role, or by anyone", async () => {
    const { rows } = await admin.query(
      `select has_function_privilege('kadence_app', 'upload_key_owner(text)', 'execute') as app,
              has_function_privilege('kadence_auth', 'upload_key_owner(text)', 'execute') as auth,
              has_function_privilege('public', 'upload_key_owner(text)', 'execute') as anyone`,
    );
    expect(rows[0]).toEqual({ app: true, auth: false, anyone: false });
  });
});

describe("noting that a key was used", () => {
  it("writes when it happened and how it went, once a minute at most", async () => {
    const made = await createUploadKey(IDA, "Dock i klubhuset");
    const owner = (await uploadKeyOwner(made.key))!;
    const row = async () =>
      (
        await admin.query("select last_used_at, last_error from upload_keys where id = $1", [
          made.id,
        ])
      ).rows[0] as { last_used_at: Date | null; last_error: string };
    const t0 = new Date("2026-11-02T17:00:00Z");

    await noteKeyUse(owner, "", t0);
    expect(await row()).toEqual({ last_used_at: t0, last_error: "" });

    // The next file of the same folder, seconds later: nothing to write.
    await noteKeyUse(owner, "", new Date(t0.getTime() + 5_000));
    expect((await row()).last_used_at).toEqual(t0);

    // A file that could not be read is news at once.
    const t1 = new Date(t0.getTime() + 10_000);
    await noteKeyUse(owner, "invalid_file", t1);
    expect(await row()).toEqual({ last_used_at: t1, last_error: "invalid_file" });

    // A helper asking whether its key works says nothing about the last file.
    const t2 = new Date(t1.getTime() + 120_000);
    await noteKeyUse(owner, undefined, t2);
    expect(await row()).toEqual({ last_used_at: t2, last_error: "invalid_file" });
    await removeUploadKey(IDA, made.id);
  });
});
