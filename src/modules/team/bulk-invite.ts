import { and, count, eq, gt, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { TEAM_INVITATION_LIMIT } from "@/core/auth/auth";
import { authDb } from "@/core/db/client";
import { invitations, memberships, riders, users } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { cancelInvitation, inviteMember, type IssuedTeamInvitation } from "@/core/team/service";
import { requireCoach } from "./access";
import {
  addressesIn,
  nameKey,
  parseTeamList,
  TEXT_MAX,
  type LineProblem,
  type ListLine,
  type ListProblemCode,
} from "./bulk-parse";
import { addGuardianIn, attachGuardianInvitationIn, GuardianInput } from "./guardians";
import { linkMemberAsGuardianIn } from "./member-guardians";
import { attachRiderInvitationIn, createRiderIn, RiderInput } from "./riders";

/**
 * "Inviter hele holdet" (docs/adr/0064): a coach's pasted list becomes
 * riders, their parents and an invitation link for everybody with an
 * address, all or nothing.
 *
 * The rows go through the same functions as one rider at a time
 * (`createRiderIn`, `addGuardianIn` and the two attach functions), so the
 * role check, RLS and the audit trail are the same; here they share one
 * transaction. The links are Better Auth's invitations, which live on the
 * auth connection and cannot join that transaction, so the order is:
 *
 * 1. read the list again (bulk-parse.ts) — the preview is the browser's;
 * 2. check it against the team: the caller coaches it, no rider of that
 *    name is on it, no rider's address is a member's, no address has a
 *    link waiting, and the team's open links stay under Better Auth's
 *    limit. A parent whose address is already a member's is linked to
 *    their account instead of invited (docs/backlog.md P2-16): no link,
 *    and the rider confirms them as always;
 * 3. make the links, one address at a time; if one fails, cancel those
 *    already made;
 * 4. create every row in one transaction; if it fails, the rows roll
 *    back and the links are cancelled.
 *
 * Nothing is sent here: the coach shares each link from their own phone,
 * or sends it with "Send på mail" where there is mail (mail-invitation.ts).
 */

export const BulkInviteInput = z.object({
  text: z.string().max(TEXT_MAX),
  sharedYear: z.number().int().nullable().default(null),
});

export type IssuedLink = { id: string; url: string; email: string; expiresAt: string };
export type CreatedPerson = {
  id: string;
  name: string;
  link: IssuedLink | null;
  /** A parent already on the team, linked to their account instead of invited. */
  linked?: boolean;
};
export type CreatedLine = {
  rider: CreatedPerson & { birthYear: number };
  parents: CreatedPerson[];
};

export type BulkOutcome =
  | { done: true; lines: CreatedLine[] }
  | { done: false; problems: LineProblem[]; listProblem: ListProblemCode | null };

export async function bulkInvite(
  ctx: OrgContext,
  headers: Headers,
  input: z.infer<typeof BulkInviteInput>,
): Promise<BulkOutcome> {
  const parsed = parseTeamList(input.text, {
    sharedYear: input.sharedYear,
    thisYear: new Date().getFullYear(),
  });
  if (parsed.listProblem || parsed.problems.length > 0) {
    return { done: false, problems: parsed.problems, listProblem: parsed.listProblem };
  }
  const { clash, members } = await checkAgainstTeam(ctx, parsed.lines);
  if (clash) return clash;

  const invited = addressesIn(parsed.lines).filter((email) => !members.has(email));
  const links = await makeLinks(ctx, headers, invited);
  try {
    return { done: true, lines: await createRows(ctx, parsed.lines, links, members) };
  } catch (error) {
    await cancelAll(headers, [...links.values()]);
    throw error;
  }
}

/**
 * What stands in the way, if anything, and the parents' addresses that
 * already belong to a member of the team, with whose account they are.
 */
async function checkAgainstTeam(
  ctx: OrgContext,
  lines: ListLine[],
): Promise<{ clash: BulkOutcome | null; members: Map<string, string> }> {
  // Only a coach gets as far as reading the team's addresses.
  const onTeam = await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const rows = await tx
      .select({ name: riders.name })
      .from(riders)
      .where(eq(riders.archived, false));
    return new Set(rows.map((r) => nameKey(r.name)));
  });

  const addresses = addressesIn(lines);
  const open = and(
    eq(invitations.organizationId, ctx.orgId),
    eq(invitations.status, "pending"),
    gt(invitations.expiresAt, new Date()),
  );
  const [members, waiting, [openCount]] = await Promise.all([
    addresses.length === 0
      ? []
      : authDb
          .select({ email: users.email, userId: users.id })
          .from(memberships)
          .innerJoin(users, eq(users.id, memberships.userId))
          .where(
            and(
              eq(memberships.organizationId, ctx.orgId),
              inArray(sql`lower(${users.email})`, addresses),
            ),
          ),
    addresses.length === 0
      ? []
      : authDb
          .select({ email: invitations.email })
          .from(invitations)
          .where(and(open, inArray(sql`lower(${invitations.email})`, addresses))),
    authDb.select({ n: count() }).from(invitations).where(open),
  ]);
  const member = new Map(members.map((m) => [m.email.toLowerCase(), m.userId]));
  const invited = new Set(waiting.map((w) => w.email.toLowerCase()));

  const problems: LineProblem[] = [];
  const linked = new Map<string, string>();
  for (const { line, rider, parents } of lines) {
    if (onTeam.has(nameKey(rider.name))) problems.push({ line, code: "onTeam", value: rider.name });
    for (const { email } of [rider, ...parents]) {
      if (!email) continue;
      const userId = member.get(email);
      // A rider joins with an address of their own; a parent on the team is linked.
      if (userId && email === rider.email) {
        problems.push({ line, code: "emailMember", value: email });
      } else if (userId) linked.set(email, userId);
      else if (invited.has(email)) problems.push({ line, code: "emailInvited", value: email });
    }
  }
  const tooMany = (openCount?.n ?? 0) + addresses.length - linked.size > TEAM_INVITATION_LIMIT;
  if (problems.length === 0 && !tooMany) return { clash: null, members: linked };
  return {
    clash: { done: false, problems, listProblem: tooMany ? "tooManyWaiting" : null },
    members: linked,
  };
}

/** One link per address, on this team; on a failure the ones made are cancelled. */
async function makeLinks(
  ctx: OrgContext,
  headers: Headers,
  addresses: string[],
): Promise<Map<string, IssuedTeamInvitation>> {
  const made = new Map<string, IssuedTeamInvitation>();
  for (const email of addresses) {
    const result = await inviteMember(headers, { email, role: "member" }, ctx.orgId);
    if (result.ok) {
      made.set(email, result.invitation);
      continue;
    }
    await cancelAll(headers, [...made.values()]);
    if (result.error === "forbidden") throw new Refused("forbidden");
    // Somebody invited or added the address since the check a moment ago.
    if (result.error === "alreadyMember" || result.error === "alreadyInvited") {
      throw new Refused("conflict", result.error);
    }
    throw new Error(`bulk invite: an invitation failed (${result.error})`);
  }
  return made;
}

/**
 * Undoing a link is cancelling it: Better Auth keeps a cancelled
 * invitation as a row, as it does every cancelled one, and the link no
 * longer admits anybody. One that cannot be cancelled is logged by
 * `cancelInvitation` and stays under Settings → Arbejdsrum to withdraw.
 */
async function cancelAll(headers: Headers, made: IssuedTeamInvitation[]): Promise<void> {
  for (const invitation of made) await cancelInvitation(headers, invitation.id);
}

async function createRows(
  ctx: OrgContext,
  lines: ListLine[],
  links: Map<string, IssuedTeamInvitation>,
  members: Map<string, string>,
): Promise<CreatedLine[]> {
  const linkFor = (email: string | null): IssuedLink | null => {
    const made = email ? links.get(email) : undefined;
    if (!made) return null;
    return {
      id: made.id,
      url: made.url,
      email: made.email,
      expiresAt: made.expiresAt.toISOString(),
    };
  };
  return withOrgContext(ctx, async (tx) => {
    const created: CreatedLine[] = [];
    for (const line of lines) {
      const input = RiderInput.parse({ name: line.rider.name, birthYear: line.rider.birthYear });
      const rider = await createRiderIn(tx, ctx, input);
      const riderLink = linkFor(line.rider.email);
      if (riderLink) await attachRiderInvitationIn(tx, ctx, rider.id, riderLink.id);

      const parents: CreatedPerson[] = [];
      for (const parent of line.parents) {
        const guardianInput = GuardianInput.parse({ riderId: rider.id, name: parent.name });
        const userId = parent.email ? members.get(parent.email) : undefined;
        if (userId) {
          const guardian = await linkMemberAsGuardianIn(tx, ctx, { ...guardianInput, userId });
          parents.push({ id: guardian.id, name: guardianInput.name, link: null, linked: true });
          continue;
        }
        const guardian = await addGuardianIn(tx, ctx, guardianInput);
        const parentLink = linkFor(parent.email);
        if (parentLink) await attachGuardianInvitationIn(tx, ctx, guardian.id, parentLink.id);
        parents.push({ id: guardian.id, name: guardianInput.name, link: parentLink });
      }
      created.push({
        rider: { id: rider.id, name: input.name, birthYear: input.birthYear, link: riderLink },
        parents,
      });
    }
    return created;
  });
}
