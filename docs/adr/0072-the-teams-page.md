# ADR 0072: The teams page — Danish U19 and U23 teams, read from the lists

Status: accepted · Date: 2026-10-08 · Builds on 0013, 0023, 0039, 0047, 0057 · Amends 0013 (points on an open guide) · Amended the same day (photographs from Commons, jersey patterns) and by ADR 0085 (a daily job refreshes it)

## Context

"Klasserne og vejen videre" (ADR 0047) tells parents and riders who are
new to the sport how a rider moves on: a club until U17, a junior team
from U19, a Continental or development team from U23. It does not say
which teams there are. Martin asked for a page that does — Denmark's
U19 and U23 teams, the foreign teams Danish juniors ride for, who rides
where, jerseys, official contacts and points — and for the system to
keep it up to date from real sources, daily or at a sensible pace.

The research is docs/research/teams.md. Two public sources answer
software that says who it is: the UCI's DataRide, behind uci.org's
rankings, and Cykling Danmark's team list and points lists. Neither has
an API or terms for reuse; DCU has not yet said yes to being read (ADR
0039), and Martin meets DCU the week after this page was built.

## Decision

- **One open page, `/guides/teams`, under Viden** (ADR 0047), linked
  from the hub and from the classes guide's section on teams. Parked by
  `GUIDE_TEAMS=off` like the other open pages (ADR 0057).
- **The teams come from the lists, not from memory.** Cykling Danmark's
  team list gives every registered Danish team by level — UCI
  Continental, DCU elite men and women, U19 men and women — with the
  club behind it, the team manager and the address DCU publishes. The
  UCI's World Ranking (U23) filtered to Denmark gives the Danish U23
  riders with their teams, and so the foreign teams they ride for; DCU's
  U19 points lists give the juniors with their teams, and so the foreign
  teams juniors are licensed with. Last season's U19 lists say who rode
  abroad last year.
- **Points are shown for U19 and U23**, by Martin's decision (8 October
  2026): "here it is actually a thing that matters". The UCI's for U23
  (the UCI has no individual junior ranking on the road), DCU's for U19
  and for U23 riders in class A, each with the rider's place on the list
  and the date the list was read. ADR 0013 — no leaderboards for a young
  rider's own results inside the app — still holds; this is an open
  guide about the sport's teams, read from lists the sport already
  publishes, and it shows no rider's result in Kadence.
- **A rider sits with a team only when a list says so.** A club in the
  list's team column is no team, and the rider is left out; names are
  matched on letters alone (`normalise.ts`), and a rider on two lists —
  "Sylvester Stokbro" at the UCI, "Sylvester Vittinghus Stokbro" at DCU
  — is one line by first and last name and birth year.
- **The registry adds, it never gates.** `src/modules/teams/registry/teams.json`
  holds what no list has: where a team is at home, its website, the
  colours its jersey is drawn from, the names the sources write it by,
  and when a person last checked. A team a list has that the registry
  lacks is still shown, with a neutral jersey; with Cykling Danmark off,
  the registry's Danish teams are shown alone, without contacts or
  points, and the page says so.
- **Jerseys are drawn, not copied.** One hand-drawn jersey in Kadence's
  line (`components/teams/jersey.tsx`), filled from the registry's
  colours and laid out by its pattern — a chest band, stripes, the upper
  body or one half; a team without checked colours wears a neutral one
  with its initials and the words "farver ikke tjekket". No logo: that is
  the team's own.
- **Photographs come from Wikimedia Commons, copied, with credit.** A
  person names a file per team in the registry after looking at the
  photo and its licence; on refresh Kadence asks Commons' API for the
  640-pixel rendering, the photographer and the licence, refuses any
  licence outside CC0, public domain and CC BY(-SA), copies the rendering
  to `TEAMS_DIR/photos/` and serves it from `/api/teams/photo/<id>` with
  the credit line linked to the file's page. A reader's browser never
  reaches Commons. Sites that show kits behind a challenge page
  (ProCyclingStats, FirstCycling) are not read.
- **Contacts are the ones DCU publishes.** The team manager's name and
  the address on DCU's own page, as DCU lists them for the team; nothing
  looked up elsewhere. The registry never holds a person.
- **A snapshot on disk, no table.** What the sources answered is one
  JSON file in `TEAMS_DIR` (`./data/teams`, a volume in production,
  beside the map, ADR 0023). The sources are public and the same for
  every team in the installation: a row with an `org_id` would be a lie,
  and a table without one would break the rule every table keeps.
- **Refreshed by age, not by visitors.** Kadence has no scheduled job
  (ADR 0039), so the page asks: a snapshot older than a day is read
  again, one read at a time across the process, after the answer has
  gone to the reader (`after()`); only an empty snapshot is waited for.
  A source that failed is tried again after an hour and keeps its last
  good answer meanwhile, and the page says when each source was read and
  whether the latest read failed. A visitor cannot start a read.
- **The same manners as the results reader** (ADR 0039): one request at
  a time, no redirect followed, the answer capped, the request saying
  who is asking — Kadence and the installation's address — so a host
  can see it and say no. Cykling Danmark is read only while `TEAMS_DCU`
  is on; it is on by default so Martin can show DCU the page, and off is
  one variable away.
- **Every id is looked up.** The season, the ranking, the country and
  DCU's class ids are read from the sources' own forms on each read, so
  a new season needs no change in code.

## Trade-offs accepted

- **Reading Cykling Danmark before DCU has said yes.** The member portal
  does not withhold its pages from software and names no terms, and the
  team list is DCU's public page; still, this is reading a site that has
  not been asked. It is on so it can be shown, and `TEAMS_DCU=off` turns
  it off without a deploy. If DCU says no, off it goes, and the page
  keeps the UCI's part and the registry.
- **Undocumented endpoints break without notice.** DataRide's grid
  endpoints are read as its own pages read them; a change there leaves
  the page with its last snapshot and the word that the latest read
  failed, until the reader is fixed. The fixtures in `tests/teams` are
  the shapes as they were on 8 October 2026.
- **Colours are a person's work.** Every Danish team has colours, read
  from Cykling Danmark's PDF of approved kit designs for the season;
  five foreign teams have theirs from Commons photographs or their
  sponsors' well-known kits, and the rest wear neutral jerseys until
  someone who knows fills the registry in. The page says which is which
  rather than guessing. A new season means reading the new PDF once.
- **The cache may not be writable.** A named volume made before the
  image owned `/data/teams` is root's, and the app cannot write into it.
  The page then keeps its snapshot in memory, logs why, and reads the
  sources again after a restart; docs/deploy.md says how to fix the
  volume once. The page never answers 500 for a cache it could not keep.
- **A photograph is a person in a jersey.** The photographs are of
  teams at public races, published by their photographers under licences
  made for reuse, and show the team as a team; still, a rider who wants
  a photo gone asks, and the file name comes out of the registry.
- **Team managers' addresses on an open page.** They are what DCU
  publishes for the team on its own open page, for this purpose. The
  snapshot holds them on the installation's disk, never in the
  repository; the test fixtures have every person's name and address
  replaced.
- **The first visitor after a cold start waits** for the sources —
  about ten requests, a few seconds — once. Everyone after reads the
  snapshot.
