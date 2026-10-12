# ADR 0092: Sessions, programmes and weeks for a motionist — Kadence's own content, offered only where there is an adult

Status: accepted · Date: 2026-10-12 · Amends ADR 0091 (the team's plans include seniors; the week planner, the group's AI week, the builder and a strength series read the profile) · Builds on 0014, 0025, 0035, 0038, 0041, 0043, 0053, 0054, 0059, 0067, 0078 · docs/research/motionist-pas-og-programmer.md

## Context

ADR 0091 gave a rider past U23 a training profile, Motionist (about 5
hours a week) or Supermotionist (about 10), with Kadence's own hours,
corridor, longest ride and strength rhythm. It left the rest on DCU:
the library had DCU's programmes for national-squad youth, Rulle offered
DCU's interval forms, the group's AI week, the week planner's chips and
"Byg med AI" read DCU's classes only, a repeated strength session's hint
was DCU's two or three a week, and "Opret sæsonplaner for alle" skipped
seniors. On 12 October 2026 Martin asked Kadence to find out what fits a
motionist and a supermotionist, and to make sure there are programmes
and a way to plan their weeks.

Youth riders stay the focus. Nothing may change for U17–U23.

## Decision

- **Kadence's own content, in pure modules with sources.**
  `src/modules/paradigms/senior-sessions.ts` holds twelve bike sessions
  (recovery, endurance of 60, 90 and 120 minutes, long rides of 2½ and 4
  hours, tempo 2 × 20, threshold 3 × 10, VO2max 4 × 4, Rønnestad's 3 ×
  13 × 30/15, hill repeats 6 × 2, and a 45-minute trainer session), each
  with its profiles, intensity, when in the season and source.
  `senior-strength.ts` holds two programmes in DCU's shape with a
  progression: **Motionist styrke** at home (body weight and a band, the
  whole body and jumps for the bones, about 35 minutes) and
  **Supermotionist styrke** after Rønnestad (half squat, one-legged leg
  press, hip flexion, calf raise, 10 RM towards 4–5 RM over about twelve
  weeks, then once a week). `senior-weeks.ts` holds four one-week forløb
  per profile — winter, spring, summer and an easy week — with one hard
  session a week for a motionist and two for a supermotionist. The
  research note says, in Danish, what the sources say and which numbers
  are Kadence's judgement.
- **"Hent motionistpas".** One action (`installKadenceContent`,
  src/modules/training/kadence-library.ts) puts the sessions and
  programmes into the library as templates with `source = 'kadence'` and
  a stable `source_key`, and the weeks as training blocks with a stable
  `source_key` (drizzle/0055 widens the source check and adds the
  column). Fetching again updates the same rows. Kadence's templates are
  read-only like DCU's — "Kopiér for at tilpasse" makes a coach's own —
  and are badged "Kadence", never "DCU". A coach who changes a ready week
  makes it their own: the key is cleared, and the next fetch lays
  Kadence's beside it. A coach's action, as DCU's.
- **Offered only where there is an adult.** The button, the programme
  with drawings, the profiles in the builder and the planner's AI select
  appear only in a workspace with a rider who is a senior this season
  (`hasSeniorRider`, src/modules/season/seniors.ts); the service refuses
  without one.
- **Rulle.** A senior's picker shows Kadence's sessions for their
  profile, with their own words for when and their source, before DCU's,
  which stay below. A rider in U17–U23 sees what they saw.
- **A drawn programme.** "Motionist styrke hjemme" joins the built-in
  programmes (ADR 0067) with one new drawn exercise, the squat jump, so
  it can be printed, shared and laid into the week (ADR 0078). It is
  marked for adults and listed in the app only where there is one; the
  open page shows every programme.
- **Week planning for seniors**, the list ADR 0091 left on DCU:
  - the group's AI week takes a senior basis; its words are an adult's
    (`group-week-senior.ts`): Kadence's profile, its hours and corridor,
    its one or two hard sessions and strength rhythm, the library's
    strength programme for the profile — no DCU, no youth reader, no
    race rules. The planner's chips group adults by profile, and the AI's
    select offers the profiles where the team has an adult;
  - "Byg med AI" takes a profile: the profile's longest ride as the note,
    the profile's strength programme as the frame, an adult's words;
  - a repeated strength session is measured against the profile's
    rhythm when every rider chosen is on the same profile, and the note
    names the profile;
  - "Foreslå ugen" for one adult points at the profile's strength
    programme in the library;
  - **"Opret sæsonplaner for alle" includes seniors**, planned on their
    profile (Motionist when none is chosen), as their own page would. ADR
    0091 left them to their page so the profile was chosen first; with a
    default that already plans, and the plan easy to fill again from the
    other profile, a coach with adults on the team should not have to
    visit each one.
- **The demo.** `/demo?alene=voksen` has the content in the library, the
  Supermotionist programme as his strength through the six weeks, and the
  profile's ready week for the time of year laid into next week.

## Trade-offs accepted

- **Kadence's own content, not a federation's.** The interval forms
  rest on studies (Helgerud 2007, Rønnestad 2015 and 2020), the strength
  on Rønnestad's and Vikmoen's, the bones on Olmedillas 2012 and Hinton
  2015, the week on Seiler 2010 and Rosenblat 2025; but which sessions,
  their warm-ups and lengths, the hard sessions per week, the days and
  the straight 10 → 4–5 RM line are Kadence's judgement and say so. Where
  a source could not be read in full, the note says so.
- **`source = 'kadence'` is a third owner in the library.** One more
  value in a check and a badge, rather than marking Kadence's content as
  a coach's own (which would make it editable and lose the update) or as
  DCU's (which would be untrue).
- **A key on training blocks.** Blocks had none; without one, fetching
  again would add copies. Changing a ready week clears it, so a coach's
  edit is never overwritten by the next fetch.
- **Shown only where there is an adult.** A query per library page; the
  cost is small, and a youth team's library, Rulle, builder, planner and
  prompts stay as they were — a test holds the youth prompts and picker
  byte for byte to main before this change.
- **Generic advice, not a prescription.** The programmes say to start
  light and to talk to a doctor with pain, a heart or blood-pressure
  condition or a recent injury. Kadence asks no age or health questions
  (ADR 0091).
- **Left out.** The calendar's "Nyt pas" sheet does not offer the
  profiles to "Byg med AI" (the library's builder does); the strength
  series hint reads the profile only when every rider chosen shares it,
  DCU's otherwise; a supermotionist's spring week has one strength
  session though March asks two. The user manual is unchanged.
