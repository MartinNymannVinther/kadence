import type { CreatedLine } from "@/modules/team/bulk-invite";

/**
 * The people an invitation link goes to, one row each: a rider, or a
 * parent with the riders they are a parent of — one row for a parent of
 * two, since siblings' parent has one link (docs/adr/0064). Built from
 * what "Inviter hele holdet" just made, or from the team's rows and its
 * open invitations for "Links, der venter".
 */

export type RecipientLink = { url: string; email: string; expiresAt: string };

export type Recipient = {
  key: string;
  name: string;
  kind: "rider" | "parent";
  /** For a parent: the riders' names. */
  children: string[];
  link: RecipientLink | null;
  /** A parent already on the team, linked to their account: no link to share (P2-16). */
  linked?: boolean;
};

type Collect = {
  add: (recipient: Omit<Recipient, "children">, child?: string) => void;
  list: () => Recipient[];
};

/**
 * Rows in order, a parent's further children folded into the first row
 * with the same link — or, for a parent linked to their account, the same
 * name.
 */
function collector(): Collect {
  const rows: Recipient[] = [];
  const byLink = new Map<string, Recipient>();
  return {
    add(recipient, child) {
      const key = recipient.link
        ? `${recipient.kind}:${recipient.link.url}`
        : recipient.linked
          ? `linked:${recipient.name}`
          : null;
      const shared = key ? byLink.get(key) : undefined;
      if (shared) {
        if (child && !shared.children.includes(child)) shared.children.push(child);
        return;
      }
      const row = { ...recipient, children: child ? [child] : [] };
      rows.push(row);
      if (key) byLink.set(key, row);
    },
    list: () => rows,
  };
}

export function recipientsFromCreated(lines: CreatedLine[]): Recipient[] {
  const out = collector();
  for (const { rider, parents } of lines) {
    out.add({ key: rider.id, name: rider.name, kind: "rider", link: rider.link });
    for (const parent of parents) {
      out.add(
        {
          key: parent.id,
          name: parent.name,
          kind: "parent",
          link: parent.link,
          linked: parent.linked ?? false,
        },
        rider.name,
      );
    }
  }
  return out.list();
}

type Row = { id: string; name: string; userId: string | null; invitationId: string | null };

/** The riders and parents whose link is still open: invited, not yet joined. */
export function waitingRecipients(input: {
  riders: Row[];
  guardians: (Row & { riderId: string })[];
  pending: { id: string; url: string; email: string; expiresAt: Date }[];
}): Recipient[] {
  const open = new Map(input.pending.map((p) => [p.id, p]));
  const linkOf = (row: Row): RecipientLink | null => {
    const invitation = !row.userId && row.invitationId ? open.get(row.invitationId) : undefined;
    if (!invitation) return null;
    return {
      url: invitation.url,
      email: invitation.email,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  };
  const names = new Map(input.riders.map((r) => [r.id, r.name]));
  const out = collector();
  for (const rider of input.riders) {
    const link = linkOf(rider);
    if (link) out.add({ key: rider.id, name: rider.name, kind: "rider", link });
  }
  for (const guardian of input.guardians) {
    const link = linkOf(guardian);
    const child = names.get(guardian.riderId);
    if (link && child) {
      out.add({ key: guardian.id, name: guardian.name, kind: "parent", link }, child);
    }
  }
  return out.list();
}

/** "Emma" from "Emma Holm": a greeting uses the first name. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
