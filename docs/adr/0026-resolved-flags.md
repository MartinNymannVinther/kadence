# ADR 0026: A coach's "afklaret" on a guardrail flag, one week at a time

Status: accepted · Date: 2026-09-28 · Builds on 0011, 0017

## Context

The attention list ("Kræver opmærksomhed") had no memory. A flag is
computed from the rider's data on every view — the ramp, the pain
ladder, the yellow check-ins — so a flag the coach had already acted on
stayed on the list until the numbers themselves changed. A coach who
had had the talk saw the same line every morning of the week, and the
Monday brief kept naming the same rider.

## Decision

- **Flags stay computed.** Nothing about the flag is stored; only the
  coach's decision that it has been dealt with: a `flag_resolutions` row
  keyed on rider, kind and the Monday of the week (drizzle/0013), with
  the most serious severity the coach saw and the `values` of every flag
  of that kind at the press. All three are the server's: the client
  sends the rider and the kind, the service recomputes the flags inside
  the transaction that writes, and refuses when none fires.
- **It lasts the week, unless it gets materially worse.** The next
  week's flags are new. Within the week a resolution holds a flag down
  while the flag is not above the severity seen and not a whole step
  worse than what was seen, with a fixed step per kind (`MATERIAL_STEP`
  in `src/modules/load/resolved.ts`): half an hour more over the
  corridor or under it, a ramp five points steeper, a ride half an hour
  or ten kilometres longer, half an hour less sleep on the seven-night
  average, a higher rung of pain, one more red session, a strength pair
  not seen, a red check-in after a long yellow. Pressing again after an
  escalation re-snapshots the row.
- **Only a coach writes** — the policy requires `app_is_coach()` and
  `app_can_write_rider()`, the service `requireCoach` — so a rider cannot
  wave their own warning away. Whoever may read the data behind the flag
  reads the resolution: the kinds computed from training with the
  training scope, everything else, and any kind added later, with the
  wellbeing scope. A parent sees a resolution of a check-in flag only
  when the rider shares wellbeing (ADR 0011). Audited like every table;
  exported as "Afklaret".
- **Nothing vanishes without a trace.** A resolved flag leaves the list,
  a rider whose flags are all resolved leaves the flagged list, and a
  line under the list says how many were resolved this week, opens to
  show them, and undoes each ("Fortryd").
- **The AI sees what the coach sees.** The Monday brief and the tips
  answer "who needs my attention" and see open flags only. The week
  draft answers "how much can this rider do" and sees every flag,
  resolved or not: a pain the coach has talked about is still a pain to
  plan around.

## Trade-offs accepted

- **One resolution per kind per week.** Two strength pairs seen together
  go together; a third pair reopens the kind, and the next press holds
  all three.
- **A resolution can outlive its flag.** When the numbers improve the
  row stays until Monday and shows nothing; it is not deleted.
- **"Worse" is a fixed step per kind**, not a threshold the coach sets.
  The corridor's hours and the ramp count the week's open planned
  sessions, so they move every day a session is ridden a few minutes
  long or short, and the sleep average moves a tenth with every night:
  a zero-tolerance rule reopened a Monday's resolution on Tuesday with
  no action by anyone. The steps sit above that drift and below what a
  coach would call news; they are Kadence's own, not DCU's. Yellow days
  growing under a resolved `wellbeing_talk` do not reopen it — the talk
  was had — and the escalation is another kind, `wellbeing_help`, which
  no resolution of `wellbeing_talk` covers.
- **The wellbeing chip is not a flag, and follows the rider.** A
  resolution never touches the check-in status. On /today a rider whose
  flags are all resolved leaves the list, and their chip goes with their
  name into the trace under it; when a rider in the trace is in the red
  zone the trace opens by itself — on load, and after the press that put
  them there, which only refreshes the page's data — so professional
  help is never a click away. Keeping a red-zone rider on the list
  whatever the coach resolved
  was considered and not taken: the coach who pressed "Afklaret" on that
  alert has seen it, and the rider's own page shows the chip regardless.
- **What the model sees.** The brief hands the model the open flags'
  kind, severity and values; a resolution's `seen` snapshot and its
  `note` never enter a prompt, today or when the note gets an interface.
  `note` is open reading for the rider and their confirmed guardians per
  the read scope and ADR 0012.
- **`note` has no interface yet.** When it gets one, the rule above
  holds: open reading per the read scope, never in a prompt.
- **A row with an empty `seen`** — only possible by a direct insert; the
  service always snapshots at least one flag — holds by severity alone.
- **The `(org_id, week_monday)` index is kept knowingly.**
  `resolutionsFor` and the export are served by the unique index; the
  extra one is harmless on a table this small and cheaper to keep than
  to reset the applied migration for.
- **If flags are ever shown to riders**, the coach's resolution would
  apply to their view too; today riders and parents see no flags.
