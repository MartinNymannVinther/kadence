# ADR 0061: One menu per role, a bottom bar on the phone, and the guides out of the signed-in menu

Status: accepted · Date: 2026-10-06 · Amends ADR 0007 (named heading steps) and ADR 0047 (the hub's entry points)

## Context

The review of `main` on 5 October 2026 (docs/plan-fokus-vinter.md) found
one long menu for everybody: eleven items for a coach, nine for a rider,
and the same library, season and Rulle for a parent who never plans a
session. On a phone the whole list sat behind a burger in the top
corner, out of a thumb's reach, and the demo stripe took about 40 % of
the first screen. A page title at 33px broke Danish words in two on a
phone.

The goal of the winter is a coach who lays out the team's week in five
minutes on a phone, and a rider who spends twenty seconds a day.

## Decision

- **One list per role**, decided by a pure function
  (`src/app/[locale]/(app)/nav-items.ts`) from who the person is on the
  team and what the installation (ADR 0057) and the club have turned on:
  - **coach:** I dag, Kalender, Ryttere, Bibliotek, Sæson, Forældre,
    Rulle, then Klubmester when the installation has it and the club
    keeps one, Trænerrummet when the installation has it, and Hjælp. A
    coach who also rides gets Mig after Ryttere.
  - **rider:** I dag, Kalender, Mig (`/me`), Bibliotek, Sæson, Rulle,
    Klubmester when it is on (the one place riders see placings, ADR
    0051), then Hjælp.
  - **parent:** the page about the child (`/parents`, called "Barnet" in
    the menu), Kalender, Klubmester when it is on, and Hjælp.
  - A person who is more than one follows the role with the most to do:
    coach, then rider, then parent.
- **A bottom bar below lg** — phones and an iPad held upright — with the
  few places a role goes every day and "Mere" for the rest. Coach: I dag ·
  Kalender · Ryttere · Bibliotek · Mere. Rider: I dag · Kalender · Mig ·
  Mere. Parent: Barnet · Kalender · Mere. "Mere" opens the sheet the
  burger used to open, with the role's whole list, the team switcher,
  settings and the person; a dot on it says something new waits there.
  The bar stands on the safe area (`viewport-fit=cover`), its targets are
  at least 44px, it is out of print, and never on Rulle. The content
  column keeps its height free (`--bottom-bar`), so nothing hides behind
  it. From lg the sidebar is unchanged in place.
- **The open guides and calculators leave the signed-in menu.** They are
  open pages (ADR 0047), linked from the landing page — now on a phone
  too — from the parents' page, and from a line at the top of Hjælp.
- **Settings by role.** Coaches keep Holdet, Arbejdsrum and AI. A rider's
  settings are Mig, Enheder, Sikkerhed, Data and Om; a parent's Mig,
  Sikkerhed, Data and Om. Data stays for everyone: it is the one-click
  way out (dogma three). Every settings page still decides on the server
  what the caller may see and do; a tab that is not shown is only a tab.
- **The shell around it.** The demo stripe is one line ("Demo · slettes
  om 23 t", the switch between the three people, "Ansøg") with the
  explanation behind an info button. The heading sizes are named steps
  above ADR 0007's small ones (`text-title-page`, `-detail`, `-section`,
  `text-heading`, `text-brand`), and every page title is 26px below sm.
  `shadow-surface` names the card's lift. Small buttons and selects grow
  to 40px (sm) and 36px (xs) on a phone without changing desktop's
  density. The library is "Bibliotek", the word CLAUDE.md uses.

## Trade-offs accepted

- **A coach's less-used places are one tap further away on a phone.**
  Sæson, Forældre, Rulle, Klubmester and Trænerrummet live behind
  "Mere". The bar holds what a week is planned with; the season is set
  up a few times a year.
- **Parents no longer see the library, the season or Rulle in the menu.**
  The pages still answer a parent who has a link, under the same rules
  as before. A parent follows one rider and does not plan sessions; the
  menu says so.
- **A rider's settings drop Arbejdsrum and AI.** "Forlad holdet" lives on
  the workspace page, so a rider who wants to leave a team now reaches it
  by its address or through a coach; it is rare, and a page of members
  and model choices is not a rider's.
- **Two labels for one page.** `/parents` is "Forældre" for a coach and
  "Barnet" for a parent, because each reads the menu as themselves.
- **The page reaches under the home indicator** (`viewport-fit=cover`).
  The body keeps clear of a notch on a phone on its side, and fixed bars
  pad themselves; anything new and fixed must do the same.
