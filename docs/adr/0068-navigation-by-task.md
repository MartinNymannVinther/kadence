# ADR 0068: Navigation by task — groups with icons, knowledge back in the menu, the team's name as the switcher

Status: accepted · Date: 2026-10-07 · Amends ADR 0061 (one menu per role) and ADR 0047 (the open pages' corner) · Backlog N-01

## Context

ADR 0061 gave each role its own menu, but the review of `main` on 7
October 2026 found the result still hard to read. A coach met eleven
items in one flat column on a computer, with no groups and no icons.
Knowledge was scattered: "Viden og beregnere" was reachable only through
a line on Hjælp, the coach guide only through a card on Hjælp, and the
parents' guide was what "Forældre" showed a coach. A signed-in person
who opened an open guide fell out of the app's frame, with only a small
"Til Kadence" in the corner. Settings put the person's own pages, the
team's and the installation's in one undivided list. "Skift arbejdsrum"
took a row at the foot of the menu, although most people are on one
team. A rider's bottom bar held only three places. Martin approved the
structure below on 7 October 2026.

## Decision

- **One structure for every role, in small groups by task**, decided by
  `menuGroups` in `src/app/[locale]/(app)/nav-items.ts` (pure, tested).
  The day comes first without a header; then the groups, always in this
  order and only when they hold something: Planlægning (a coach) or
  Træning (a rider), Holdet, Værktøjer, Viden.
  - **coach:** I dag · Planlægning: Kalender, Sæson, Bibliotek · Holdet:
    Ryttere, Klubmester\*, Trænerrummet\* (with its unread count) ·
    Værktøjer: Rulle · Viden: Viden og beregnere (`/guides`), Trænerguide
    (`/help/coach`), Forældreguide (`/parents`), Hjælp. A coach who also
    rides gets Mig after I dag. A coach who is also a parent gets Barnet
    (`/parents`) after that, and the Forældreguide entry then jumps to the
    guide on the same page (`/parents#parent-guide`), so one page is never
    lit twice.
  - **rider:** I dag, Kalender, Mig · Træning: Bibliotek, Sæson, Rulle ·
    Holdet: Klubmester\* · Viden: Viden og beregnere, Hjælp. A rider who
    is also a parent gets Barnet after Mig (it was "Forældre" before).
  - **parent:** Barnet, Kalender · Holdet: Klubmester\* · Viden: Viden og
    beregnere, Hjælp.
  - **member** (none of the above yet): I dag, Kalender · Viden: Viden og
    beregnere, Hjælp.

  \* only where the installation has it on (ADR 0057) and, for
  Klubmester, the club keeps one (ADR 0051), as before.

- **An icon on every place**, the same in the sidebar, the "Mere" sheet
  and the bottom bar (`nav-icons.ts`). Where Kadence already drew a place
  with an icon, it keeps it: the compass of the card to the open guides,
  the open book of the coach guide. Group headers are quiet text in the
  label token, not headings: each group is a list named by its header
  (`aria-labelledby`), so a screen reader hears "Planlægning, list, 3
  items" and the page's own outline stays the page's. The lit place is
  the closest match (`activeHref`), so on `/help/coach` the coach guide
  is lit and Hjælp is not.
- **The bottom bar** below lg: coach I dag · Kalender · Ryttere ·
  Bibliotek · Mere; rider I dag · Kalender · Bibliotek · Mig · Mere;
  parent Barnet · Kalender · Viden · Mere; member I dag · Kalender ·
  Mere. "Viden" is the bar's short word for "Viden og beregnere". "Mere"
  opens the same grouped list as the sidebar. The sheet now scrolls as
  one, so a coach's list that is longer than a phone does not hide its
  end inside a fixed frame; settings and the person follow the list.
- **The team switcher is the team's name** under the wordmark, at the
  top of the sidebar and the sheet. It is a button with a chevron, read
  as "<team>, Skift hold", only when there is somewhere to switch to:
  another team (counted on the server by `teamCount`, on the auth role,
  like the membership check beside it), or for the installation's owner a
  new workspace to create (ADR 0048). Otherwise it is plain text. The
  separate "Skift arbejdsrum" row is gone. Switching and creating work as
  before, under the same checks.
- **Settings in sections** (`settingsGroups`): Dig (Mig, Enheder for a
  rider, Sikkerhed, and Data for anyone who is not a coach), Holdet for
  coaches (Holdet, Arbejdsrum, AI, Data), Installationen for the owner
  (Adgang, Installation), and Om last on its own. Same addresses, same
  guards; on a narrow screen the row scrolls sideways with each section's
  name over its tabs and a hairline between them.
- **The open pages lead back.** For a signed-in visitor the open header
  says "Tilbage til Kadence" with an arrow (to `/today`), 44px tall on a
  phone. The layout reads the session as it already did; without a
  session cookie Better Auth answers before it looks anything up, so an
  anonymous visitor pays nothing more than the cookie check.

## Trade-offs accepted

- **A longer list for coaches**, though grouped: twelve places with
  everything on, fourteen for a coach who also rides and is a parent.
  The groups make it scannable, and on a computer it still fits 860px
  without scrolling (items at 34px instead of 40px). On a phone a coach
  scrolls the "Mere" sheet.
- **Parents see a Viden tab in their bar.** It leaves the app's frame for
  an open page; the open header's "Tilbage til Kadence" is the way back.
  A parent's bar has room, and the guides on sleep, school, food and
  classes are written for them.
- **Two entries can share a page.** Forældreguide is `/parents` for a
  coach — the page that is the parents' guide when there is no child —
  and Barnet is `/parents` for a parent. For a coach who is both, the
  guide's entry carries an anchor instead; it is never lit, Barnet is.
- **A rider-parent's entry is renamed** from "Forældre" to "Barnet",
  because the menu is read as the person, and the today page's link no
  longer names a menu item ("Se dit barns uge").
- **Parents keep Klubmester** where it is on, in a Holdet group of one;
  the approved list did not name it, and taking away a place parents had
  would be a decision of its own.
- **The owner on one team still sees a switcher,** because creating a
  workspace lives there (ADR 0048).
- **In the sheet the product's name is not a link**, as it was before:
  the phone's header already leads home, and a 21px link would be a
  target a thumb misses.
