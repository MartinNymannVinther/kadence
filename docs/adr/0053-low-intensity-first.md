# ADR 0053: "Lav intensitet først", an intensity profile on top of the hours

Status: accepted · Date: 2026-10-03 · Builds on ADR 0049

## Context

The research behind the plan (docs/research/traeningsparadigmer.md,
sections 3 and 8) found that the evidence is about how intensity is
spread, not about hours. Polarised and pyramidal spreads work about
equally well (Rosenblat 2025; Oliveira 2024), and much training between
the thresholds looks worst, also in the one study of junior road riders
of the right age (Guellich & Seiler 2010). Juniors and U23 riders already
train a lot in the middle zone (Gallo 2022; Leo 2020). DCU's year wheel
counts tempo and AT as part of its 10–20 % "interval time".

Martin approved the order "Lav intensitet først", then BDR 2009, then
SCF 2025 (docs/plan-klubber-og-guides.md, section 4 and answers, 3
October 2026). BDR and SCF wait for their permission. This is the first.

## Decision

- **A view for everyone who sees the season plan:** "Intensitet uge for
  uge", the weeks around today (four back, three ahead) in three zones,
  with the last four weeks as shares. It sits beside DCU's year wheel, and
  in November to February it quotes the wheel's share with the note that
  DCU counts hours where this counts sessions.
- **Counted by the session's goal**, as Seiler counts and as Olympiatoppen
  asks a whole interval to be logged in its planned zone. Each planned bike
  session is one session in the highest zone it holds for five minutes,
  else in the zone it spends longest in. A race day is one hard session.
  Strength and other sports are left out. A session whose goal cannot be
  read, for example open efforts only, is shown apart and not counted.
- **Three zones from Kadence's seven:** 1–2 low, 3–4 between, 5–7 high.
  This is Kadence's approximation, because the first threshold sits at no
  fixed share of threshold power, and the view says how the zones fold.
- **The profile is a team's choice** (`team_settings.low_intensity_first`,
  off by default), a switch under Indstillinger → Holdet beside DCU's. It
  sits on top of whatever hours the team plans by, DCU's or none. Its
  numbers apply in DCU's distance and base phases, November to February:
  at least 75–80 % of the sessions low, at most 10 % between, and the rest
  high. They are Kadence's synthesis of NCF 2014, SCF 2025 and Seiler
  2010, and the profile is named after what it asks, not "80/20".
- **One guardrail, `mid_zone`:** when the profile is on and it is one of
  its months, the last four weeks hold at least eight counted sessions,
  and the middle zone's share exceeds the ceiling by more than five
  points, the attention list says so as "Godt at vide". It is a training
  flag (read with the training scope), it can be marked afklaret, and it
  reopens when ten more points of the sessions lie in the middle.
- **Migration 0024** adds the column, the new kind to
  `flag_resolutions_kind` and to the training scope in the read policy.

## Trade-offs accepted

- **Sessions, not minutes.** A count by goal says what the coach planned
  and needs no thresholds, but a long endurance ride and a short spin
  weigh the same. Time in zones from the rides is already on each ride's
  page; this view is about the plan.
- **The plan, not what was ridden.** An unplanned ride does not count,
  and a planned session that was skipped still does. The flag speaks to
  the coach who plans, before the weeks are ridden.
- **A race day counts as hard whatever was raced.** Junior races spend
  much time above the second threshold (Rodríguez-Marroyo 2011; Gallo
  2022), which is the honest default without a file.
- **The flag is off unless chosen.** A team that follows DCU's wheel
  plans tempo in December on purpose, and Kadence does not argue with that
  choice by default. The view is always there, so the evidence is in sight
  either way.
- **A paradigm may add or tighten guardrails, never loosen them**
  (ADR 0049). The profile adds one and changes nothing else.
