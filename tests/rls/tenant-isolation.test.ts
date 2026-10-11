import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, appClient, asApp, authClient, expectSqlError } from "../helpers/db";

/**
 * The acceptance criteria for phase 0: tenant isolation proven at the
 * database level. Everything here talks raw SQL as the runtime roles —
 * exactly what any application bug would be able to do, and no more.
 */

const ORG_A = "org_isolation_a";
const ORG_B = "org_isolation_b";
const USER_A = "user_isolation_a";
const USER_B = "user_isolation_b";
const CTX_A = { orgId: ORG_A, userId: USER_A };

let admin: Pool;
let app: Client;
let auth: Client;

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  auth = await authClient();

  await admin.query(
    `insert into organizations (id, name, slug, created_at) values
       ($1, 'Isolation A', 'isolation-a', now()),
       ($2, 'Isolation B', 'isolation-b', now())`,
    [ORG_A, ORG_B],
  );
  await admin.query(
    `insert into users (id, name, email) values
       ($1, 'User A', 'isolation-a@example.com'),
       ($2, 'User B', 'isolation-b@example.com')`,
    [USER_A, USER_B],
  );
  await admin.query(
    `insert into memberships (id, organization_id, user_id, role, created_at) values
       ('mem_isolation_a', $1, $3, 'owner', now()),
       ('mem_isolation_b', $2, $4, 'owner', now())`,
    [ORG_A, ORG_B, USER_A, USER_B],
  );
  await admin.query(
    `insert into audit_log (org_id, actor_user_id, actor_type, action, entity_type, entity_id)
     values ($1, $3, 'user', 'test.seed', 'test', 'seed-a'),
            ($2, $4, 'user', 'test.seed', 'test', 'seed-b')`,
    [ORG_A, ORG_B, USER_A, USER_B],
  );
});

afterAll(async () => {
  await app?.end();
  await auth?.end();
  await admin?.end();
});

describe("read isolation (application role)", () => {
  it("only sees organizations the user belongs to or has active", async () => {
    const rows = await asApp(app, CTX_A, (c) =>
      c.query("select id from organizations order by id"),
    );
    expect(rows.rows.map((r) => r.id)).toEqual([ORG_A]);
  });

  it("cannot read org B's organization row even by primary key", async () => {
    const rows = await asApp(app, CTX_A, (c) =>
      c.query("select id from organizations where id = $1", [ORG_B]),
    );
    expect(rows.rowCount).toBe(0);
  });

  it("cannot read org B's memberships", async () => {
    const rows = await asApp(app, CTX_A, (c) => c.query("select organization_id from memberships"));
    expect(rows.rows.every((r) => r.organization_id === ORG_A)).toBe(true);
    expect(rows.rowCount).toBeGreaterThan(0);
  });

  it("only sees its own user row", async () => {
    const rows = await asApp(app, CTX_A, (c) => c.query("select id from users"));
    expect(rows.rows.map((r) => r.id)).toEqual([USER_A]);
  });

  it("only sees audit entries for the active organization", async () => {
    const rows = await asApp(app, CTX_A, (c) =>
      c.query("select distinct org_id from audit_log where org_id is not null"),
    );
    expect(rows.rows.map((r) => r.org_id)).toEqual([ORG_A]);
  });
});

describe("write isolation (application role)", () => {
  it("cannot insert audit entries for another organization", async () => {
    const code = await asApp(app, CTX_A, (c) =>
      expectSqlError(
        c.query(
          `insert into audit_log (org_id, actor_user_id, actor_type, action, entity_type)
           values ($1, $2, 'user', 'test.forged', 'test')`,
          [ORG_B, USER_A],
        ),
      ),
    );
    expect(code).toBe("42501"); // row-level security violation
  });

  it("can insert audit entries for its own organization", async () => {
    const result = await asApp(app, CTX_A, (c) =>
      c.query(
        `insert into audit_log (org_id, actor_user_id, actor_type, action, entity_type)
         values ($1, $2, 'user', 'test.own', 'test') returning id`,
        [ORG_A, USER_A],
      ),
    );
    expect(result.rowCount).toBe(1);
  });

  it("has no update/delete/insert privilege on organizations at all", async () => {
    for (const sql of [
      `update organizations set name = 'hacked' where id = '${ORG_B}'`,
      `update organizations set name = 'hacked' where id = '${ORG_A}'`,
      `delete from organizations where id = '${ORG_B}'`,
      `insert into organizations (id, name, slug, created_at) values ('org_x', 'X', 'x-slug', now())`,
    ]) {
      const code = await asApp(app, CTX_A, (c) => expectSqlError(c.query(sql)));
      expect(code, sql).toBe("42501"); // permission denied
    }
  });

  it("cannot touch memberships or users", async () => {
    for (const sql of [
      `update users set name = 'hacked' where id = '${USER_B}'`,
      `delete from memberships where id = 'mem_isolation_b'`,
      `insert into memberships (id, organization_id, user_id, role, created_at)
         values ('mem_forged', '${ORG_B}', '${USER_A}', 'owner', now())`,
    ]) {
      const code = await asApp(app, CTX_A, (c) => expectSqlError(c.query(sql)));
      expect(code, sql).toBe("42501");
    }
  });
});

describe("default deny without tenant context", () => {
  it.each(["organizations", "users", "memberships", "audit_log"])(
    "sees zero rows in %s",
    async (table) => {
      const rows = await asApp(app, null, (c) =>
        c.query(`select count(*)::int as n from ${table}`),
      );
      expect(rows.rows[0].n).toBe(0);
    },
  );
});

describe("credential tables are unreachable for the application role", () => {
  it.each(["accounts", "sessions", "verifications", "passkeys", "two_factors", "rate_limits"])(
    "select on %s is denied",
    async (table) => {
      const code = await asApp(app, CTX_A, (c) =>
        expectSqlError(c.query(`select * from ${table}`)),
      );
      expect(code).toBe("42501");
    },
  );
});

describe("audit_log is append-only", () => {
  it("application role cannot update or delete", async () => {
    for (const sql of ["update audit_log set action = 'x'", "delete from audit_log"]) {
      const code = await asApp(app, CTX_A, (c) => expectSqlError(c.query(sql)));
      expect(code, sql).toBe("42501");
    }
  });

  it("even a superuser cannot update, delete or truncate", async () => {
    expect(await expectSqlError(admin.query("update audit_log set action = 'x' where true"))).toBe(
      "P0001",
    );
    expect(await expectSqlError(admin.query("delete from audit_log where true"))).toBe("P0001");
    expect(await expectSqlError(admin.query("truncate audit_log"))).toBe("P0001");
  });
});

describe("auth role confinement", () => {
  it("can read auth tables (its job)", async () => {
    const rows = await auth.query("select count(*)::int as n from users");
    expect(rows.rows[0].n).toBeGreaterThanOrEqual(2);
  });

  it("can only append to the audit log, never read it", async () => {
    // No RETURNING: the auth role has INSERT but deliberately no SELECT.
    const insert = await auth.query(
      `insert into audit_log (org_id, actor_type, action, entity_type)
       values (null, 'system', 'test.auth-role', 'test')`,
    );
    expect(insert.rowCount).toBe(1);
    expect(await expectSqlError(auth.query("select * from audit_log"))).toBe("42501");
    const written = await admin.query(
      "select count(*)::int as n from audit_log where action = 'test.auth-role'",
    );
    expect(written.rows[0].n).toBe(1);
  });
});

describe("rls coverage (guards future tables)", () => {
  it("every table in public has row level security enabled AND forced", async () => {
    const rows = await admin.query(
      `select relname from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'r'
         and not (relrowsecurity and relforcerowsecurity)`,
    );
    expect(rows.rows.map((r) => r.relname)).toEqual([]);
  });

  it("runtime roles cannot bypass rls", async () => {
    const rows = await admin.query(
      `select rolname from pg_roles
       where rolname in ('kadence_app', 'kadence_auth') and (rolbypassrls or rolsuper)`,
    );
    expect(rows.rows).toEqual([]);
  });

  /**
   * Forced RLS with no policy denies everything, which is safe but is not
   * what a new table is meant to do — it is what a new table does when
   * somebody forgot the policy, and the failure shows up as an empty page
   * rather than as an error. The check above passes either way, so it
   * cannot tell the two apart. This one can.
   */
  it("every table has at least one policy", async () => {
    const rows = await admin.query(
      `select c.relname from pg_class c
       where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
         and not exists (select 1 from pg_policy p where p.polrelid = c.oid)`,
    );
    expect(rows.rows.map((r) => r.relname)).toEqual([]);
  });

  /**
   * A policy granted TO PUBLIC applies to every role there is. Kadence's
   * policies name kadence_app or kadence_auth on purpose; one written without
   * a TO clause would quietly widen the whole model.
   */
  it("no policy is granted to public", async () => {
    const rows = await admin.query(
      `select c.relname, p.polname from pg_policy p
       join pg_class c on c.oid = p.polrelid
       where c.relnamespace = 'public'::regnamespace and p.polroles = '{0}'`,
    );
    expect(rows.rows.map((r) => `${r.relname}.${r.polname}`)).toEqual([]);
  });

  /**
   * Dogma 6 says every change lands in an audit log that cannot be
   * edited. That is a per-table trigger, so a table added without one is
   * a hole in the claim rather than in a feature.
   *
   * Some tables carry no trigger on purpose, and they are named here
   * rather than guessed at, so that a new table cannot quietly join them:
   * auditing a log is a copy, not a record (docs/adr/0003, 0005), and a
   * counter or a cache holds nothing anybody owns. Adding a name to this
   * list should be an argument somebody has to make in a pull request.
   */
  const NO_AUDIT_TRIGGER = [
    // Carries the append-only guard instead; proven below.
    "audit_log",
    // A counter for the AI ceilings: nothing anybody owns.
    "ai_calls",
    // Auth machinery Better Auth owns and rotates; sessions are recorded
    // as auth events by the hooks in src/core/auth/auth.ts instead.
    "sessions",
    "verifications",
    "rate_limits",
    // The installation's own counters (drizzle/0043, docs/adr/0083): rate
    // limits, places held while a ride is read, and moments to remember,
    // written on every limited request. The same kind of row as
    // Better Auth's rate_limits beside it, and as little anybody's.
    "app_rate_limits",
    // Admission, which happens before a workspace exists to own it.
    "access_requests",
    "access_invitations",
    // Throwaway by definition, deleted whole when it expires.
    "demo_workspaces",
    // Where a coach last read a thread in Trænerrummet (ADR 0052): their
    // own marker, rewritten on every visit, not something anybody owns.
    "community_reads",
    // What the reminder run has told a browser (drizzle/0038, docs/adr/0060):
    // technical timestamps the job writes on every reminder, how far the
    // news it told reached and the day of the last check-in or week
    // reminder. No personal data beyond whose subscription it is, which the
    // audited push_subscriptions already says, and no person changes them;
    // audited, they filled the trail with a row per reminder. Turning
    // reminders on, changing them and turning them off stay audited, and
    // tests/push/isolation.test.ts proves both.
    "push_runs",
  ];

  it("every domain table has an audit trigger", async () => {
    const rows = await admin.query(
      `select c.relname from pg_class c
       where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
         and not (c.relname = any($1))
         and not exists (
           select 1 from pg_trigger t
           where t.tgrelid = c.oid and not t.tgisinternal
             and t.tgname like 'audit\\_%'
         )`,
      [NO_AUDIT_TRIGGER],
    );
    expect(rows.rows.map((r) => r.relname)).toEqual([]);
  });

  it("the tables excused from auditing are all still there", async () => {
    // A name left behind after its table is gone is a hole the list above
    // would hide rather than show.
    const rows = await admin.query(
      `select c.relname from pg_class c
       where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
         and c.relname = any($1)`,
      [NO_AUDIT_TRIGGER],
    );
    expect(rows.rows.map((r) => r.relname).sort()).toEqual([...NO_AUDIT_TRIGGER].sort());
  });

  it("the audit log cannot be updated or deleted, not even by the superuser", async () => {
    await admin.query(
      `insert into audit_log (org_id, actor_type, action, entity_type)
       values (null, 'system', 'test.append-only', 'test')`,
    );
    expect(
      await expectSqlError(
        admin.query("update audit_log set action = 'tampered' where action = 'test.append-only'"),
      ),
    ).toBeTruthy();
    expect(
      await expectSqlError(admin.query("delete from audit_log where action = 'test.append-only'")),
    ).toBeTruthy();
  });

  /**
   * A SECURITY DEFINER function runs as its owner — here the migration
   * superuser — so a runtime role that may call one is outside RLS for as
   * long as it runs. That is the whole reason the roles themselves have no
   * BYPASSRLS: the exceptions are named functions doing one thing each,
   * not a role with the door left open.
   *
   * So the exceptions are named here too, and a new one has to be argued
   * for in a pull request rather than merged quietly. Trigger functions
   * are excluded because nothing calls them: they run on a write the
   * policies already decided to allow.
   */
  const CALLABLE_DEFINER_FUNCTIONS = [
    // Returns the installation's model-call count for the last day, across
    // every workspace (docs/adr/0035). A number crosses the boundary; no
    // row does, and it takes no arguments, so it can answer one question
    // and only that one.
    "ai_calls_last_day",
    // Who the caller is to a rider, asked by the rider policies without
    // the policies recursing into each other (docs/adr/0011). Each answers
    // true or false about the caller in the active workspace, and only that.
    "app_can_read_rider",
    "app_can_write_rider",
    // Whether the active workspace is a demo, for Trænerrummet's rooms
    // (drizzle/0025, docs/adr/0054): the caller's own active workspace id
    // when it is one, else null, read from installation state the
    // application role cannot read itself.
    "app_demo_room",
    "app_is_coach",
    // Whether the caller coaches a team anywhere on the installation, for
    // Trænerrummet (drizzle/0023, docs/adr/0052): true or false about the
    // caller, read from their own memberships, and nothing else.
    "app_is_coach_somewhere",
    "app_is_guardian_of",
    // Whether the caller owns the installation, for Trænerrummet's
    // moderation: true or false about the caller, and nothing else.
    "app_is_platform_owner",
    "app_is_rider_self",
    // Links a new member to the rider or guardian row a coach prepared,
    // for an invitation the caller accepted to their own address.
    "claim_invitation_links",
    // Deletes a demo whose time is up, its throwaway accounts and every
    // audit row about either, for the clean-up on the auth role
    // (drizzle/0042, docs/adr/0084). Refuses, by doing nothing, anything
    // that is not a demo past its time, so no real club can be reached.
    "delete_expired_demo",
    // Deletes a workspace the caller owns, audit rows included, which is
    // dogma 3 and which RLS and the append-only guard would otherwise
    // forbid (docs/adr/0003). Checks the caller's role itself.
    "delete_workspace",
    // Whose connected Wahoo or Garmin link a provider's user id is, for a
    // device webhook that arrives with nobody signed in and so no context
    // RLS could answer from (drizzle/0005). It returns the team, the rider
    // and the rider's account for one exact (provider, user id) pair and
    // nothing else — no tokens, no status, nothing for a link that is not
    // connected or a rider who is archived or no longer a member — and it
    // cannot enumerate without the provider's id, which only the provider
    // and the link hold. Everything after it runs as the rider, under the
    // ordinary policies.
    "device_link_owner",
    // A rider's right to erasure (drizzle/0006): deletes one rider of the
    // active team and purges the audit rows about that rider, which the
    // append-only guard would otherwise keep forever. Checks itself that
    // the caller coaches the team, like delete_workspace.
    "erase_rider",
    // Whom an invitation is for, for the join page before anybody is
    // signed in (drizzle/0030, docs/adr/0065), and the only definer the
    // auth role may call. For an invitation that is still pending and in
    // date it answers 'rider', or 'guardian' with the rider's first name,
    // from a row joining would link — no id, no team, no surname, nothing
    // for a used, withdrawn or expired invitation — and it cannot
    // enumerate without the invitation's id, which is the key in the link.
    // tests/team/invitation-kind.test.ts proves it, and that the
    // application role cannot call it.
    "invitation_kind",
    // Moves one rider's history from their rider row in one workspace onto
    // their rider row in another (drizzle/0042, docs/adr/0081): the first
    // function that writes across two workspaces. It moves only when the
    // caller's account is on both rows and a member of both workspaces,
    // and only onto a row with no history yet; it answers table names and
    // counts, writes one counted line per table in both trails and never a
    // row, and tests/rls/history-move.test.ts proves each refusal and that
    // it is all or nothing.
    "move_rider_history",
    // Removes the deleted sessions past their seven days, for the reminder
    // job that runs with nobody signed in (drizzle/0037, docs/adr/0060).
    // It takes no arguments, removes only rows older than seven days, and
    // answers how many; nothing is read out. tests/rls/session-deletions
    // proves it keeps the rest.
    "planned_session_deletions_sweep",
    // The installation's overview for its owner (drizzle/0019, docs/adr/0048):
    // one row per workspace with counts only — no name of a person, no
    // training, no check-in. The pilot's three numbers (drizzle/0031,
    // docs/adr/0066) are counts too, of the last full week's riders,
    // check-ins, sessions and coaches' audit rows. It takes no arguments
    // and refuses everyone whose app.user_id is not the installation's
    // owner; tests/core/platform-overview.test.ts proves both and pins its
    // columns.
    "platform_overview",
    // Which reminders exist, for the reminder job that runs with nobody
    // signed in (drizzle/0028, docs/adr/0060): the subscription's id, team
    // and owner, for owners still on the team, and nothing else — no push
    // address, no kinds, nothing about what a reminder would say. The job
    // reads all of that as the owner, under the ordinary policies, so what
    // crosses the boundary is that a person has said yes to reminders.
    "push_subscriptions_due",
    // The addresses the caller may read (drizzle/0034, docs/adr/0070),
    // now that the application role has no SELECT on users.email: the
    // caller's own, the whole team's to a coach of the active team, and
    // to a rider those of the people holding a guardian link to them —
    // the rider confirms a person and sees who that is first (docs/adr/
    // 0019). It takes no arguments and answers from the context alone;
    // tests/rls/member-addresses.test.ts proves each answer and that no
    // other way to the column is open.
    "team_member_addresses",
    // Whose upload key a hash is, for a ride file that arrives with a key
    // and nobody signed in (drizzle/0014, docs/adr/0029). It is
    // device_link_owner's question asked of a key: the key's id, the team,
    // the rider and the rider's account for one exact hash and nothing
    // else — nothing for a rider without an account, one who is archived
    // or one who is no longer a member — and it cannot enumerate without
    // the key, which only its holder has. Everything after it runs as the
    // rider, under the ordinary policies.
    "upload_key_owner",
  ];

  it("only the named definer functions can be called by a runtime role", async () => {
    const rows = await admin.query(
      `select p.proname from pg_proc p
       where p.pronamespace = 'public'::regnamespace and p.prosecdef
         and pg_get_function_result(p.oid) <> 'trigger'
         and (has_function_privilege('kadence_app', p.oid, 'execute')
              or has_function_privilege('kadence_auth', p.oid, 'execute'))
       order by p.proname`,
    );
    expect(rows.rows.map((r) => r.proname)).toEqual(CALLABLE_DEFINER_FUNCTIONS);
  });

  it("the ai call counter is reachable from the app role and nowhere else", async () => {
    const rows = await admin.query(
      `select has_function_privilege('kadence_app', 'ai_calls_last_day()', 'execute') as app,
              has_function_privilege('kadence_auth', 'ai_calls_last_day()', 'execute') as auth,
              has_function_privilege('public', 'ai_calls_last_day()', 'execute') as anyone`,
    );
    expect(rows.rows[0]).toEqual({ app: true, auth: false, anyone: false });
  });
});
