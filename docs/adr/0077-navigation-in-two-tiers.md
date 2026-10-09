# ADR 0077: Navigation in two tiers — four places and Mere, Overblik, one door to knowledge, and a search

Status: accepted · Date: 2026-10-09 · Amends ADR 0061 (one menu per role), ADR 0068 (groups by task), ADR 0063 (the coach's Today) and ADR 0047 (the open pages' entry points)

## Context

ADR 0068 gave the menu groups and icons, but on 8 October 2026 Martin
asked for a navigation that was easier to find one's way in and put the
most used parts within reach. A review of `main` that day found:

- A coach's most important task, laying the team's week, was a button
  inside the calendar's team view. The front page "I dag" showed the
  team's sessions today and one number for attention, and sent the coach
  on to the calendar for both the week and the attention list.
- The menu held four groups and up to fourteen places for a coach. Four
  of them were knowledge, used least. Sæson and Rulle stood beside
  Kalender although they are opened a few times a year.
- The words pointed several ways: "Mig" was both the rider's page and a
  tab under Indstillinger; "Barnet" and "Forældre" were one page; "Viden
  og beregnere", "Trænerguide", "Forældreguide" and "Hjælp" were four
  doors into the same room.
- There was no quick way to one rider or one session template: Kalender
  → choose the rider, or Ryttere → the rider → Se kalenderen.
- Riders' comments and check-in notes could be read only one session or
  one check-in at a time.

Martin approved an HTML mock-up of the proposal on 9 October 2026
(`docs/mockups/navigation/index.html`) and answered its six questions:
Overblik as the coach's front page; "Nyt fra rytterne" included; search
now; the rail in dark moss with a choice under Indstillinger; the
check-in on the rider's front page; Trænerrummet and Klubmester kept
under Mere.

## Decision

- **Two tiers for every role** (`src/app/[locale]/(app)/nav-items.ts`,
  pure and tested). The primary places — at most four — are the same in
  the sidebar on a computer and in the bar on a phone, in the same order
  and with the same icon, whatever the installation has turned on. The
  rest is "Mere": a smaller list under the primary ones in the sidebar,
  and the sheet behind the bar's last place on a phone, closed by
  Indstillinger.
  - **coach:** Overblik · Kalender · Ryttere · Bibliotek; Mere: Mig (a
    coach who rides), the child (a coach who is a parent), Sæson, Rulle,
    Klubmester\*, Trænerrummet\*, Viden og hjælp.
  - **rider:** I dag · Kalender · Mig · Bibliotek; Mere: the child (a
    rider who is a parent), Sæson, Rulle, Klubmester\*, Viden og hjælp.
  - **parent:** the child · Kalender · Viden og hjælp; Mere: Klubmester\*.
  - **member:** I dag · Kalender; Mere: Viden og hjælp.

  \* where the installation has it on (ADR 0057) and, for Klubmester, the
  club keeps one (ADR 0051).

  The child's place is named by the child's first name, where the parent
  may see it; "Børnene" with more than one; "Barnet" while the link waits
  for the rider's yes or the rider does not share their training.

- **The rail in dark moss**, by default. The sidebar and the "Mere"
  sheet wear `.sidebar-moss` (`src/app/theme.css`), which re-points the
  tokens the rail reads on the rail itself, so the page beside it keeps
  its paper and the bar at the foot of a phone stays on the page's
  ground. The choice between moss and paper is this device's, kept in a
  cookie the server paints the first pass from, and made under
  Indstillinger → Profil together with light or dark. The pairs the rail
  shows are held to WCAG AA in `tests/meta/contrast.test.ts`.
- **One word per place.** The settings tab "Mig" is "Profil", so "Mig" is
  only the rider's own page. The coach's front page is "Overblik": the
  coach's unit is the week, not the day. "Viden og hjælp" is one door
  (`/help`) with how Kadence works, both guides and the open pages behind
  it; the four knowledge entries of ADR 0068 are gone from the menu. The
  parents' guide lives at `/help/parents`; `/parents` is the child's page
  with a card leading to the guide.
- **Overblik** answers "what now?" for a coach: a card about next week —
  planned or not, how many riders have sessions, holidays, races and
  other events in it — leading to the planner for that week; the three
  riders most worth a look, with the way to each; "Nyt fra rytterne", the
  riders' own comments and check-in notes of the last fourteen days,
  newest first, read under the same RLS as everything else
  (`src/modules/team/news.ts`); then the team's day and the week's
  events as before. "Planlæg ugen" and "Holdets uge" stand in the page's
  top.
- **Søg**: one field that finds a rider, a session template or a page —
  ⌘K or Ctrl+K on a computer, a button under the lockup, the magnifier
  in the phone's header. The index is read through the ordinary services
  under RLS (`src/modules/search`), so a rider finds themselves and the
  library, a parent their children, a coach the team; pages and help
  topics come with the menu. Matching ignores case and diacritics and
  ranks a hit at the start of a word first.
- **The rider's I dag** keeps the check-in inline — three questions and
  "Gem" first, the rest behind "Mere" (backlog P2-11) — tightened so the
  three questions and the button fit a phone's first screen once the
  first steps are put away.
- **Smaller doors on the way:** the library's four buttons are "Nyt pas"
  with its three ways and a menu for DCU's programmes; the riders are
  found by name and narrowed by class, and each row carries the week's
  open flags as marks; Mig and a rider's page for the coach have a row of
  their parts under the title.

## Trade-offs accepted

- **A coach who also rides or is a parent finds Mig and the child under
  Mere**, not in the bar. The bar is the same four places every day; the
  own page and the child are one tap further, and Overblik links to them.
- **Rulle and Sæson are one tap further for everyone.** Rulle is reached
  from "Kør indendørs" on the day's session, and Sæson from the
  calendar's hours, where they are wanted; the menu's Mere holds both.
- **Knowledge is one place.** A coach who wants the coach guide opens
  Viden og hjælp first; the guide's card is at the top of it. The help
  page is longer, and `/help/coach` and `/help/parents` keep their own
  addresses.
- **The rail's colour is a preference per device**, like light or dark,
  not a setting on the account: a cookie, no table, no migration, and a
  coach on two computers chooses twice.
- **Dark moss raises the rail's contrast against the page** and costs a
  second set of tokens to keep in step with the palette. The paper rail
  is one click away for anyone who prefers it.
- **"Nyt fra rytterne" is a new reading** across comments and check-in
  notes. It shows only what the riders themselves wrote, never a coach's
  or a parent's words, and never more than fourteen days back; answers
  are written in the session's own thread, as before (ADR 0012).
- **The search index is fetched when the palette first opens** and kept
  for the page's life: a rider added a minute ago appears after a
  reload. Keeping it fresh on every keystroke would be a request per
  letter for nothing.
- **The parent's bar still leaves the app's frame** for the open pages
  from Viden og hjælp (ADR 0068); the open header's "Tilbage til Kadence"
  is the way back.
