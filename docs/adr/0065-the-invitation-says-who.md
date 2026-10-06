# ADR 0065: The invitation says rider or parent

Status: accepted · Date: 2026-10-06 · Builds on 0004, 0010 · Lifts a trade-off of 0063

## Context

A rider's and a parent's invitation are both Better Auth invitations with
the role "member" (ADR 0010). What sets them apart is the rider or
guardian row a coach prepared, which carries the invitation's id and is
linked to the account on joining (`claim_invitation_links`). The join
page reads the invitation as the auth role, before anybody is signed in,
and the auth role has no grant on riders or guardians. So the page could
say "som træner" for a coach and only the team's name for everybody else
(ADR 0063). A 16-year-old opening a link from a coach, or a parent
opening one about their child, could not tell they had come to the right
place.

## Decision

- **One definer function, `invitation_kind(p_invitation_id text)`**
  (drizzle/0030), the only one the auth role may call. For an invitation
  that is pending and not expired it returns one row: `kind` 'rider' or
  'guardian', and for 'guardian' `rider_first_name`, the first word of
  the rider's name as the coach typed it. Otherwise it returns no row.
- **It counts only a row joining would link**: on the invitation's own
  team, not yet held by an account, and not about an archived rider. A
  rider row wins over a guardian row, as the menu goes by the role with
  the most to do (ADR 0061).
- **The usual shape for a definer**: a fixed search path with pg_temp
  last, `REVOKE ALL FROM PUBLIC`, `GRANT EXECUTE TO kadence_auth` only.
  It is named in `CALLABLE_DEFINER_FUNCTIONS` with its reason.
- **The page decides the words**: a coach's role first ("som træner"),
  then the row ("som rytter", "som forælder til Emma", "som forælder"
  when the name gives no first word), and the team alone when neither.
  The line after says what happens next; for a parent, that the rider
  confirms them first (ADR 0011).

## Trade-offs accepted

- **One more definer reachable before sign-in.** Anyone holding a valid
  link learns one word about it, and for a parent the rider's first
  name. The link is the key: it is random, bound to one address, and
  dead once used, withdrawn or out of date, so the function cannot
  enumerate and answers nothing about an invitation that no longer
  works. The team's name and the inviter's name were already on the
  page; a surname, a birth year, an id or another row never cross.
- **The first word is not always the name a rider goes by.** "Anne
  Sofie Holm" is "Anne" on the page. A parent knows their own child; a
  first name is enough to recognise the invitation, and less is said
  about a minor to whoever holds the link.
- **Archived riders are not named.** An invitation for an archived rider
  or their parent names the team alone, though joining would still link
  the row; saying less is the safe side of a rare case.
