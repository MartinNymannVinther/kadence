# ADR 0052: Trænerrummet, a room for coaches across clubs

Status: accepted · Date: 2026-10-03

## Context

With several clubs on one installation (ADR 0048), Martin asked for "et
lille simpelt community hvor trænere kan skrive sammen og f.eks. dele
råd" (docs/plan-klubber-og-guides.md, section 5, approved 3 October
2026), with DCU's people welcome as a verified organisation.

Every table so far belongs to one workspace and carries `org_id`
(CONTRIBUTING.md's checklist). A room shared across clubs cannot.

## Decision

- **Threads and replies** in six categories — Træning, Styrke, Trivsel,
  Løb og regler, Udstyr and DCU-hjørnet — newest activity first, with a
  count of unread threads beside "Trænerrummet" in the menu.
- **Coaches only.** Reading takes coaching a team somewhere on the
  installation (`app_is_coach_somewhere()`); writing takes coaching the
  active team, which is the club a post is signed with. Riders and parents
  never see the room. There are no private messages at all.
- **The database signs every post.** A BEFORE INSERT trigger sets the
  author, the club and their names from the session; nobody can post as
  someone else or as another club. A BEFORE UPDATE guard lets the author
  change the words, the installation's owner hide, show and lock
  (`app_is_platform_owner()`), and nobody change who wrote it.
- **A session can come along** as a copy of its structure from the
  author's library — never a rider's data — and another coach takes it
  into their own library with one press.
- **Moderation:** any coach reports a thread or a reply; the
  installation's owner sees open reports at the top of the room, hides or
  shows, locks a thread, and marks a report handled. One line under the
  field says what belongs here: "Del erfaringer om træningen, og hold
  rytternes navne ude af det."
- **No AI in the room, and no mail** — Kadence has none; unread threads
  show as a count.
- **Four tables without `org_id`** (threads, posts, reports, read
  markers), each with forced RLS; threads, posts and reports have audit
  triggers. The read markers are a person's own marker, rewritten on every
  visit, and are on the meta-test's list of tables without one. The two
  new definer functions answer true or false about the caller and are on
  its list of callable definer functions.

## Trade-offs accepted

- **An exception to the tenancy checklist.** These tables belong to the
  installation; the policies scope them to coaches instead of to a
  workspace, and the isolation test proves riders and parents read nothing.
- **Left out of a club's export.** A club's export would otherwise carry
  other clubs' coaches' words. A coach's own posts stay readable in the
  room.
- **A deleted account leaves its posts nameless** ("Tidligere træner"):
  removing the posts would break the threads others answered in.
- **The owner is the only moderator.** That is enough for an installation
  of a handful of clubs; more moderators would need a role of their own.
- **A self-hosted club gets an empty room of its own.** The room is per
  installation, which the documentation says plainly.
- **DCU as a verified organisation** comes when DCU says yes: its people
  would join as coaches of a DCU workspace, and their club name already
  shows beside their posts.
