# ADR 0105: A session's exercises lead to the library, and a session prints

Status: accepted · Date: 2026-10-20 · Builds on ADR 0044 (a better builder) and 0067 (exercises and programmes)

## Context

A strength session laid in from a programme ("Læg i kalenderen") showed
each exercise's figure and how-to, but no way to the exercise itself in
the library. A session a coach wrote by hand never showed either: the
builder suggests names while one is typed (ADR 0044), but choosing one
filled sets and reps and never tied the exercise to the library, so the
session had only the name. And no session could be printed, though the
library's programmes could. The product owner's words: "mulighed for at
se øvelserne beskrevet herfra. eller måske et link til øvelsen i
biblioteket", and "printe træningspasset her i pdf format".

## Decision

- **An exercise from the library links to it.** Where the session shows
  the figure and how-to, "Se øvelsen i biblioteket" leads to the
  exercise's page (`exerciseHref`), for every reader who may see it.
- **The builder offers the library's exercises, and choosing one ties
  the exercise to it.** The suggestions are the library's own first,
  Kadence's and the team's, archived ones left out, then DCU's and the
  short catalogue's whose names the library does not already hold. A
  name among the library's sets the exercise's `ref`; one of DCU's
  removes it. A name of the coach's own keeps the tie the exercise had,
  so "Kat og ko, langsomt" still shows the cat-cow. Under the name the
  editor says the exercise is from the library, with "Fjern koblingen"
  to undo it. The rules are pure (`src/modules/workouts/exercise-choice.ts`).
- **The library's suggestions come from a route**,
  `GET /api/exercises/choices?locale=`, and not from an action. It is a
  read, and the client runs server actions one at a time, so the builder
  opening while another action was pending waited for it, and in the
  first build never got its answer. Every member reads the library, so
  the route asks for a session and no role.
- **Any session prints, or saves as a PDF, from the browser's own dialog.**
  The printed page keeps what the session is and how to do it: the day,
  the rider, the title, the description, the warm-up, the exercises with
  their figures and how-to, a bike session's steps. It leaves out what is
  for the screen: the menu, the plan mark, "Udført", the comments and the
  buttons. A strength exercise gets a box for every set to write the
  weight and the reps in, or to tick off for mobility (`StrengthLog`). The
  calendar's panel sits over a page of its own, so there the button opens
  the session's page with `?print=1`, which prints itself once and drops
  the parameter. The file is named after the rider, the session and the
  day.

## Trade-offs accepted

- **The tie follows the name, not a picker.** A coach who rewrites a
  tied exercise's name as another exercise altogether keeps the first
  one's figure until the name matches something else, or the tie is
  removed. The editor says when an exercise is tied, so this can be seen.
- **Sessions written before stay as they are.** Nothing goes back and
  ties the exercises of sessions already in the calendar. DCU's strength
  programmes and the senior programme name machine and barbell exercises
  the library does not have yet, so their sessions still show names and
  DCU's notes only. Drawing and describing those exercises is its own
  piece of work, checked against DCU's material.
- **Printing is the browser's.** There is no PDF library and no server
  rendering (dogma two). What a sheet looks like depends a little on the
  browser, and a home-screen app on some phones may not offer printing,
  as with the programmes.
