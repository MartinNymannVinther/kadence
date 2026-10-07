import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/core/auth/auth";
import { openSecret, sealSecret } from "@/core/crypto/secret-box";
import { authDb } from "@/core/db/client";
import { demoWorkspaces, users } from "@/core/db/schema";
import { registerInvited } from "@/core/team/register";
import { inviteMember } from "@/core/team/service";
import { claimPendingLinks } from "@/modules/team/claim";
import { addGuardian, attachGuardianInvitation, confirmGuardian } from "@/modules/team/guardians";
import { attachRiderInvitation, getRiders, setSharing } from "@/modules/team/riders";
import { pick, type L } from "./seed-data";

/**
 * The demo's three people. Kadence is three roles (ADR 0010), and a demo
 * that only shows the coach hides most of what makes it Kadence: the
 * rider's own week and check-in, and the parent who sees only what the
 * rider shares. So a demo has a rider and the rider's parent too, created
 * the way real people join — the coach's invitation, the rider's yes to
 * the parent — and the visitor can switch between them from the demo
 * stripe. Every account is thrown away with the demo.
 */

export const DEMO_ROLES = ["coach", "rider", "parent"] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

const accountSchema = z.object({
  role: z.enum(DEMO_ROLES),
  userId: z.string(),
  email: z.string(),
  passwordSealed: z.string(),
});
export type DemoAccount = z.infer<typeof accountSchema>;

export function readAccounts(value: unknown): DemoAccount[] {
  const parsed = z.array(accountSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

const RIDER = "Emma Holm";
const PARENT = { da: "Mette Holm (Emmas mor)", en: "Mette Holm (Emma's mother)" };

const newPassword = () => randomBytes(24).toString("base64url");

/**
 * Adds the rider and the parent to a freshly seeded demo, and records all
 * three accounts on the demo's row. `coachHeaders` is the visitor's own
 * session, which is what may send invitations.
 */
export async function createDemoRoles(input: {
  key: string;
  orgId: string;
  coach: { userId: string; email: string; password: string };
  coachHeaders: Headers;
  locale: L;
}): Promise<DemoAccount[]> {
  const { key, orgId, coach, coachHeaders, locale } = input;
  const coachCtx = { orgId, userId: coach.userId };
  const seal = (password: string) => sealSecret(password, orgId);
  const accounts: DemoAccount[] = [
    {
      role: "coach",
      userId: coach.userId,
      email: coach.email,
      passwordSealed: seal(coach.password),
    },
  ];

  const join = async (role: "rider" | "parent", name: string) => {
    const email = `demo-${key}-${role}@demo.invalid`;
    const password = newPassword();
    const invited = await inviteMember(coachHeaders, { email, role: "member" });
    if (!invited.ok) throw new Error(`demo: invitation for the ${role} failed (${invited.error})`);
    return { email, password, invitationId: invited.invitation.id, name };
  };
  const register = async (person: Awaited<ReturnType<typeof join>>) => {
    const result = await registerInvited(new Headers(), {
      invitationId: person.invitationId,
      name: person.name,
      password: person.password,
    });
    if (!result.ok) throw new Error(`demo: ${person.email} could not join (${result.error})`);
    // The auth role reads users by address; the application role has no
    // read on the column at all (docs/adr/0070).
    const [row] = await authDb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, person.email));
    const ctx = { orgId, userId: row!.id };
    await claimPendingLinks(ctx);
    return ctx;
  };

  const rider = (await getRiders(coachCtx)).find((r) => r.name === RIDER);
  if (!rider) return accounts;
  const riderPerson = await join("rider", RIDER);
  await attachRiderInvitation(coachCtx, rider.id, riderPerson.invitationId);
  const riderCtx = await register(riderPerson);
  // In the demo the rider shares everything, so the parent's view is full;
  // the visitor can switch to Emma and turn it off to see what changes.
  await setSharing(riderCtx, { shareTraining: true, shareWellbeing: true });
  accounts.push({
    role: "rider",
    userId: riderCtx.userId,
    email: riderPerson.email,
    passwordSealed: seal(riderPerson.password),
  });

  const parentName = pick(PARENT, locale);
  const guardian = await addGuardian(coachCtx, {
    riderId: rider.id,
    name: parentName,
    relation: "mother",
  });
  const parentPerson = await join("parent", parentName);
  await attachGuardianInvitation(coachCtx, guardian.id, parentPerson.invitationId);
  const parentCtx = await register(parentPerson);
  await confirmGuardian(riderCtx, guardian.id);
  accounts.push({
    role: "parent",
    userId: parentCtx.userId,
    email: parentPerson.email,
    passwordSealed: seal(parentPerson.password),
  });

  await authDb
    .update(demoWorkspaces)
    .set({ accounts })
    .where(eq(demoWorkspaces.organizationId, orgId));
  return accounts;
}

/**
 * Signs the visitor in as another of their demo's people. Only for a
 * session that already is one of that demo's accounts, in that demo's
 * workspace: the switch is a door between the demo's own rooms, never
 * into anyone else's.
 */
export async function switchDemoRole(
  current: { userId: string; orgId: string | null },
  role: DemoRole,
): Promise<Headers | null> {
  if (!current.orgId) return null;
  const [demo] = await authDb
    .select()
    .from(demoWorkspaces)
    .where(eq(demoWorkspaces.organizationId, current.orgId));
  if (!demo || demo.expiresAt.getTime() <= Date.now()) return null;
  const accounts = readAccounts(demo.accounts);
  if (!accounts.some((a) => a.userId === current.userId)) return null;
  const target = accounts.find((a) => a.role === role);
  const password = target ? openSecret(target.passwordSealed, demo.organizationId) : null;
  if (!target || !password) return null;
  const { headers } = await auth.api.signInEmail({
    body: { email: target.email, password },
    returnHeaders: true,
  });
  return headers;
}

/** Which of the demo's people the caller is, for the stripe. */
export async function currentDemoRole(userId: string, orgId: string): Promise<DemoRole | null> {
  const [demo] = await authDb
    .select({ accounts: demoWorkspaces.accounts })
    .from(demoWorkspaces)
    .where(eq(demoWorkspaces.organizationId, orgId));
  return readAccounts(demo?.accounts).find((a) => a.userId === userId)?.role ?? null;
}
