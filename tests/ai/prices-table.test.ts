import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { AI_PRICES } from "@/modules/ai/prices";
import { adminPool, appClient, asApp, authClient, expectSqlError } from "../helpers/db";

/**
 * The installation's price list (drizzle/0049, docs/adr/0089): the
 * migration's seed is src/modules/ai/prices.ts, number for number, and
 * the application role reads it and can change none of it.
 */

let admin: Pool;
let app: Client;
let auth: Client;

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  auth = await authClient();
});

afterAll(async () => {
  await app?.end();
  await auth?.end();
  await admin?.end();
});

describe("ai_prices", () => {
  it("holds exactly the list in src/modules/ai/prices.ts", async () => {
    const { rows } = await admin.query(
      `select provider, model, input_micro_per_mtok, output_micro_per_mtok,
              to_char(valid_from, 'YYYY-MM-DD') as valid_from, source
       from ai_prices order by provider, model, valid_from`,
    );
    const asRows = rows.map((r) => ({
      provider: r.provider,
      model: r.model,
      inputMicroPerMtok: r.input_micro_per_mtok === null ? null : Number(r.input_micro_per_mtok),
      outputMicroPerMtok: r.output_micro_per_mtok === null ? null : Number(r.output_micro_per_mtok),
      validFrom: r.valid_from,
      source: r.source,
    }));
    const key = (p: { provider: string; model: string; validFrom: string }) =>
      `${p.provider}|${p.model}|${p.validFrom}`;
    const expected = [...AI_PRICES].sort((a, b) => key(a).localeCompare(key(b)));
    expect(asRows.sort((a, b) => key(a).localeCompare(key(b)))).toEqual(expected);
  });

  it("is read by the application role and written by nobody but a migration", async () => {
    const ctx = { orgId: "org_none", userId: "user_none" };
    const seen = await asApp(
      app,
      ctx,
      async (c) => (await c.query("select count(*)::int as n from ai_prices")).rows[0].n,
    );
    expect(seen).toBe(AI_PRICES.length);
    for (const write of [
      "insert into ai_prices (provider, model, valid_from, source) values ('x', 'y', current_date, 'z')",
      "update ai_prices set input_micro_per_mtok = 0",
      "delete from ai_prices",
    ]) {
      expect(await expectSqlError(asApp(app, ctx, (c) => c.query(write)))).toBe("42501");
    }
    expect(await expectSqlError(auth.query("select * from ai_prices"))).toBe("42501");
  });
});
