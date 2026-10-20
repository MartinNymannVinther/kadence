# ADR 0101: A week around a race — the person's own race reaches the AI, and no session lands on it

Status: accepted · Date: 2026-10-15 · Amends ADR 0043 (the team's week plan, an AI week without rider data) · Builds on 0017 (AI proposals and the team's yes to riders' data), 0080 (a person alone), 0092 (weeks for a motionist) · Amended by 0102 (a race is hard whatever the month; a person's own race goes with its title) · Amended by 0103 (the race is the race day's one session; the day before in the reader's words)

## Context

Martin, in his personal workspace on the Motionist profile, put a race on
Saturday 24 October in his calendar. The event dialog put it on himself,
the workspace's one rider. "Foreslå ugen" with the wish "Jeg kører løb
lørdag d. 24" proposed a 45-minute recovery ride on the race day itself,
nothing on the Friday before, and a note that said the race was a
priority. His words: "Det går lidt i ged med forslaget. Jeg har allerede
lagt løbet ind som begivenhed om lørdagen, men det overser den. Men heller
ikke hvis jeg beder den direkte om det kommer et godt forslag."

Two causes. The group's week (ADR 0043) read only the team's own events
(`rider_id is null`): right in a club, where a rider's exam is that
rider's data, but in a personal workspace every race is on the person's
own rider, so the model never saw it. And the prompts, youth and adult,
said only "keep the day before an A race easy": nothing about the race
day, the opener, the days around it, a race without a priority, or a race
named only in the wish.

## Decision

- **A personal workspace's week reads the person's own calendar.** When
  `organizations.kind = 'personal'`, `proposeGroupWeek` reads every event
  of the week, the rider's as well as the workspace's. A club keeps
  today's rule: the team's own events only.
- **As kind, dates and priority, nothing else.** The group's week never
  asks the switch for riders' data (`team_settings.ai_on_rider_data`, ADR
  0017), so it sends nothing a person wrote about themselves: an event's
  title goes only for a club's team events, as before, and never for a
  personal workspace's. Sick days (`kind = 'ill'`) stay out altogether:
  they are health data, and the dates alone would say so. Kind, dates and
  priority are enough to plan by. The planner's line says it plainly:
  "AI'en får timerne fra træningsprofilen, biblioteket og datoerne for
  dine løb og andre dage i kalenderen. Den får ikke andet om dig."
- **Race-week rules in every week draft** (`race-week.ts`), youth and
  adult, group and per rider, written as a coach plans: the calendar's
  events are fixed; a race day is the race, with no session; the day
  before, a short opener (45–60 min easy with 3–4 × 1 min in zone 5 or a
  few sprints) or rest; nothing hard or long in the two days before an A
  or B race; rest or a short easy ride the day after; the race counts as
  the week's hard session or sessions; a race without a priority counts
  as B; a race named in the wish counts like one in the calendar; and the
  note says how the week is laid around it. The youth wording keeps DCU's
  frame and race limits (`raceRulesLine`); the adult wording speaks of a
  race or event.
- **A guard that does not trust the model.** After the sanitizer, any
  proposed session on a day a race in the calendar covers is dropped
  (`dropRaceDaySessions`), in the group's week and in the per-rider draft.
- **The proposal shows the days the AI read**, "lør. 24. okt. · Løb ·
  Løb i Hillerød", with the event's own title, which goes to the reader's
  screen and not to the model.

## Trade-offs accepted

- **A race named only in the wish is not guarded.** The rule tells the
  model; the guard knows only the calendar. Reading dates out of free text
  to drop sessions would guess, and Kadence refuses rather than guesses.
- **The model plans without the race's name.** "Løb i Hillerød" or "DM i
  linjeløb" could say something about the race's length or terrain; a
  personal workspace gives that up so the line "nothing else about you"
  stays true without asking a switch.
- **The youth prompts changed.** ADR 0092 pinned them byte for byte; the
  pins are retaken, since a race week is planned the same way for young
  riders, inside DCU's frame.
