# ADR 0054: Every part of the product in the demo, and the demo kept out of Trænerrummet

Status: accepted · Date: 2026-10-04 · Amends ADR 0005 and ADR 0052 · Amended by ADR 0057 (the demo follows the installation's flags)

## Context

Martin wants to show the concept, and asked that the demo illustrates
every function, Trænerrummet with example threads included.

While planning it we found a hole from ADR 0052. A demo visitor is the
coach of their demo workspace, so `app_is_coach_somewhere()` let them
into the installation's Trænerrum. With `DEMO=on`, an anonymous visitor
could read real coaches' posts and write to them. It was on main, not yet
deployed.

## Decision

- **A demo never sees the installation's room.** `app_is_coach_somewhere()`
  now counts real workspaces only. A new definer function,
  `app_demo_room()`, answers whether the active workspace is a demo,
  because the application role cannot read `demo_workspaces`.
- **Each demo has a room of its own.** `community_threads.demo_org_id`
  ties a thread to its demo and is deleted with it. The policies decide
  by room through `app_in_room(demo_org_id)`:
  - the installation's room is for a coach of a real workspace who is not
    in a demo right now;
  - a demo's room is for that demo's coach.

  Replies, read markers and updates follow their thread. The stamp puts
  every thread in the session's room, and the guard never lets one move.
  A demo cannot report, because nobody receives a report there, and the
  page hides the button. Anything demo visitors had already written in
  the installation's room is deleted by the migration.

- **Example threads from made-up coaches.** Seven threads, covering all
  six categories, from four invented coaches in invented clubs, with
  replies and one session to take into the library (`room-data.ts`).
  The seed writes them as the demo's coach with `app.demo_seed` on. Only
  in a demo does the stamp then keep the given names and sign them with
  no account and no club, and the policies accept an unsigned post only
  in a demo's room.
- **The rest of the product is on in the demo** (`showcase.ts`):
  - the club's logo and picture, drawn by code as PNG (`club-images.ts`,
    `png.ts`), with no image files and no library;
  - a rider's own session;
  - the club championship turned on, with the last finished season's
    three rounds, the year before on the same time trial course (so
    "Personlig rekord" and "Årets fremgang" show) and earlier champions;
  - "Lav intensitet først" turned on.

  The page tells a demo visitor that the room is the demo's own and the
  threads are examples.

## Trade-offs accepted

- **A setting can unsign a post in a demo.** Within a demo's own room,
  a session that sets `app.demo_seed` may write as a made-up coach. The
  room is the visitor's sandbox, and it is deleted after 24 hours. No
  other room, and no real person, can be written as.
- **The demo's room is lonely.** Example threads are fixed texts, and a
  visitor's reply is answered by nobody. That keeps anonymous visitors
  and real coaches apart, which matters more.
- **The owner's overview and moderation are not in the demo.** They take
  owning the installation, which a demo visitor never does.
- **Settings that are off for a new team are on in the demo.** A visitor
  sees the club championship and the profile at work, and a new team
  still starts with both off.
