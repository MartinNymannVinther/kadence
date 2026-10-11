import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client, Pool } from "pg";
import { setAiBudget } from "@/core/admin/ai-budget";
import type { LlmProvider, LlmUsage } from "@/core/llm";
import { BudgetReached, DEFAULT_MONTHLY_BUDGET_MICRO } from "@/modules/ai/limits";
import { askForJson, classifyAiError } from "@/modules/ai/service";
import { aiMonth } from "@/modules/ai/usage";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { seedMember, seedWorkspace } from "../helpers/workspace";

/**
 * AI with a price (docs/adr/0089): what a call spent is written onto its
 * row after the model answered, and a workspace that has spent its month
 * on the installation's key is refused before the model is asked, with a
 * plain sentence, while everything else goes on. Only the installation's
 * owner moves a budget, and the database is what says so.
 */

const spy = vi.hoisted(() => ({
  provider: null as LlmProvider | null,
  billedTo: "installation" as "installation" | "workspace",
}));

vi.mock("@/modules/ai/model-settings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/ai/model-settings")>()),
  workspaceLlm: async () =>
    spy.provider ? { provider: spy.provider, billedTo: spy.billedTo } : null,
}));

let admin: Pool;
let app: Client;
let A: { orgId: string; userId: string };
let B: { orgId: string; userId: string };
let coach: { orgId: string; userId: string };
let owner: { orgId: string; userId: string };

function model(
  id: string,
  name: string,
  usage: LlmUsage = { inputTokens: 1000, outputTokens: 500 },
) {
  const complete = vi.fn(async () => ({
    content: '{"ok":true}',
    model: name,
    usage,
    finish: "stop",
  }));
  spy.provider = {
    id,
    label: id,
    model: name,
    complete,
    healthCheck: async () => ({ ok: true as const, detail: "" }),
  } as unknown as LlmProvider;
  return complete;
}

async function rows(orgId: string) {
  const { rows } = await admin.query(
    `select model, provider, tokens_in, tokens_out, cost_micro, billed_to from ai_calls where org_id = $1`,
    [orgId],
  );
  return rows;
}

/** This month's spend on the installation's key, straight into the counter. */
async function spend(orgId: string, micro: number, age = "0 seconds") {
  await admin.query(
    `insert into ai_calls (org_id, kind, engine, cost_micro, created_at) values ($1, 'test', 'test', $2, now() - $3::interval)`,
    [orgId, micro, age],
  );
}

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  A = await seedWorkspace(admin, "budget_a");
  B = await seedWorkspace(admin, "budget_b");
  coach = await seedMember(admin, A.orgId, "budget_coach", "admin");
  owner = await seedWorkspace(admin, "budget_owner");
  await admin.query(`update users set platform_role = 'owner' where id = $1`, [owner.userId]);
});

afterAll(async () => {
  await admin?.query("delete from ai_calls");
  await app?.end();
  await admin?.end();
});

beforeEach(async () => {
  await admin.query("delete from ai_calls");
  await admin.query("update team_settings set ai_budget_micro = null");
  spy.provider = null;
  spy.billedTo = "installation";
});

describe("what a call spent", () => {
  it("is written after the model answered: tokens, model and micro-euro", async () => {
    model("mistral", "mistral-small-latest");
    await askForJson(A, "test", [{ role: "user", content: "hej" }]);
    // 1000 × 0.1275 € + 500 × 0.51 € per million, × 1.1 on the EU endpoint.
    expect(await rows(A.orgId)).toEqual([
      {
        model: "mistral-small-latest",
        provider: "mistral",
        tokens_in: 1000,
        tokens_out: 500,
        cost_micro: "421",
        billed_to: "installation",
      },
    ]);
  });

  it("keeps the tokens and writes no cost for a price nobody knows", async () => {
    model("mistral", "mistral-large-4");
    await askForJson(A, "test", [{ role: "user", content: "hej" }]);
    model("mistral", "a-model-from-the-future");
    await askForJson(A, "test", [{ role: "user", content: "hej" }]);
    const written = await rows(A.orgId);
    expect(written.map((r) => [r.tokens_in, r.cost_micro])).toEqual([
      [1000, null],
      [1000, null],
    ]);
  });

  it("is nothing on Ollama, and nothing known when the provider gave no count", async () => {
    model("ollama", "llama3.2");
    await askForJson(A, "test", [{ role: "user", content: "hej" }]);
    model("mistral", "mistral-small-latest", null);
    await askForJson(A, "test", [{ role: "user", content: "hej" }]);
    const written = await rows(A.orgId);
    expect(written.map((r) => [r.provider, r.tokens_in, r.cost_micro])).toEqual([
      ["ollama", 1000, "0"],
      ["mistral", null, null],
    ]);
  });
});

describe("the month's budget", () => {
  it("refuses a workspace that has spent it, before the model is asked, and nobody else", async () => {
    const complete = model("mistral", "mistral-small-latest");
    await spend(A.orgId, DEFAULT_MONTHLY_BUDGET_MICRO);

    const error = await askForJson(A, "test", [{ role: "user", content: "hej" }]).catch((e) => e);
    expect(error).toBeInstanceOf(BudgetReached);
    expect(classifyAiError(error)).toBe("budget");
    expect(complete).not.toHaveBeenCalled();
    expect(await rows(A.orgId)).toHaveLength(1);

    await expect(askForJson(B, "test", [{ role: "user", content: "hej" }])).resolves.toBeTruthy();
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("says so in a plain sentence, and that everything else works", () => {
    const da = JSON.parse(readFileSync("messages/da.json", "utf8"));
    expect(da.assist.errors.budget).toBe("AI'en holder pause til næste måned. Alt andet virker.");
  });

  it("lets the call one cent below the line through", async () => {
    model("mistral", "mistral-small-latest");
    await spend(A.orgId, DEFAULT_MONTHLY_BUDGET_MICRO - 10_000);
    await expect(askForJson(A, "test", [{ role: "user", content: "hej" }])).resolves.toBeTruthy();
  });

  it("starts again on the first of the month, Copenhagen time", async () => {
    model("mistral", "mistral-small-latest");
    await admin.query(
      `insert into ai_calls (org_id, kind, engine, cost_micro, created_at)
       values ($1, 'test', 'test', $2,
         date_trunc('month', now() at time zone 'Europe/Copenhagen') at time zone 'Europe/Copenhagen' - interval '1 minute')`,
      [A.orgId, DEFAULT_MONTHLY_BUDGET_MICRO * 3],
    );
    await expect(askForJson(A, "test", [{ role: "user", content: "hej" }])).resolves.toBeTruthy();
  });

  it("does not stop a workspace that pays with its own key", async () => {
    model("mistral", "mistral-small-latest");
    spy.billedTo = "workspace";
    await spend(A.orgId, DEFAULT_MONTHLY_BUDGET_MICRO * 2);
    await expect(askForJson(A, "test", [{ role: "user", content: "hej" }])).resolves.toBeTruthy();
    const own = (await rows(A.orgId)).find((r) => r.billed_to === "workspace");
    expect(own?.cost_micro).toBe("421");
    // And what it spent is not the installation's month.
    expect((await aiMonth(A)).spentMicro).toBe(DEFAULT_MONTHLY_BUDGET_MICRO * 2);
  });

  it("is raised by the installation's owner, and the AI comes back", async () => {
    model("mistral", "mistral-small-latest");
    await spend(A.orgId, DEFAULT_MONTHLY_BUDGET_MICRO);
    await expect(askForJson(A, "test", [{ role: "user", content: "hej" }])).rejects.toBeInstanceOf(
      BudgetReached,
    );

    expect(await setAiBudget(owner.userId, A.orgId, 2 * DEFAULT_MONTHLY_BUDGET_MICRO)).toBe("ok");
    expect(await aiMonth(A)).toEqual({
      spentMicro: DEFAULT_MONTHLY_BUDGET_MICRO,
      budgetMicro: 2 * DEFAULT_MONTHLY_BUDGET_MICRO,
    });
    await expect(askForJson(A, "test", [{ role: "user", content: "hej" }])).resolves.toBeTruthy();

    // Null gives the workspace the installation's default back.
    expect(await setAiBudget(owner.userId, A.orgId, null)).toBe("ok");
    expect((await aiMonth(A)).budgetMicro).toBe(DEFAULT_MONTHLY_BUDGET_MICRO);
  });

  it("is moved by the owner only, and the change is in the workspace's audit log", async () => {
    expect(await setAiBudget(coach.userId, A.orgId, 50_000_000)).toBe("unauthorized");
    expect((await aiMonth(A)).budgetMicro).toBe(DEFAULT_MONTHLY_BUDGET_MICRO);

    await setAiBudget(owner.userId, A.orgId, 7_000_000);
    const { rows: trail } = await admin.query(
      `select actor_user_id from audit_log
       where org_id = $1 and entity_type = 'team_settings' and after_data ->> 'ai_budget_micro' = '7000000'`,
      [A.orgId],
    );
    expect(trail.map((r) => r.actor_user_id)).toContain(owner.userId);
  });
});

describe("the database stands behind it", () => {
  const asCoach = <T>(fn: (c: Client) => Promise<T>) => asApp(app, coach, fn);

  it("refuses set_ai_budget to anyone but the owner", async () => {
    expect(
      await expectSqlError(
        asCoach((c) => c.query(`select set_ai_budget($1, 99000000)`, [A.orgId])),
      ),
    ).toBe("42501");
  });

  it("will not let a coach write the column, which team_settings otherwise lets them", async () => {
    await admin.query(
      `insert into team_settings (org_id) values ($1) on conflict (org_id) do nothing`,
      [A.orgId],
    );
    expect(
      await expectSqlError(
        asCoach((c) =>
          c.query(`update team_settings set ai_budget_micro = 99000000 where org_id = $1`, [
            A.orgId,
          ]),
        ),
      ),
    ).toBe("42501");
    await admin.query(`delete from team_settings where org_id = $1`, [A.orgId]);
    expect(
      await expectSqlError(
        asCoach((c) =>
          c.query(`insert into team_settings (org_id, ai_budget_micro) values ($1, 99000000)`, [
            A.orgId,
          ]),
        ),
      ),
    ).toBe("42501");
    // Everything else on the row is still the coach's.
    const kind = await asCoach(async (c) => {
      await c.query(`insert into team_settings (org_id, team_kind) values ($1, 'U19')`, [A.orgId]);
      await c.query(`update team_settings set team_kind = 'U17' where org_id = $1`, [A.orgId]);
      return (await c.query(`select team_kind from team_settings where org_id = $1`, [A.orgId]))
        .rows[0];
    });
    expect(kind).toEqual({ team_kind: "U17" });
  });
});
