# Kadence — fokus til den første vinter

Planen bag grenen `feat/fokus-vinter`. Den bygger på gennemgangen af `main`
den 5. oktober 2026 (06a31e0): kernen er god, men produktet er vokset i
bredden hurtigere end i dybden, og intet har kørt et rigtigt hold endnu
(dogme syv). Målet er et produkt, hvor en træner kan lægge holdets uge på
fem minutter på telefonen, og en rytter bruger tyve sekunder om dagen.

Martin sagde den 6. oktober "lav alle rettelser i planen". De fire valg,
der var hans at træffe, blev ikke besvaret; grenen bygger på de anbefalede
og kan vendes ved gennemgangen af PR'en:

| Valg        | Bygget sådan                                                  | Kan vendes ved                       |
| ----------- | ------------------------------------------------------------- | ------------------------------------ |
| Påmindelser | Web push uden indhold og uden ny afhængighed (ADR 0060)       | at lade `PUSH_*` stå tomme           |
| Rulle       | Kernen bliver; land, byer, folk og lyd bag `RULLE_WORLD`      | `RULLE_WORLD=on`                     |
| Demoen      | Følger installationens flag                                   | at slå flagene til på installationen |
| Madguiden   | Bag `GUIDE_FOOD`, slået fra til en sportsdiætist har læst den | `GUIDE_FOOD=on`                      |

Intet er slettet. Det, der er parkeret, ligger bag et flag, og data bliver
liggende.

## Bølge 1 — rettelser

- Oktober har ingen DCU-ramme: en uge mest i "pause + frit" giver hverken
  "over" eller "under" (`load/guardrails.ts`). Rampen fanger stadig et
  pludseligt hop.
- Demoen følger DCU's fase: korte rolige ture i oktober, løb i løbssæsonen.
- Klubmesterskabets navnefelt holder bredden på en telefon.
- Overskriften over sidetitlen og forløbets advarsler består AA.
- Ingen udråbstegn i brugerfladen.
- Formkurvens løbsetiket ligger klar af linjen; skalaens ord er væk på
  telefonen, hvor forklaringen under kurven siger det samme.
- Madguidens kommentar siger det, der er rigtigt.

## Bølge 2 — fokus

- **Installationens flag** (ADR 0057): `RULLE_WORLD`, `COACHES_ROOM`,
  `CLUB_CHAMPIONSHIP`, `CALC_ENERGY`, `GUIDE_FOOD`, alle "off" som
  standard. Et flag skjuler menupunktet, siden, handlingen bag og demoens
  del på én gang.
- **Menuen efter rolle** og en bundbjælke på telefonen (ADR 0061).
  Træner: I dag · Kalender · Ryttere · Bibliotek · Mere. Rytter: I dag ·
  Kalender · Mig · Mere. Forælder: en side om barnet. Viden og beregnere
  flyttes ud af den indloggede menu til de åbne sider og Hjælp.
- **Skallen**: demobanneret på én linje, landskabet kun som tom tilstand,
  sidetitlen mindre på en telefon, "Bibliotek" i stedet for
  "Træningsbibliotek", rytterens indstillinger uden Arbejdsrum og AI.
- **Ordene**: ét navn for advarslerne ("opmærksomhedspunkter"), sæsonens
  tal hedder Sæsonplan · Lagt ind · Kørt · DCU, og "mål" er procesmålene.
  Hjælpeteksterne følger med.
- **Træningsgrundlaget** samles i ét valg i holdets indstillinger.
- **Enheder**: kun de udbydere, installationen har sat op; upload-nøglen
  under "Avanceret".
- **Designsystemet**: navngivne overskriftsstørrelser, `shadow-surface`,
  trykflader på mindst 40 px på telefonen, rester fra søskendeprojekterne
  ryddet i tokens og kommentarer.

## Bølge 3 — før piloten

- **Rytterens kom-i-gang** på I dag: hvad kører du med, tærskler eller
  spring over, bekræft din forælder, læg appen på hjemmeskærmen.
- **RPE lige efter turen**: når en tur er lagt ind uden en vurdering,
  spørger I dag "Hvor hårdt føltes den?".
- **Tid og sted på et pas** (ADR 0058): `planned_sessions.start_time` og
  `meeting_place`, vist på kort, i dag, hos forældre og i "Del ugen".
- **Join-siden** siger "holdet X" og rollen, ikke "arbejdsrummet".
- **Rytterens I dag** viser i dag: dagens pas, Udført og check-in. Form,
  rekorder, mål og upload ligger på den nye side **Mig** (`/me`).
- **Forælderen** lander på én side om barnet; "I dag" og "Forældre" er
  samlet.
- **Turens side** viser fire tal; resten ligger under "Mere data".

## Bølge 4 — vinteren

- **Ét sted at planlægge ugen** (ADR 0059): planlæggeren får "Start fra"
  (tom, sidste uge, et forløb, AI), uge-navigation, "Gentag i N uger" og
  "Gem som forløb". Et forløb kan nu rumme pas bygget direkte i
  planlæggeren (`training_block_items` uden skabelon). AI for én rytter og
  for gruppen er én knap.
- **Holdets uge** (ADR 0062): holdkalenderen viser punkterne ved hver
  rytter og linker fra punkt til uge. I dag for træneren er dagens pas og
  et tal: "3 ryttere har noget, der er værd at se på".
- **Sæsonplan for hele holdet** på én gang, efter hver rytters årgang.
- **Påmindelser** (ADR 0060): check-in om aftenen, ny kommentar, ændret
  plan, forældrenes ugeoverblik søndag. Pushen bærer intet indhold; den
  vækker browseren, som spørger Kadence som den indloggede person.
- **Del ugen** som tekst til holdets SMS- eller chatgruppe: pas, tid og
  sted, ingen sundhedsdata.

## Skema

| Migrering                    | Ændring                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `0026_session_time_place`    | `planned_sessions.start_time time`, `meeting_place text` (højst 120 tegn)           |
| `0027_block_inline_sessions` | `training_block_items.template_id` må være tom; pas med egen sport, titel og trin   |
| `0028_push_subscriptions`    | ny tabel med tvungen RLS (kun ejeren), audit, `push_subscriptions_due()` til jobbet |

## API-flade

- Server actions: tid og sted på et pas (gennem de eksisterende opret og
  ret), sæsonplan for holdet, gem uge som forløb, start fra sidste uge,
  tilmeld og afmeld påmindelser, vælg påmindelser.
- Routes: `GET /api/push/latest` (hvad er nyt for den indloggede, til
  service workeren), `POST /api/push/tick` (sender det, der er forfaldent;
  sikker at kalde, gør intet uden nøgler). Jobbet kører også i processen
  hvert tiende minut.
- `public/sw.js`: kun push og klik, ingen cache.

## Efter vinteren

Lad tre tal afgøre, hvad der kommer tilbage: andelen af ryttere, der
checker ind mindst fire dage om ugen, andelen af pas med en kvittering, og
trænerens minutter om ugen på at planlægge.
