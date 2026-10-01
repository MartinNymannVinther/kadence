# Kadence — plan til godkendelse

Kadence (kadence.haij.dk) er et dansk, open source alternativ til
TrainingPeaks for U17-, U19- og U23-ryttere, deres trænere og deres
forældre. Det er et værktøj i Haij-familien og står på Haij-fundamentet,
taget fra Plot (den nyeste søskende) på samme måde som Plot tog det fra
Makker. Grundlaget er de tre notater i `docs/research/`.

Planen følger familiens arbejdsgang: planen, skemaet og API-fladen
godkendes først, og derefter bygges der bølge for bølge. Hver bølge
slutter med grønt build, grønne tests og et commit på main.

## 1. Det Kadence er

**Kalenderen er i centrum.** Træneren lægger pas i rytterens kalender,
både på cykel, styrke og andet. Rytteren kører passet, og aktiviteten
kommer ind fra Garmin, Wahoo eller en FIT-fil og bliver automatisk parret
med det planlagte pas. Hvert pas får en farve (grøn, gul eller rød) efter
hvor tæt det kom på planen, en tråd til kommentarer og en vurdering af,
hvor hårdt det var (RPE).

**DCU er standarden.** Når et hold eller en rytter oprettes, vælges
årgangen (U17 1. år til U23 4. år). Sæsonplanen udfyldes derefter med
DCU's 2025-tal: timer pr. måned (nov–sep, oktober er pause + frit),
faser (distance, lange basisintervaller, korte hårde intervaller) og
styrkeprogrammerne for U17, U19 og U23 med progression pr. pas (3×16,
3×12 og 4×6–8 RM osv.). Træneren kan afvige, men afvigelsen er altid
synlig.

**Belastning uden wattmåler.** Sessions-RPE (minutter × anstrengelse
1–10) er grundmodellen, fordi den virker for alle pas, også styrke, og
for alle ryttere. Watt og puls bruges, når de findes. Kondition, træthed
og friskhed vises med egne navne (TSS, CTL og NP er TrainingPeaks'
varemærker) og forklares i almindeligt dansk.

**Vagtværn, ikke forbud.** Kadence viser, når en plan eller en uge går ud
over rammerne, men bestemmer ikke over træneren (samme tanke som Plots
overbooking). Rammerne er:

- timer i forhold til DCU's korridor for årgang og måned
- længste tur (U17 højst 4 t/120 km, U19 højst 5 t/150 km)
- stigning fra uge til uge
- styrkepas med mindre end 48 timer imellem
- trivsel i gul zone i længere tid (Kolding Talent-modellen: gul kræver
  en samtale inden for 14 dage, rød kræver professionel hjælp)
- smertetrappen fra ATK

**Tre roller, som i TrainingPeaks, plus forælderen:**

| Rolle                          | Kan                                                                                                  | Kan ikke                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Træner (owner/admin)           | Planlægge for alle holdets ryttere, se alt de deler, skabeloner, sæsonplaner, holdkalender           | Se det en rytter har valgt ikke at dele |
| Rytter (member + rytterprofil) | Se og udføre egen plan, logge check-in, kommentere, forbinde enheder, eksportere alt                 | Se andre rytteres helbredsdata          |
| Forælder (member + værgelink)  | Se eget barns plan, timer og belastning; trivsel og søvn kun hvis rytteren deler det; forældreguiden | Se andre ryttere; ændre planen          |

Adskillelsen mellem ryttere håndhæves **i databasen med RLS** via
`app.user_id`, ikke kun i koden. Helbredsdata om mindreårige er det
første sted, familien har brug for mere end adskillelse pr. arbejdsrum.

**Forældre.** Forældre har deres egen side med guiden: de 10 temaer og
de 9 råd, omskrevet med egne ord og med link til Team Danmarks originaler
(de forbyder kommerciel gengivelse). Siden rummer også en ugeoversigt
over barnets hverdag, dvs. træning, skole, eksamen og søvn. Samtaler
mellem træner og en mindreårig rytter kan forældre se. Der findes ingen
private chats mellem en voksen og et barn.

**Ungdomshensyn, der er valgt med vilje:**

- Ingen vægt og ingen W/kg for U17/U19 som standard (risiko for lav
  energitilgængelighed og spiseforstyrrelser, jf. ATK).
- Ingen ranglister.
- Procesmål før resultatmål.
- Skole- og eksamenskalender.
- Højdemåling i vækstspurten.

**AI foreslår, mennesket bestemmer** (dogme 5), med tre forslag:

1. **Ugeudkast.** Forslag til næste uges pas ud fra DCU-korridoren,
   kalenderen (løb, eksamen), belastningen og check-ins. Træneren tager
   eller afviser hvert pas.
2. **Tekst til struktureret pas.** "3×10 min AT, 5 min pause" bliver til
   intervaltrin.
3. **Mandagsoverblik til træneren.** Deterministiske flag ("hvem kræver
   opmærksomhed") med et kort AI-resumé ovenpå.

AI'en skriver aldrig til rytteren, ændrer aldrig planen og sletter
aldrig noget. Den bruger Mistral i EU eller Ollama lokalt. Når AI får
adgang til rytterdata, er det et fravalg pr. hold, og det står i
`subprocessors.md`.

**Enheder.** Der er én ting, der altid virker, og to adaptere:

- **FIT-upload** (altid, også offline): rytteren trækker filen ind, og
  Kadence læser varighed, distance, watt, puls, tid i zoner og bedste
  præstationer. Siden ADR 0029 også uden at trække: cykelcomputeren på
  et kabel læst som mappe ("Hent fra enheden"), en fil delt fra
  telefonen, og en personlig upload-nøgle, som et program kan aflevere
  ture med, uden at rytteren er logget ind (docs/upload-keys.md).
- **Wahoo Cloud API:** OAuth, nye ture kommer ind automatisk, og planlagte
  pas skubbes ud til ELEMNT/KICKR.
- **Garmin Connect (Activity + Training API):** samme mønster. Adapteren
  bygges, men den virker først med nøgler fra Garmin.
- **Eksport af pas** som .zwo/.erg/.mrc til indendørstræning, og som FIT
  workout til enheder.

## 2. Hvad vi tager med fra TrainingPeaks, og hvad vi lader ligge

- **Beholder:**
  - kalender med træk-og-slip og farver for hvor tæt passet kom på planen
  - workout-builder og skub til enheder
  - kondition/træthed/friskhed
  - kommentarer og RPE på hvert pas
  - holdplaner, hvor træneren retter én gang og det gælder alle
  - delt bibliotek
- **Forbedrer:**
  - mobil først: alle funktioner, også workout-builderen, virker på
    telefonen (det mest efterspurgte ønske hos TrainingPeaks, 438 stemmer)
  - dansk fra dag ét
  - flere trænere pr. rytter
  - forælderrolle
  - belastning via sRPE uden wattmåler
  - sync-status, der er synlig for rytteren
  - fuld eksport
- **Undgår:**
  - pris pr. atlet og betalingsmure på kernefunktioner (AGPL; samme kode
    hostet og selvhostet)
  - funktioner, der kun findes på web
  - voksne præstationsmål på børn
  - private chats mellem voksen og barn
  - mørke abonnementsmønstre
  - afhængighed af én hardwareproducent

Det sidste punkt er vigtigt, fordi Garmin købte TrainingPeaks den 22.
juli 2026, og Garmins onboarding til Connect-API'et er efter sigende sat
på pause.

## 3. Begreber (så få som muligt)

Der er ti begreber: hold, rytter, værge, pas (planlagt), aktivitet
(udført), skabelon, sæsonplan, check-in, kalenderbegivenhed (løb, skole,
eksamen, ferie) og kommentar. Resten er afledte visninger: kalenderen,
belastningskurven, holdoverblikket, forældreugen og mandagsoverblikket.

**Bevidst ikke bygget i v1:**

- en rytter på flere hold (klub og landshold samtidig)
- betaling
- Strava (deres vilkår forbyder at vise en brugers data for andre, fx en
  træner)
- COROS, Apple, Zwift og TrainerRoad som adaptere (FIT og .zwo dækker
  dem)
- ernæring
- vægt og W/kg for U17/U19
- direkte beskeder
- push-notifikationer
- native app (vi laver en PWA, der kan installeres)

## 4. Skema (bølge 0)

Alle tabeller har `org_id`, tvungen RLS, audit-trigger og en
isolationstest. Tabeller, der hører til en rytter, har også `rider_id`
og en politik, der kun giver adgang til:

- holdets trænere
- rytteren selv
- rytterens værger, når delingsflaget for den pågældende datatype er sat

| Tabel                           | Indhold                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `team_settings`                 | årgangsstandard, zonemodel, AI-tilvalg                                                                                            |
| `riders`                        | user_id, fødselsår, årgang/kategori, køn (valgfrit), tærskler (FTP, LTHR, maxpuls) med dato, delingsflag til værger               |
| `guardians`                     | værgens user_id ↔ rider_id, bekræftet af rytteren, udløber når rytteren fylder 18                                                 |
| `rider_measurements`            | højde (vækst), tærskeltests; ingen vægt for U17/U19                                                                               |
| `workout_templates`             | navn, sport (cykel/styrke/andet), struktur som JSON-trin (varighed/mål/zone), kilde (DCU/egen)                                    |
| `season_plans`, `season_months` | rytter, sæson, månedstimer, fase; kopieret fra DCU-standarden og redigerbar                                                       |
| `planned_sessions`              | rytter, dato, sport, struktur, planlagt tid/belastning, kilde (skabelon/AI/hånd), holdplan-id                                     |
| `activities`                    | rytter, start, sport, varighed, distance, watt/puls-resumé, tid i zoner, kilde (fit/wahoo/garmin/hånd), rå fil i `activity_files` |
| `session_feedback`              | RPE, følelse, kommentar; sRPE-belastning                                                                                          |
| `checkins`                      | dato, søvn i timer, søvnkvalitet, energi, humør, muskelømhed, smerte (ATK-trappen), fritekst                                      |
| `calendar_events`               | løb, skole/eksamen, ferie, syg; rytter- eller holdniveau                                                                          |
| `comments`                      | tråd pr. pas/aktivitet/uge; synlig for træner, rytter og værge                                                                    |
| `device_links`                  | udbyder, krypterede tokens (secret-box), sidste sync, fejl                                                                        |
| `ai_proposals`                  | forslag, der venter på et ja; indholdet er kun data                                                                               |

## 5. API-flade

Server actions gennem `runAction`: ryttere/værger, pas (opret, flyt,
kopiér, holdplan), skabeloner, sæsonplan, feedback, check-in, kalender,
kommentarer og enheder.

Routes:

- `POST /api/activities/upload` (FIT)
- `GET/POST /api/devices/{wahoo,garmin}/{connect,callback,webhook}`
- `GET /api/sessions/[id]/export?format=zwo|erg|mrc|fit`
- `/api/ai/{week-draft,build-workout,group-week,coach-brief}`
- `/api/export`
- `/api/health`
- `/api/version`

Ren logik uden database, testet for sig: belastning, zoner,
DCU-korridor, vagtværn, parring af planlagt og udført, FIT-resumé og
filformaterne til eksport.

## 6. Bølger

| Bølge   | Indhold                                                                                                                                                                                                                                                    |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0       | Fundamentet fra Kadence (ADR 0001). Portfolio/planning skåret væk. Produkttabellerne med RLS pr. hold og pr. rytter, isolationstests (hold A/B, rytter A/B, værge kun eget barn). CLAUDE.md, README med dogmerne, port 5437, `kadence_app`/`kadence_auth`. |
| 1       | Hold, roller og kalender: invitationer til træner, rytter og værge, rytterprofil, uge- og månedskalender (mobil først), workout-builder, bibliotek med DCU's styrkeprogrammer, holdplaner, manuel udførelse med RPE og kommentarer.                        |
| 2       | Sæsonplan og belastning: DCU-standarden pr. årgang, korridoren, belastningskurven, vagtværn, check-in og trivselszoner, løbs-, skole- og eksamenskalender, trænerens overblik over hvem der kræver opmærksomhed.                                           |
| 3       | Enheder: FIT-upload og parsing, automatisk parring, Wahoo-adapter, Garmin-adapter, eksport af pas, sync-status.                                                                                                                                            |
| 4       | Forældre og AI: forældrevisning og guide, delingsvalg, de tre AI-forslag, en demo med et U19-hold i fuld gang, eksport, hjælp, docs, tool card.                                                                                                            |
| Før 1.0 | Dogme syv: én rigtig vinterperiode (nov–mar) med ét rigtigt hold.                                                                                                                                                                                          |

## 7. Afhængigheder, der kræver et ja

- `fit-file-parser` (MIT) til at læse FIT-filer. Garmins egen `@garmin/fitsdk`
  har en særlicens, der skal vurderes over for AGPL, før vi bruger den. FIT-workout-filer
  skriver vi med en lille egen encoder.
- Intet diagrambibliotek: grafer tegnes som SVG, som i søskendeværktøjerne.

## 8. Ting kun Martin kan gøre

- Ansøge Garmin Connect Developer Program og Wahoo Cloud API som virksomhed.
- Juridisk afklaring: helbredsdata (art. 9) om 15–17-årige. Digital
  samtykkealder i DK er 15 år. Samtykketekst, privatlivspolitik og
  databehandleraftale med klubber.
- Eventuel aftale med Team Danmark, hvis deres modeller skal vises i appen.
- Dialog med DCU om brug af anbefalingerne og navnet.
- GitHub-repo (offentligt) og senere deploy i Coolify.
- Uoverensstemmelserne i DCU's egne dokumenter (7 stk., se
  `docs/research/dcu-traeningsanbefalinger.md` §6.5). Kadence bruger 2025-tallene og
  programmernes egne progressioner, indtil DCU siger andet.
