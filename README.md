# Kadence

Kadence ([kadence.haij.dk](https://kadence.haij.dk)) is open source
training planning for young road cyclists — the U17, U19 and U23 classes
— their coaches and their parents. The coach lays sessions in the rider's
calendar, on the bike and in the gym. The rider rides them, and the ride
comes back from a FIT file, Wahoo, Garmin or Polar and lands on the
session it fulfilled. A short daily check-in says how the rider is. The season plan
starts from Cycling Denmark's recommendations for the rider's age class,
and the coach can see at a glance where the plan and the week have gone
past what DCU recommends. Parents get a page of their own.

It is the Danish answer to TrainingPeaks for youth cycling: it keeps what
riders and coaches value there — the calendar, structured workouts sent
to the device, fitness and fatigue, a comment on every session — and
leaves out what they criticize: per-athlete fees, features only on the
web, adult targets for children, private chats between an adult and a
minor, and one hardware maker holding the keys.

Kadence is one tool in the [Haij](https://haij.dk) family and stands on
the Haij foundation, taken by way of
[Plot](https://github.com/MartinNymannVinther/plot): Danish-first,
EU-sovereign, secure by design. The project constitution — dogmas,
principles, architecture and rules — lives in [CLAUDE.md](CLAUDE.md).
Decisions and their trade-offs live in [docs/adr](docs/adr/). The
research it is built on — DCU's recommendations, TrainingPeaks and its
users, Team Danmark's guide for parents — is in
[docs/research](docs/research/).

## Status

0.9, waves 0 to 4 built: the foundation from Plot (auth with passkeys
and TOTP, teams separated in the database, admission by invitation, the
audit log, CI, Docker); riders separated inside a team in the database,
with tests that prove a teammate never sees your check-ins and a parent
sees only what the rider shares; coaches, riders and parents by
invitation; the calendar, the workout builder and the library with DCU's
strength programmes; the season plan from DCU's hours; load, form and the
guardrails; the daily check-in; FIT files through Kadence's own decoder;
Wahoo, Garmin and Polar behind keys; an upload key per rider, a bike
computer read as a folder, a share from the phone and a Strava archive in
one move; sessions onto a Garmin by cable; Rulle, the session on the
trainer indoors; the parents' page;
four AI proposals; the
demo; export and erasure. Nothing here has run a real team yet. Dogma
seven is what 1.0 waits for — one real winter — and
[docs/launch.md](docs/launch.md) is the road to it.

The focus wave before that winter
([docs/plan-fokus-vinter.md](docs/plan-fokus-vinter.md)) made the core
smaller and sharper: a menu per role with a bottom bar on the phone, a
Today that shows today, the team's week as the place to see who needs a
talk, one place to plan a week, time and place on a session, reminders
by web push without content, and a rider's first-run checklist. Five
parts wait behind installation flags, off by default, until a real team
has used the rest (ADR 0057): Rulle's land and towns, Trænerrummet, the
club championship, the energy calculator and the food guide. What is
left is in [docs/backlog.md](docs/backlog.md).

Much of the code is written together with Claude Code, under the rules
in [CLAUDE.md](CLAUDE.md). Every change is reviewed, tested and deployed
by a person; the tests for isolation — between teams and between riders
— are the part of the codebase that is trusted least to good intentions.

## What it is

**The calendar.** A coach lays sessions in a rider's calendar — on the
bike, in the gym, or anything else — for one rider or the whole group at
once. The rider rides it; the ride comes in from a FIT file, Wahoo,
Garmin or Polar and lands on the session it fulfilled, green, yellow or red for
how close it came. A session done without a file is ticked off with how
long and how hard it felt. Every session has one open thread.

**DCU as the default.** A rider's class comes from the birth year, and
the season plan (October to September) starts from Cycling Denmark's
2025 hours for that class and year. DCU's strength programmes for U17,
U19 and U23 sit in the library with their progression, so session seven
of the programme says 3 × 12. The coach can change anything; DCU's number
is always beside it.

**Load without a power meter.** Power when there is power, pulse when
there is pulse, how hard it felt when there is neither — on one scale,
so fitness, fatigue and form mean something for every rider.

**Rulle, for the days indoors.** When nobody should be out on a bike,
the rider opens today's session in Rulle, connects the trainer over
Bluetooth, and pedals: a smart trainer holds each block's watts. The
session is a bar the rider rides across, the numbers are sized to be
read from the saddle, and where the installation has turned Rulle's
world on (ADR 0057), a quiet low-poly landscape rolls past behind them: six real roads through their real land — Vejle's hills and the
fjord to Munkebjerg, Himmelbjerget, the B&U DM lap, and Copenhagen and
Montréal on race day — or a GPX of the rider's own. The ride lands on
the session as an ordinary FIT file. Company on the road and a crowd on
race day, but nobody to beat: an emergency that should feel good.

**Guardrails and wellbeing.** The week against DCU's corridor, the
longest ride for the class, the ramp, strength too close together, sleep,
ATK's pain ladder and a daily check-in read after Kolding Talent's
model: the coach's list of who needs a talk this week. Shown, never
enforced.

**Parents.** A parent sees their own child's training once the rider has
confirmed the link, check-ins only if the rider shares them, and a page
of advice built on Team Danmark's guide for parents. No private messages
between an adult and a young rider.

**AI that proposes.** A coach's shorthand becomes a structured session
by rules that work offline; a model reads what the rules cannot. A week
drafted from DCU's hours and the calendar, taken session by session. A
Monday list of who needs attention, with a few sentences on top where
the team has said the AI may read riders' data. Mistral at the EU
endpoint, or Ollama on your own machine; without either, everything else
works.

## Haij-dogmerne

Kadence lever efter familiens syv dogmer. De står her i Haijs egne ord.

1. **Ægte open source.** Al kode ligger offentligt under AGPL-3.0. Alt vi driver, kan hentes 1:1 og køres et andet sted eller lokalt, og der findes ingen funktioner der kun kan fås på haij.dk. En betalt udgave er i orden, men den bygger på den samme kode. Kloner man repoet, får man præcis det der kører på haij.dk.

2. **Egen drift.** Hvert værktøj kan køre i eget driftsmiljø på én server med Docker Compose, en Postgres og en lokal sprogmodel gennem Ollama, uden en eneste nøgle til en sky. Funktioner der forudsætter en ekstern tjeneste, som CVR-opslag eller e-faktura, siger det direkte og lader resten virke i stedet for at gå i stykker. Testen er enkel: afbryd forbindelsen til internettet, og alt væsentligt skal stadig virke.

3. **Dine data, altid.** Alt en organisation ejer kan hentes ud med ét klik i åbne formater (regneark, JSON, PDF) uden at spørge nogen, og slettes helt igen. At forlade Haij skal kunne gøres med få klik uden unødvendig friktion, og vi hjælper gerne med flytningen frem for at gøre den besværlig.

4. **EU eller egen drift.** Når vi hoster, ligger alt hos EU-ejede leverandører på EU-jord, sprogmodeller inklusive, og hvert værktøj har en offentlig liste over hvem der kan se hvad. Ingen amerikansk sky i driften. Koden ligger på GitHub, som er kodehosting og ikke kundedata; et spejl hos en europæisk forge kommer den dag det giver mening.

5. **AI'en hjælper, mennesket bestemmer.** AI må foreslå, skrive udkast og rette i planer, men aldrig sende noget ud af ”huset”, slette noget eller forpligte nogen uden at et menneske har sagt ja. Alt AI gør, kan fortrydes. Indhold hentet udefra behandles som data, aldrig som instruktioner.

6. **Sikkerhed fra første dag.** Organisationers data er adskilt i databasen, ikke kun i koden, og der skal være en test der beviser det. Alle ændringer registreres i en log der ikke kan redigeres. Passkeys og totrinslogin er der fra start, der er en offentlig vej til at melde sikkerhedshuller, og der ligger aldrig hemmeligheder i koden.

7. **Brugt i virkeligheden.** Intet af det vi selv har bygget kommer i vinduet før det har kørt rigtigt arbejde, hos os selv eller hos en kunde vi sidder tæt på. Værktøjer fra andre skal have et rigtigt brugssted vi kan pege på. Vi skal ikke have værktøjer liggende som ikke har skabt reel værdi i virkeligheden.

## Quickstart

Requirements: Node 22+, pnpm 10+ (`brew install pnpm`; newer Node builds no longer bundle corepack), Docker.

```bash
git clone https://github.com/MartinNymannVinther/kadence.git && cd kadence
pnpm install
cp .env.example .env                            # defaults work for local dev
docker compose -f docker-compose.dev.yml up -d --wait  # Postgres 16 + runtime roles, ready
pnpm db:migrate                                 # tables, RLS, audit triggers
pnpm dev                                        # http://localhost:3000
```

Register at `/register` — signup creates your user and your workspace —
then add a passkey under Indstillinger → Sikkerhed. Registration is closed
by default (`SIGNUP=closed`): an empty installation always lets the first
person in, the door shuts by itself once that account exists, and everyone
after that applies at `/register` and is admitted by the installation's
owner with a single-use link (Indstillinger → Adgang). Colleagues do not
apply: a member of a workspace invites them with a link from Indstillinger
→ Arbejdsrum.

```bash
pnpm test        # isolation between teams and riders, the export, the gates
pnpm lint && pnpm typecheck
```

The tests run against the database from the compose file and never call
an AI model, so they pass offline and without keys.

Two things the first run can trip over, both of which `pnpm db:migrate`
names when they happen. The Postgres image has to be pulled and the
cluster initialised the first time, so `--wait` matters; a migrate fired
before that is done fails and leaves an empty database behind. And
Kadence's dev database listens on port 5438, beside the family's other dev
databases (Haij 5432, Tavle 5433, Domino 5434, Makker 5435, Plot 5436,
Kladde 5437); if something
else already holds 5438, set another `POSTGRES_PORT` in `.env` and change
the three URLs to match, or the migration talks to the wrong server.

## Running it for real

[docs/launch.md](docs/launch.md) is the ordered checklist for taking an
installation live the first time, including the two steps that are painful
to get wrong: the public URL passkeys bind to, and creating the first
account before anybody else finds the address.
[docs/deploy.md](docs/deploy.md) is the deployment guide behind it: Docker
Compose on an EU VPS, with Coolify doing the plumbing.
[docs/devices-setup.md](docs/devices-setup.md) is the step-by-step guide to
letting riders connect Garmin, Wahoo or Polar so rides come in by
themselves: the developer programmes, the callback and webhook addresses,
and the keys.
[docs/upload-keys.md](docs/upload-keys.md) is the way in that needs
nobody's keys: a rider's upload key for a script or an app, the bike
computer on a cable, a share from the phone. Which third parties can
see data, and what, is listed in
[docs/subprocessors.md](docs/subprocessors.md) — today that is the
hosting provider and the AI provider you choose. With `LLM_PROVIDER=ollama`
nothing leaves the server at all.

## Contributing and security

[CONTRIBUTING.md](CONTRIBUTING.md) explains how changes are made here:
plan first, vertical slices, tests where they matter, an ADR for every
decision worth arguing about later.
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) covers how we talk to each
other. Found a security problem? Please report it privately as described
in [SECURITY.md](SECURITY.md) rather than in a public issue.

What we know is not right yet is written down rather than hoped away:
[TECH-DEBT.md](TECH-DEBT.md) lists it, with the reason it is still there
and what fixing it would take.

License: [AGPL-3.0](LICENSE). The two typefaces the interface is set in ship in `public/fonts`, both under the SIL Open Font License 1.1: Archivo by the Archivo Project Authors ([OFL.txt](public/fonts/OFL.txt)) and Geist Mono by the Geist Project Authors ([OFL-Geist.txt](public/fonts/OFL-Geist.txt)). The `.woff2` files are Google Fonts' own subsets, copied in so that a build needs no network.
