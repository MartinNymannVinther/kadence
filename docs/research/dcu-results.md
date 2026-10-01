# A rider's races and results from Cykling Danmark

Researched 1 October 2026, for ADR 0039. The question was Martin's: can a
coach see what a rider has actually raced in Denmark, and how it went, as
information about where the rider is and whether they are riding
themselves tired? And can a coach see which races a rider has entered, to
plan the training around them?

The short answer: what a rider has raced, yes, from a public page per
rider. What a rider has entered, no, not without DCU's help.

## Where Danish race results live

Danmarks Cykle Union now calls itself Cykling Danmark (cyklingdanmark.dk).
Licensed racing in Denmark runs on **Sportstiming** (Sportstiming ApS,
Skanderborgvej 242, 8260 Viby J, CVR 29691401): entries, start lists,
results and DCU's member portal.

- **The calendar.** cyklingdanmark.dk/tilmelding is an iframe of
  `www.sportstiming.dk/app/dcu/events`, which loads its list from
  `/app/dcu/searchevents` as JSON (date, name, discipline, place, links
  to the event and its results, the state of the entry).
- **An event.** `www.sportstiming.dk/event/<id>` with tabs for
  participants (`/participants`), results (`/results?round=<id>`),
  leaderboards and points. A result list shows place, bib, name, **UCI
  ID**, club, laps and times, per class.
- **A participant list** shows name, club, chip and class. It carries **no
  UCI ID**, and it can be downloaded as a file.
- **The member portal**, `dcumedlem.sportstiming.dk`, has a public page
  per member at `/profile/<UCI ID>`: name, sex, birth year, UCI ID, and a
  table of every result filed under the member's licence. It has a
  heading per discipline, class and year ("Landevej - U17 (2026)"), a row
  per result (the race, linked to its result list at Sportstiming; the
  date as "13. september 2026"; the place; DCU's points) and a total per
  heading. Stages of a stage race are rows of their own, and so are its
  overall classifications ("Point Samlet", "… - ENTRY"). An unknown UCI
  ID answers 404. The page is server-rendered HTML, about 90 KB for a
  rider with six seasons.
- **The points lists**, `dcumedlem.sportstiming.dk/points`, rank members
  per season, discipline and class. Danish road racing has no U23 class:
  U23 riders race in A, B and C. Girls race in U17P and U19P, women in DA
  and DB. Martin chose to leave the points out (ADR 0039).

## What the hosts say about machines

- `dcumedlem.sportstiming.dk` has **no robots.txt** (404) and no terms of
  its own; its `/terms` links to Sportstiming's.
- `www.sportstiming.dk/robots.txt` disallows `/profile/*` and `/api/*`,
  among others, for every crawler. `/event/*/results` and
  `/event/*/participants` are not disallowed.
- **Sportstiming withholds data from software on purpose.** The event
  list's page says so in its own script: "Render initial items (blank for
  non-browser software libs (curl, python-requests, node-fetch, ...);
  real browsers and search engine crawlers still get data)". A result
  list asked for by plain `curl` answered 403. They tell software apart
  by its user agent, so a client that names itself something else gets
  through, but that is going around a door they closed, not walking
  through an open one.
- Sportstiming's terms (sportstiming.dk/terms) say nothing about results,
  their reuse or machine access. They say Sportstiming collects
  information to handle entries and never passes participants' data on
  without consent. Cykling Danmark's privacy policy, updated on 16 April
  2024, names race results among what DCU processes and shares with
  sports organisations. DCU's sporting rules have every result published
  on DCU's website shortly after the race.
- No API, feed or export for clubs or coaches is offered anywhere.

## Entries: why Kadence cannot see them

A coach's real wish is to see which races a rider has entered. Two
roads were looked at:

1. **The rider's own entries.** Sportstiming shows a signed-in member
   their coming events (`/profile/profileareadata`). That is the rider's
   account. Kadence never logs in to a provider as the rider, so this
   road is closed by Kadence's own rule.
2. **Every coming event's participant list, once a day.** About 70 events
   are on the calendar at any time, so that would be about 70 pages a day
   from `www.sportstiming.dk`, which withholds its data from software (see
   above). And a participant list has no UCI ID, so a rider would be
   found by name, club and class. That is a guess, and two riders can
   share a name.

So entries need Cykling Danmark or Sportstiming: their permission to
read the participant lists, or better a list of a club's or a licence's
entries by UCI ID. That is the first question to put to them (below).

## What Kadence does (ADR 0039)

- A coach enters the rider's UCI ID. Without anything else, the coach
  gets a link to the rider's page at the portal.
- With `DCU_RESULTS` on, or listing the rider's UCI ID, Kadence reads
  that one page when a coach or the rider opens Kadence and the last
  reading is more than three hours old. It reads one rider at a time,
  ten seconds apart, never twice in ten minutes for the same rider, and
  at most six pages a minute for the whole installation. It names
  itself in the user agent with the installation's address. It reads
  `dcumedlem.sportstiming.dk` only, never `www.sportstiming.dk`.
- Each race from the season before and this one goes into the rider's
  calendar as a race. If the calendar already has a race that day, the
  result goes on it; otherwise Kadence makes one race for the day. The
  place goes on the race for the coach. The rider sees the race; the
  place is the coach's.
- The link to each result list stays a link: the coach opens it in their
  own browser.

## Questions for Cykling Danmark and Sportstiming

1. May Kadence read a member's public page at the member portal, one
   rider at a time, for riders whose coach has entered their UCI ID? Or
   would you rather offer it another way?
2. Can a coach see which races a club's riders have entered, by UCI ID,
   from a feed or an export? This is what coaches plan by, and the one
   thing Kadence cannot do on its own.
3. Is there an export of a club's results, or a member's, that Kadence
   should use instead of the page?
4. Do you want Kadence to identify itself in some particular way, or to
   keep to a particular rate?

## Sources

- Cykling Danmark, landevej: https://www.cyklingdanmark.dk/discipliner/landevej
- Cykling Danmark, resultater: https://www.cyklingdanmark.dk/resultater
- Cykling Danmark, privatlivspolitik: https://www.cyklingdanmark.dk/privatlivspolitik
- DCU's member portal, points: https://dcumedlem.sportstiming.dk/points
- Sportstiming, the DCU calendar: https://www.sportstiming.dk/app/dcu/events
- Sportstiming, terms: https://www.sportstiming.dk/terms
- Sportstiming, robots.txt: https://www.sportstiming.dk/robots.txt
