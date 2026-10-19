# ADR 0104: The week's numbers as labelled rows, and what each one means

Status: accepted · Date: 2026-10-19 · Amends ADR 0040 (four numbers against the season plan) · Builds on 0062 (the names), 0091 (senior profiles)

## Context

The calendar's week for one rider showed every sport's hours as "Timer i
alt 7,2 af 7,3 t", and the bike's four numbers on one bullet bar with a
key beneath: the season plan as an upright marker, the hours put in as an
outline, the hours ridden filling it, and the frame of DCU or the
training profile as a pale band. When the hours put in and the hours
ridden were close, the outline hid under the fill. In October, when the
frame is "pause og frit", the key still showed the band's mark beside the
profile's name, and the name came twice ("Motionist" beside "Motionist:
pause og frit"). The product owner's words: "Sørg for at det grafisk og i
tekst er tydeligere hvad de forskellige betyder."

## Decision

- **A row per number in the calendar's week.** Each row has a name, its
  own bar on one shared scale, and its value (`BarRows`,
  `src/components/charts/bar-rows.tsx`). Under "Hele ugen, alle
  sportsgrene" are two rows, Lagt ind and Udført. Under "På cyklen, <basis>"
  are four (`VolumeRows`): Sæsonplan, Lagt ind, Kørt, and "DCU's ramme" or
  "Profilens ramme" as a span from low to high. A number that is no
  number is written in its bar's place: "pause og frit i oktober, ingen
  faste timer", or "ingen sæsonplan for ugen".
- **The same marks as the small bar.** The plan is drawn in green, the
  hours put in as an outline, the hours ridden filled in brown, and the
  frame as a pale span. Someone who has read the rows can read the small
  bar in the team's week and on the season page, which keeps ADR 0040's
  bullet bar where a row has no room.
- **What each number means, one tap away.** "Hvad betyder tallene?"
  folds out a line each for Lagt ind, Udført and Kørt, Sæsonplan, the
  frame (with its ±20 %, ADR 0015, and October's pause), and Forventet.
- `VolumeBar` keeps only its small form. The calendar's week was the only
  place the large form stood.

## Trade-offs accepted

- **Taller than before.** Six rows and their headings take more height
  than one bar and a key. The explanation is folded away so it does not
  add to that.
- **Two pictures of the same four numbers.** The rows in the week and the
  small bar elsewhere. They share their marks and names, so they read as
  one language.
