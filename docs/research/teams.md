# Danish U19 and U23 teams: where the facts are

Researched 8 October 2026, for ADR 0072. Martin's question: can Kadence
show which teams there are in Denmark for U19 and U23, which foreign
teams Danish juniors ride for, who rides where, with jerseys, official
contacts and points — kept up to date by the system rather than by hand?

The short answer: the teams, the riders and the points, yes, from two
public sources that answer software; the jerseys and the websites, no,
those are Kadence's own notes.

## The UCI: DataRide

uci.org's ranking pages are iframes of **dataride.uci.org** (also
dataride.uci.ch), a Sitefinity site whose grids load their rows from
JSON endpoints under `/iframe/`. There is no documentation and no terms
page of its own; uci.org's terms say nothing about these endpoints. The
endpoints answer a plain request that says who is asking
(`Kadence/<version> (+<origin>)`), without a cookie or a token.

What the teams page reads, in this order, every id looked up on the way:

| Call                                                | Gives                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /iframe/GetDisciplineSeasons/?disciplineId=10` | The road seasons with their dates; 2026 is id 464 and runs 20 Oct 2025 – 18 Oct 2026.                                                                                                                                                                                                                |
| `GET /iframe/GetCountries/`                         | Every nation with its IOC code; Denmark (`DEN`) is id 56.                                                                                                                                                                                                                                            |
| `POST /iframe/RankingsDiscipline/`                  | The rankings a category has in a season, as Kendo grid form fields (`take`, `skip`, `filter[filters][n][field]`…). Category 26 (Men Under 23) has the UCI World Ranking (U23), individual (type 1) and by nation (type 3); 24 and 25 (Men and Women Junior) have **only the Nations' Cup** (type 3). |
| `POST /iframe/ObjectRankings/`                      | One page of 40 rows of a ranking, filtered by `CountryId`: rank, "LANDBO Mads", team name, nation, birth date, points, computation date.                                                                                                                                                             |

Found: **the UCI has no individual ranking for juniors on the road.**
Junior points exist only as a nation's Nations' Cup standing. Denmark's
U23 riders in the world ranking (19 on 6 October 2026) carry their team,
which is how the foreign teams Danish U23 riders ride for are found
without anyone keeping a list.

`X-Requested-With: XMLHttpRequest` is sent with the POSTs, as the site's
own grids send it; without it one endpoint answered the page's HTML.

## Cykling Danmark

Two pages, both answering a plain request that says who is asking:

- **The team list**, `cyklingdanmark.dk/klubber-teams/om-teams`: prose
  with headings — "UCI Continental Teams", "DCU eliteherrer - landevej",
  "DCU elitekvinder - landevej", "U19-herrer - landevej", "U19-kvinder -
  landevej", then track and gravel — and under each a run of teams as
  three lines: the name, "Moderklub: …", "Team Manager: … // address".
  On 8 October 2026: 4 Continental, 5 elite men, 4 elite women, 7 U19
  men, 1 U19 women. The address is the one DCU publishes for the team;
  for most teams it is the manager's own mailbox.
- **The points lists**, `dcumedlem.sportstiming.dk/points`: the member
  portal's form (`EventType`, `ClassId`, `SeasonId`, `OrganisationId`)
  and a table — place, UCI ID, name, club or team, birth year, points.
  The form lists every discipline's classes in one select, the road's
  first; U19 is 961, U19P 962, A 952 in 2026. Danish road racing has no
  U23 class (docs/research/dcu-results.md): U23 riders race in A, told
  apart by birth year. The team column shows the foreign teams Danish
  juniors are licensed with — JEGG-SKIL-DJR, Cannibal B Victorious,
  Team Grenke–Auto Eder, Watersley R+D — which is how those are found.

The member portal has no robots.txt and no terms of its own, and does not
withhold its pages from software, where www.sportstiming.dk does
(docs/research/dcu-results.md). Cykling Danmark has not yet said yes to
being read (ADR 0039); the teams page reads it only while `TEAMS_DCU` is
on, and Martin meets DCU in the week of 12 October 2026.

## What no source lists

- **Jerseys.** No source has a team's colours in a form a machine can
  read, and photographs and logos are the teams' own. Kadence draws one
  jersey from colours noted in `src/modules/teams/registry/teams.json`
  and says plainly which teams' colours have not been checked. On 8
  October 2026 colours were set for five teams from their sponsors'
  well-known kits (Uno-X, Lidl-Trek, EF, Red Bull–Bora, Decathlon AG2R),
  not from 2026 photographs; the rest wait for someone who knows.
- **Websites and home towns.** Noted in the registry from the teams'
  own pages and from Wikidata (which has `official website`, the UCI team
  code and a Commons photo for most UCI teams: Airtox–Carl Ras is
  Q102352846). Reading Wikidata daily would add websites for every UCI
  team, and Commons photographs come with licences that allow use with
  attribution; neither is done yet, since a photograph would have to be
  copied to the installation first — Kadence loads nothing from a third
  party into a reader's browser.

## Manners

One read a day, one source at a time, no redirect followed, the answer
capped at 2 MB, the request saying who is asking. A visitor cannot start
a read; the page's age does. A source that fails keeps its last answer
and the page says when it was read and that the latest read failed.
