# ADR 0097: Known pains — the check-in asks what is different

Status: accepted · Date: 2026-10-14 · Amends ADR 0021 (the check-in and its zones) · Builds on 0011 (riders separated in the database), 0026 (resolved flags), 0054 (every feature in the demo), 0080 (a person alone), 0081 (the history follows the rider)

## Context

Martin answered a check-in with pain 2 on ATK's ladder ("Smerte ved
start", place "Ryg"), because his back always hurts a little. The day
turned yellow and told him "Skær træningen mindst til det halve, og spring
løb over, til en behandler har set på det." His words:

> Hvis man nu som mig har lidt ondt i ryggen altid, så giver det jo ikke
> mening at jeg skal skrue ned for træningen. Så vi skal vejlede lidt
> bedre. Det skal nok nærmere være hvis noget er anderledes end det
> plejer.

Two more things on the same card: a yellow day said only "Det er helt
normalt at have en hård dag en gang imellem", not why it was yellow; and
"Din træner kan se det og tager en snak med dig" stood there in his own
personal workspace, where there is no coach.

## Decision

- **The pain question asks about change**: "Gør noget ondt, som ikke
  plejer, eller mere end det plejer?" ATK's 0–3 ladder is unchanged, and
  so are its steps' words.
- **Known pains.** A rider records what always hurts a little — a place
  in their own words (1–40 characters) and its usual level, 1 or 2; 3 is
  never usual — on Mig, under the check-ins; a coach on the rider's page,
  beside height, as with the thresholds. At most five a rider, one per
  place (in the service: a unique index would make a history's move
  collide when both rider rows know the same pain). Table `known_pains`
  (migration 0057): `org_id`, `rider_id`, forced RLS read with
  `app_can_read_rider(rider_id, 'wellbeing')` and written with
  `app_can_write_rider`, so a parent reads them only while the rider
  shares wellbeing (ADR 0011); audited; in the export; moved with the
  rider's history (ADR 0081); not written while a personal workspace's
  consent to health data is withdrawn (ADR 0088).
- **On the check-in** each known pain is a quick choice, "Ryg som det
  plejer". The check-in stores the ticked ones in `checkins.usual_pains`,
  a jsonb list of `{id, place, level}` **as they stood that day** — a
  snapshot rather than ids, so the day's zone is worked out from the row
  alone, and does not change when the known pain is changed or removed.
  The action sends ids; the service refuses any id that is not one of the
  rider's known pains, and writes the snapshot itself.
- **The zone rule** (`src/modules/load/usual-pain.ts`, used by
  `checkinZone`): today's pain is the usual one, and counts as no pain,
  when it is 1 or 2, at least one known pain is ticked, the pain is no
  higher than the highest ticked usual level, and "where" is empty or
  names a ticked place. Then it does not colour the day, raise the coach's
  pain flag, or bring the advice to cut training down — and it is stored,
  so the pattern is visible. A pain above the usual level, or in a place
  that is none of the ticked, follows the ladder as before; pain 3 is
  always red. Everything else in the zone rules stays. Examples: a known
  back pain at 2, answered 2 and ticked: green; answered 2 without the
  tick: yellow; answered 3: red; ticked, answered 2, "where" "Højre knæ":
  yellow.
- **The card says why.** For yellow and red, the signs are named from the
  answers first ("Du svarede, at noget gør mere ondt end det plejer, når
  du starter og dagen efter (Ryg).", "Du sov under 6 timer i nat.", "Dine
  svar ligger i snit på 2,3."), then the kind line as before. A known
  pain as usual is said not to colour the day.
- **A coach only where there is one.** "Din træner kan se det" is shown
  only in a club; in a personal workspace the card names no coach.
- **Youth safety.** A known pain at its usual level does not colour a
  young rider's day either. But for a rider under 18 by birth year, in a
  club, a known pain ticked on check-ins in each of the last three weeks
  is a quiet point on the coach's attention list ("Godt at vide", flag
  kind `known_pain_lasting`): ATK asks that pain which persists in a
  young person is seen by an adult, and three weeks is the Kolding
  model's span (docs/research/foraeldre-og-talentudvikling.md §1, §2). Not
  for adults; not in a personal workspace. A coach may mark it afklaret
  for the week like any flag (ADR 0026).
- **The demo.** Lars, the adult alone (`/demo?alene=voksen`), has a known
  back pain at 2, ticked on four of the last seven days, which stay green.

## Trade-offs accepted

- **A tick can hide a second pain at the same level.** One pain answer a
  day: a rider who ticks "Ryg som det plejer" at 2 and has a new knee
  pain at 2, without writing "knæ", is green. Writing the place, or the
  question's own wording — "som ikke plejer, eller mere end det plejer" —
  is what catches it; a second ladder per place would make the three-tap
  check-in longer for everyone.
- **The place match is loose**: "ryggen" and "nedre ryg" match "Ryg", by
  one containing the other. A place that does not match is treated as new
  and follows the ladder — the safe side.
- **An adult's lasting known pain is never a point.** An adult decides
  for themselves; the point is for the young, where ATK asks an adult to
  look.
- **A personal workspace gets no lasting point**, also a child's own,
  where a parent is the owner: that parent sees the check-ins and the
  zones themselves.
- **The snapshot can disagree with today's list.** A check-in keeps the
  usual level that stood that day; changing a known pain later does not
  recolour old days.
