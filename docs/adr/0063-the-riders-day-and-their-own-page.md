# ADR 0063: The rider's day, and a page of their own

Status: accepted · Date: 2026-10-06 · Part of docs/plan-fokus-vinter.md, wave 3

## Context

A rider's "I dag" had grown to nine sections: today's and tomorrow's
sessions, the check-in with two weeks of colours, the week, sending to a
bike computer, the upload, the 90-day form chart, goals and records. The
review of `main` on 5 October 2026 found that a rider who should spend
twenty seconds a day in Kadence had to scroll past most of it to find
"Udført". A coach's Today carried the attention list, the AI brief and
the coach's tips above the team's day; a parent had two pages ("I dag"
and "Forældre") showing the same week. A ride's page opened on up to
fifteen tiles. Nothing asked a new rider what they ride with, and the
RPE that gives a session without power or pulse its load (ADRs 0015
and 0016) was asked only in the "Udført" dialog, never for a ride that
came in as a file. The join page invited people "ind i arbejdsrummet".
Martin asked for all of the plan's corrections on 6 October 2026.

## Decision

- **Today shows today.** A rider's Today is the first steps while they
  are not done, today's session with "Udført" and "Kør indendørs" (and
  when and where it starts, ADR 0058), the question about the last ride,
  today's check-in and tomorrow. The club's picture (ADR 0048) shows
  only on an empty day.
- **Mig (`/me`) holds the rest**, in this order: the week, the form with
  the words that explain it, the last 14 days of check-ins, goals,
  records, and the upload with "send til cykelcomputer". Built from the
  same components; no new data. A coach or a parent who opens it goes to
  their own front page.
- **"Kom i gang"** on a rider's Today: what they ride with (Garmin,
  Wahoo, Polar, only Strava, no bike computer), then only the ways that
  work here — connecting a provider only where the installation has its
  keys, a Garmin's folder only where the browser can be handed one, a
  file always, a Strava archive once; thresholds, or "spring over" and
  Kadence uses how hard it felt; a yes to a parent, only when one waits,
  with the confirm action itself; and Kadence on the home screen in the
  phone's own words, using the browser's install offer where there is
  one. A step is done from real state where Kadence has it (a connected
  device, a ride already in, thresholds set, no parent waiting) and
  otherwise from what the rider said, which the browser keeps, one
  record per person. "Skjul" puts it away. No schema change.
- **RPE when the ride lands.** When the rider's latest ride of the last
  three days has no RPE, Today asks "Hvor hårdt føltes turen …?" with the
  1–10 scale. The save is the ride page's own (`setFeedbackAction`) and
  keeps what was already said about the feel and the note. "Ikke nu"
  puts that ride away on this device. The "Udført" dialog already asked,
  and still does. The demo has an evening ride from yesterday without an
  answer, so the question is seen there.
- **The coach's Today** is one number — "N ryttere har noget, der er
  værd at se på", counted as the attention list counts — linking to the
  team's week on the calendar, where the list, the coach's tips and the
  AI brief now live (ADR 0062), and "Holdet i dag" below it. An empty
  team still gets the three steps to start.
- **A parent's Today is /parents.** One page, child first: with one child
  the page is titled with the child's name; the week with time and
  place, the next 30 days, check-in colours if the child shares them,
  the conversations about the training, the form; Forældreguiden below.
  A coach or rider who is also a parent gets a link to it on Today.
- **A ride's page shows four numbers first**: time in motion, distance,
  climbing, and how close it came to the plan ("6 af 8 trin ramte
  målet", or the plan's colour) — or the average pulse when nothing was
  planned. The rest — watt, weighted watt, pulse drift, kJ, maxima,
  curves and map, laps, climbs, zones, the power curve — is under "Mere
  data", which remembers open or closed per person on the device and
  starts open for a coach.
- **The join page names the team and the role**: "… har inviteret dig på
  holdet X som træner", and one line on what happens next. A rider's and
  a parent's invitation are the same kind to the auth role, which cannot
  read the rider or parent row waiting for it; they name the team alone.

## Trade-offs accepted

- **One more page.** The form chart, goals and records are a tap away
  instead of a scroll away, and a rider has to learn that Mig exists. The
  menu names it (ADR 0061); the first steps link to its upload.
- **What the rider said lives in one browser.** The device choice, the
  skips and "Ikke nu" are not stored on the server, so a rider on a new
  phone sees the steps again, minus those Kadence can tell from real
  state. A column would follow the rider everywhere, but it is a schema
  change for a hint, and the plan has none.
- **The prompt asks about one ride.** If the latest ride has an answer,
  an earlier one without is not asked about on Today; its own page still
  asks. One question is what a rider answers.
- **"rytter" or "forælder" is not on the join page** until the
  invitation can say which it is without the auth role reading
  product tables — a definer function in a migration, left for later.
- **"Mere data" mounts its contents only when open**, so a chart or map
  never draws into a box of no size; opening it costs a render, not a
  request.
