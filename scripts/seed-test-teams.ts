// Loaded before anything touches @/core/env: a standalone script gets no
// help from Next.js, which normally reads .env for us. Sign-up is opened
// for this process only, so the teams can be created on a closed
// installation; nothing is written to .env.
import "dotenv/config";
process.env.SIGNUP = "open";

/**
 * Test teams for trying Kadence by hand, locally: each one the demo's U19
 * team in full swing, plus accounts for every role — a coach, two riders
 * and a parent whose link the rider has confirmed — all with the same
 * password.
 *
 *     pnpm script scripts/seed-test-teams.ts martin a1 a2 …
 *
 * The first key's coach is the installation's owner when the database is
 * empty. Refuses anywhere but a local installation: these are known
 * passwords.
 */

const PASSWORD = "kadence-test-2026";

type Account = { role: string; name: string; email: string };

async function main() {
  const { env } = await import("@/core/env");
  const host = new URL(env.BETTER_AUTH_URL).hostname;
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1"].includes(host)) {
    throw new Error("seed-test-teams runs only against a local installation.");
  }
  const keys = process.argv.slice(2);
  if (keys.length === 0) throw new Error("Name at least one team key, e.g. `martin`.");

  const { auth } = await import("@/core/auth/auth");
  const { registerUserWithOrganization } = await import("@/core/auth/register");
  const { registerInvited } = await import("@/core/team/register");
  const { inviteMember } = await import("@/core/team/service");
  const { seedDemoTeam } = await import("@/modules/demo/seed");
  const { claimPendingLinks } = await import("@/modules/team/claim");
  const { addGuardian, attachGuardianInvitation, confirmGuardian } =
    await import("@/modules/team/guardians");
  const { attachRiderInvitation, getRiders } = await import("@/modules/team/riders");
  const { authDb } = await import("@/core/db/client");
  const { organizations, users } = await import("@/core/db/schema");
  const { eq } = await import("drizzle-orm");

  const cookies = (h: Headers) =>
    new Headers({
      cookie: h
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; "),
    });
  const userId = async (email: string) =>
    (await authDb.select({ id: users.id }).from(users).where(eq(users.email, email)))[0]!.id;

  const all: Array<{ team: string; accounts: Account[] }> = [];
  for (const key of keys) {
    const suffix = key === "martin" ? "" : `-${key}`;
    const mail = (who: string) => `${who}${suffix}@kadence.test`;
    const teamName = key === "martin" ? "Testhold U19" : `Testhold ${key}`;

    const registered = await registerUserWithOrganization(new Headers(), {
      name: "Trine Træner",
      email: mail("traener"),
      password: PASSWORD,
      organizationName: teamName,
    });
    if (!registered.ok)
      throw new Error(`${key}: the coach could not register (${registered.error})`);
    const { headers: signIn } = await auth.api.signInEmail({
      body: { email: mail("traener"), password: PASSWORD },
      returnHeaders: true,
    });
    const coachHeaders = cookies(signIn);
    const [org] = await authDb
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.name, teamName));
    const coach = { orgId: org!.id, userId: await userId(mail("traener")) };

    await seedDemoTeam(coach, "da");
    const riders = await getRiders(coach);
    const byName = (name: string) => riders.find((r) => r.name === name)!;

    const join = async (email: string, name: string) => {
      const invited = await inviteMember(coachHeaders, { email, role: "member" });
      if (!invited.ok) throw new Error(`${key}: invitation for ${email} failed (${invited.error})`);
      return invited.invitation.id;
    };
    const register = async (invitationId: string, name: string, email: string) => {
      const result = await registerInvited(new Headers(), {
        invitationId,
        name,
        password: PASSWORD,
      });
      if (!result.ok) throw new Error(`${key}: ${email} could not join (${result.error})`);
      const ctx = { orgId: coach.orgId, userId: await userId(email) };
      await claimPendingLinks(ctx);
      return ctx;
    };

    const emma = byName("Emma Holm");
    const emmaInvitation = await join(mail("emma"), "Emma Holm");
    await attachRiderInvitation(coach, emma.id, emmaInvitation);
    const emmaCtx = await register(emmaInvitation, "Emma Holm", mail("emma"));

    const oskar = byName("Oskar Lund");
    const oskarInvitation = await join(mail("oskar"), "Oskar Lund");
    await attachRiderInvitation(coach, oskar.id, oskarInvitation);
    await register(oskarInvitation, "Oskar Lund", mail("oskar"));

    const guardian = await addGuardian(coach, {
      riderId: emma.id,
      name: "Mette Holm",
      relation: "mother",
    });
    const parentInvitation = await join(mail("mor"), "Mette Holm");
    await attachGuardianInvitation(coach, guardian.id, parentInvitation);
    await register(parentInvitation, "Mette Holm", mail("mor"));
    await confirmGuardian(emmaCtx, guardian.id);

    all.push({
      team: teamName,
      accounts: [
        { role: "træner", name: "Trine Træner", email: mail("traener") },
        { role: "rytter", name: "Emma Holm", email: mail("emma") },
        { role: "rytter", name: "Oskar Lund", email: mail("oskar") },
        { role: "forælder til Emma", name: "Mette Holm", email: mail("mor") },
      ],
    });
  }

  console.log(JSON.stringify({ password: PASSWORD, teams: all }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
