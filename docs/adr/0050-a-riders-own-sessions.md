# ADR 0050: A rider's own sessions

Status: accepted · Date: 2026-10-03

## Context

Building was a coach's (ADR 0010): the library is the team's, and a
rider could plan its sessions into their own calendar but not make one.
Martin asked that a rider can build their own sessions — personal, seen
by the coach, and possible to take into the team's library
(docs/plan-klubber-og-guides.md, section 8, approved 3 October 2026).

## Decision

- **A rider's own session is a template with a rider.**
  `workout_templates.rider_id` is null for the team's library and set for
  a rider's own; `copied_from` remembers the rider's session a coach took
  into the library. No new table.
- **RLS** (drizzle/0021): the team's library reads and writes as before
  (everyone reads, coaches write). A rider's own reads as the rider's
  training reads — the coaches, the rider, and the parents when the rider
  shares training (`app_can_read_rider(rider_id, 'training')`) — and is
  written by the rider or a coach (`app_can_write_rider`). The check
  forbids moving a rider's session into the library and marking it as
  DCU's.
- **The library** shows the team's sessions as before; below them a rider
  sees "Mine pas", with "Nyt cykelpas" and "Nyt styrkepas", and a coach
  sees "Rytternes egne pas" with the rider's name and "Tag ind i holdets
  bibliotek" — a copy the team owns, while the rider's stays the rider's.
- **The builder** is the same one, without "Byg med AI", which stays a
  coach's (ADR 0038).
- **A rider's own session goes into that rider's calendar only.**
  Scheduling it for anyone else is refused; a coach takes it into the
  library first. The rider's calendar offers their own sessions beside
  the team's.
- The AI's week drafts and the pickers for blocks and Rulle read the
  team's library only.

## Trade-offs accepted

- **One table for two owners.** A rider's session and the team's share
  `workout_templates`, so every read of the library now filters on
  `rider_id`. A second table would have duplicated the structure, the
  builder's save and the scheduling for little gain.
- **A coach reads, and can change, a rider's own session.** The database
  allows a coach to write it, as for the rider's other training; the
  interface offers the coach only "take into the library".
- **A copy, not a link.** A session taken into the library does not
  follow later changes to the rider's own; that keeps the team's library
  the coaches' and the rider's session the rider's.
