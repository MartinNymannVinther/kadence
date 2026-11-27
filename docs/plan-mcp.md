# Kadence — plan til godkendelse: din egen AI taler med Kadence (MCP)

November 2026. Planen svarer på Martins spørgsmål af 27. november 2026,
om man kan bygge en MCP-adgang til Kadence, så man kan bruge sin
ChatGPT, Claude eller en anden assistent til at tale med sin Kadence, og
på hans ja til retningen samme dag. Den følger arbejdsgangen i CLAUDE.md:
planen, skemaet og API-fladen godkendes først, og derefter bygges der
bølge for bølge, hver på sin egen branch og med sin egen PR. Afsnit 9
samler spørgsmålene til Martin, og afsnit 10 hans svar. Ingen kode er skrevet endnu.

Beslutningen og dens pris står i ADR
[0118](adr/0118-your-own-ai-talks-to-kadence.md), foreslået sammen med
planen.

---

## 1. Hvad det er

MCP (Model Context Protocol) er den åbne protokol, som Claude, ChatGPT,
Mistrals Le Chat og en række lokale programmer bruger til at tale med
andre tjenester. Kadence får én adresse, `/api/mcp`. En person tilføjer
Kadence som forbindelse i sin assistent, logger ind på Kadence, vælger
arbejdsrum og siger ja til, hvad assistenten må. Derefter kan man
spørge sin egen assistent:

- "Hvordan gik min uge, og hvad står der til i morgen?"
- "Jeg sov dårligt og har tunge ben. Lav min check-in."
- "Hvordan ser min form ud de sidste seks uger?"
- (træner) "Lav et udkast til U17's uge 49 med to rolige pas og et
  intervalpas, ud fra biblioteket."

Kadences egen AI (Mistral i EU eller Ollama) er uændret. MCP er en
dør ind for den model, personen selv har valgt. Kadence kalder ingen
model her: assistenten spørger, og Kadence svarer med data.

## 2. De fire beslutninger, Martin sagde ja til 27. november

### 2.1 Personens eget valg af model

Når en person selv har valgt en model uden for EU, er det deres valg om
deres egne data, ikke Kadences. Det er samme mønster som Wahoo og
Garmin: de står ikke i tabellen over Kadences databehandlere, men under
"Services a rider chooses to connect" i `docs/subprocessors.md`. MCP får
et afsnit dér, der siger, hvad der går hvorhen, og at modtageren er den
assistent, personen selv har forbundet.

Kadence sender intet ud af sig selv. Assistenten henter, når personen
spørger, og kun det, forbindelsen giver lov til.

### 2.2 Andres data går ikke med

Grænsen er ens egne data. En rytter, der sender sine egne check-ins til
sin assistent, har valgt det selv. En træner, der sender en U17-rytters
check-ins til en amerikansk sky, sender en mindreårigs helbredsdata ud
uden klubbens aftale. Derfor:

- **Rytteren** kan læse alt om sig selv, som rytteren selv kan se i
  Kadence: plan, ture, form, check-ins, sæsonplan og trænerens
  kommentarer på egne pas.
- **Træneren** kan læse holdets plan (pas, tider og steder), biblioteket
  og sæsonplanerne, og rytternes fornavne og klasser, så "Emma" og "U17"
  kan bruges i et udkast. Træneren kan **ikke** læse rytternes ture,
  check-ins, form, smerter, tærskler eller guardrail-flag gennem MCP, uanset
  om holdets "Må AI'en læse rytternes data" er slået til. Den
  indstilling blev givet til Kadences egen model i EU, og den rækker ikke
  til en model, træneren selv har valgt (Martins svar 10.3).
- **Forælderen** er ikke med i første omgang (afsnit 7).
- **Vægt** findes ikke som tal i Kadence og kommer heller ikke ud her.
- **Alder.** En person skal selv kunne give samtykke for at forbinde en
  assistent: fra det år, man fylder 15, efter databeskyttelseslovens § 6,
  stk. 2 og 3, som Kadence allerede bruger (`SELF_CONSENT_AGE` i
  `src/core/access/age.ts`, med kilden). En rytter under 15 får at vide,
  at det ikke kan lade sig gøre endnu, og hvorfor.

### 2.3 Ingen sletning og ingen afsendelse

Intet værktøj sletter, sender mail eller push, inviterer, ændrer roller,
indstillinger, nøgler eller enheder, eksporterer eller lægger noget i en
kalender. Der er kun to slags skrivning, og begge kan fortrydes i
Kadence:

- **Rytterens egen check-in** for i dag eller i går. Det er personen
  selv, der siger tallene. Assistenten skriver dem bare ind, og check-in'en
  kan rettes bagefter som altid.
- **Et udkast i ugeplanlæggeren** (`week_plan_drafts`, ADR 0043). Det er
  den kladde, trænerne allerede deler. Intet når en kalender, før en
  træner åbner planlæggeren og lægger ugen ind. Assistenten skriver aldrig
  oven i en kladde, som en anden har gemt (afsnit 4.3).

Hvert kald logges med personen, arbejdsrummet, assistentens navn og
værktøjet (afsnit 5.4).

### 2.4 Indhold udefra er data

Det, en rytter eller træner har skrevet, kommer med i svarene: en titel,
en kommentar, en note på en check-in. Kadence kan ikke indhegne det i en
fremmed models prompt, så fladen er lavet, så det ikke kan skade:

- Fritekst kommer altid i et felt for sig (`text`) og aldrig i
  værktøjets beskrivelse eller fejltekst. Længden er begrænset.
  Værktøjsbeskrivelserne siger, at tekstfelter er brugernes egne ord og
  ikke instruktioner.
- Ingen værktøjer kan noget, der ville være farligt, hvis en note
  narrede assistenten: ingen sletning, ingen afsendelse, ingen andres
  data.
- Det, assistenten skriver ind, behandles som modelsvar: valideret med
  zod, saneret og begrænset med de samme sanitizers som Kadences egne
  AI-forslag (`src/modules/assist`), før det gemmes.

## 3. Login og forbindelse

MCP-specifikationen (version 2026-07-28,
https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
kræver OAuth 2.1 med PKCE. Kadence er både den server, assistenten
logger ind hos, og den server, der svarer på værktøjerne. Hvem der kan
hvad, er undersøgt 27. november 2026 med kilderne nævnt:

| Assistent                    | Sådan logger den ind                                                                                                               | Hvem kan bruge det                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude (web, Desktop, mobil) | OAuth, med CIMD eller DCR (https://claude.com/docs/connectors/building/authentication)                                             | Også Free, med én egen forbindelse. På Team og Enterprise tilføjer ejeren den (https://support.claude.com/en/articles/11175166)                                             |
| Claude Code                  | OAuth med CIMD og en lokal adresse, eller en fast nøgle i en header (https://code.claude.com/docs/en/mcp)                          | Alle                                                                                                                                                                        |
| ChatGPT                      | OAuth, med CIMD eller DCR (https://developers.openai.com/apps-sdk/build/auth)                                                      | Fuld MCP med skriveværktøjer kun på Business, Enterprise og Edu. Pro kan kun læse. Free og Plus er ikke nævnt, kun på nettet (https://help.openai.com/en/articles/12584461) |
| Mistral Le Chat              | OAuth 2.1 med DCR, eller en fast nøgle (Bearer) (https://docs.mistral.ai/le-chat/knowledge-integrations/connectors/mcp-connectors) | Kontoens admin tilføjer den, også på Free                                                                                                                                   |

Det betyder i praksis: en rytter med en gratis konto kan bruge Claude
eller Le Chat. En rytter med ChatGPT Free eller Plus kan, som det ser ud
nu, ikke. Det er OpenAIs valg og ændrer sig muligvis.

**Sådan bygges det.** Better Auth har pakkerne i den version, vi kører
(1.7.14, ADR 0111), og de er undersøgt i pakken selv:

- `@better-auth/mcp` bygger på `@better-auth/oauth-provider` og er den
  autorisationsserver, MCP forventer: metadata efter RFC 8414 og RFC 9728,
  PKCE kun med S256, `resource` efter RFC 8707, roterende refresh-tokens,
  tilbagekaldelse (RFC 7009) og en samtykkeside, vi selv tegner.
- `@better-auth/cimd` giver Client ID Metadata Documents. Det er den måde,
  Claude og ChatGPT helst registrerer sig på.
- Dynamisk registrering (DCR) slås til, fordi Le Chat kun kan den. Specen
  kalder den forældet, men den bliver mindst 12 måneder endnu. Åben
  registrering betyder, at enhver kan oprette en klient. En klient kan
  intet uden en persons samtykke, men registreringen er rate-limited pr.
  adresse, og en klient uden samtykke fjernes efter et døgn.

Det er tre nye pakker fra samme familie. De pinnes til præcis samme
version og flyttes sammen med de tre andre (ADR 0111). Det er en ny
afhængighed, og den kræver Martins ja (spørgsmål 9.6).

**Forbindelsen trin for trin.**

1. Assistenten kalder `/api/mcp` uden token og får 401 med
   `WWW-Authenticate: Bearer resource_metadata="…"`. Det starter login.
2. Personen logger ind på Kadence som altid, med passkey, adgangskode
   og TOTP.
3. Har personen mere end ét arbejdsrum, vælger de ét (Better Auths
   `postLogin` med `consentReferenceId`). Forbindelsen gælder dét
   arbejdsrum, og samtykket gemmes med det som `referenceId`.
4. Samtykkesiden på dansk viser assistentens navn som almindelig tekst og
   adressen, den vender tilbage til (fx claude.ai). Navnet opgiver
   klienten selv, så adressen er det, man kan stole på. Siden viser også
   arbejdsrummet, og hvad assistenten må og ikke må, med et flueben pr.
   scope (`kadence:read`, `kadence:checkin`, `kadence:draft`). Kun de
   scopes, personens rolle kan bruge, bliver vist.
5. Kadence afviser her, hvis personen er under 15 (2.2), hvis personen
   er forælder, eller hvis installationen har slået flaget fra. Holdet har
   ingen indstilling for det (10.2).
6. Når personen siger ja, oprettes rækken i `ai_connections` (5.2).

**Ved hvert kald** tjekkes tokenet lokalt: udstedt af Kadence, til
ressourcen `…/api/mcp`, ikke udløbet og ikke tilbagekaldt. Tokenet
slås op til forbindelsen og dens arbejdsrum, medlemskabet tjekkes igen,
og rollen og scopet tjekkes mod værktøjet. Mangler et scope, er svaret
403 `insufficient_scope`. Opslaget er rate-limited pr. person, som
upload-nøglen er. Tokens bliver aldrig sendt videre.

## 4. Værktøjerne: API-fladen

Navnene er på engelsk, fordi modellerne læser dem. Beskrivelserne er på
engelsk med danske ord for Kadences begreber (pas, tur, check-in,
kondition, træthed, friskhed), så assistenten svarer med de samme ord som
appen. TrainingPeaks' varemærker (TSS, CTL, ATL, TSB, NP, IF) findes
ingen steder. Datoer er københavnske dage.

Hvert værktøj er en lille fil i `src/modules/mcp/tools/`. Den har et
zod-skema for input, kræver en rolle og et scope, har
MCP-annotationerne (`readOnlyHint`, `destructiveHint: false`) og kalder
en service, der allerede findes, med et `OrgContext`. Så gælder RLS,
rollechecket og adskillelsen mellem ryttere præcis som i appen.

### 4.1 For rytteren (scope `kadence:read`)

| Værktøj                      | Svarer med                                                                     | Service                       |
| ---------------------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| `get_today`                  | dagens pas, gårsdagens tur, om check-in'en er lavet                            | Today's services              |
| `get_my_week(monday?)`       | ugens pas, planlagt og redet, flyttet eller sprunget over med grund (ADR 0117) | `listSessions`, plan-mod-tur  |
| `get_session(id)`            | et pas: blokke, mål, tid og sted, trænerens kommentarer                        | `getSession`, `listComments`  |
| `list_my_rides(from, to)`    | turene: varighed, belastning, distance, puls og watt i sum                     | `listOwnRides`, `recentRides` |
| `get_my_form(days ≤ 180)`    | kondition, træthed, friskhed pr. dag og ugens timer                            | `loadSeries`, `weeklyTotals`  |
| `list_my_checkins(from, to)` | søvn, energi, humør, ømhed, stress, smerte, syg, egen note                     | `listCheckins`                |
| `get_my_season_plan`         | månederne med timer, DCU's tal for klassen                                     | `getSeasonPlan`               |

Ingen GPS-spor, ingen rå FIT-filer. En tur kommer ud som tal, ikke som
et kort over, hvor rytteren bor.

### 4.2 For rytteren (scope `kadence:checkin`)

| Værktøj                    | Gør                                                                                                | Service       |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ------------- |
| `save_my_checkin(date, …)` | gemmer eller retter rytterens check-in for i dag eller i går, med de felter, check-in'en har i dag | `saveCheckin` |

### 4.3 For træneren (scope `kadence:read`)

| Værktøj                         | Svarer med                                                         | Service                            |
| ------------------------------- | ------------------------------------------------------------------ | ---------------------------------- |
| `get_team`                      | holdets navn, grupper, ryttere med fornavn og klasse               | team-services                      |
| `get_team_week(monday)`         | ugens planlagte pas pr. rytter og gruppe, ikke hvad der blev redet | `listSessions`                     |
| `search_library(query, kind?)`  | pas, øvelser og forløb i holdets bibliotek og Kadences/DCU's       | biblioteket                        |
| `get_season_plans`              | holdets sæsonplaner og DCU's tal for klasserne                     | `getSeasonPlan`, `src/modules/dcu` |
| `get_week_draft(monday, scope)` | kladden i ugeplanlæggeren, hvis der er en                          | `getWeekPlanDraft`                 |

### 4.4 For træneren (scope `kadence:draft`)

| Værktøj                                    | Gør                                                                                                                                                                                                                 | Service             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `propose_week_draft(monday, scope, items)` | lægger et udkast i ugeplanlæggeren for holdet eller én rytter. Det sker kun, hvis der ikke er en kladde, eller hvis det er ens egen, og den ikke er rørt af andre. Ellers svarer værktøjet, at der ligger en kladde | `saveWeekPlanDraft` |

En rytter i sit personlige arbejdsrum er også dets træner (ADR 0010) og
får derfor også 4.3 og 4.4 for sig selv.

### 4.5 Det, alle får

- **Instruktioner ved forbindelse** (MCP's `instructions`): Kadences ord,
  københavnske dage, at tekstfelter er brugernes egne ord, at en træner
  bestemmer, og at Kadence ikke kan slette eller sende noget.
- Et udløbet arbejdsrum (ADR 0090) kan stadig læses, men skrivning
  afvises med samme ord som i appen.

## 5. Skema

### 5.1 Better Auths OAuth-tabeller

`@better-auth/mcp` og `@better-auth/oauth-provider` tilføjer Better
Auths egne tabeller: `oauthClient`, `oauthAccessToken`,
`oauthRefreshToken`, `oauthConsent`, `oauthResource`,
`oauthClientResource` og `oauthClientAssertion`. De bliver i Kadence
`oauth_*` i snake_case, i en migrering, der er skrevet i hånden som de
andre. De ligger som Better Auths øvrige tabeller (sessions, accounts):
auth-rollen læser og skriver dem, app-rollen har ingen adgang, og
meta-testen for forced RLS får dem på sin liste over Better Auths tabeller.
Tokens gemmes kun som hash. Før koden skrives, kører Better Auths
skematjek (ADR 0111) mod migreringen med et rigtigt login og en rigtig
forbindelse.

### 5.2 `ai_connections`: hvilken forbindelse, i hvilket arbejdsrum

En ny tabel med `org_id`, forced RLS, audit-trigger og isolationstests,
som CONTRIBUTING.md kræver:

| Kolonne        | Hvad                                                                         |
| -------------- | ---------------------------------------------------------------------------- |
| `id`           | domæne-id                                                                    |
| `org_id`       | arbejdsrummet, forbindelsen gælder                                           |
| `user_id`      | personen                                                                     |
| `client_id`    | Better Auths OAuth-klient (assistenten)                                      |
| `client_name`  | navnet, assistenten opgav, kappet og vist som tekst ("Claude")               |
| `scopes`       | `kadence:read`, `kadence:checkin`, `kadence:draft`                           |
| `role`         | rytter eller træner, da forbindelsen blev givet; tjekkes igen ved hvert kald |
| `last_used_at` | sidst brugt                                                                  |
| `created_at`   | givet                                                                        |

Politikker: personen ser, giver og fjerner sine egne, og ingen andre ser
dem, heller ikke en træner (10.1). Det er forskellen fra upload-nøglen
(ADR 0029): nøglen bringer ture ind på holdet, mens en forbindelse kun
henter personens egne data ud til dem selv.

En forbindelse er død med det samme, når den fjernes, når personen
forlader arbejdsrummet, og når rytteren arkiveres. Ved hvert kald tjekkes
medlemskabet igen, som `getOrgContext` gør (`stillAMember`).

### 5.3 Ingen andre migreringer

Check-ins og ugekladder bruger de tabeller, de har. Der kommer ingen ny
kolonne på en check-in for at sige, at den kom via MCP. Det står i
audit-loggen (5.4).

### 5.4 Audit

Hvert værktøjskald skrives som en semantisk audit-hændelse, som
`recordAuthEvent` gør det i dag: person, arbejdsrum, forbindelse,
værktøj, og om det lykkedes. Indholdet kommer ikke med. Det, der skrives
i en tabel, får desuden sin almindelige række fra audit-triggeren. Den
skriver i dag `actor_type` som `user` eller `system`. En migrering lærer
den at skrive `ai_connection`, når transaktionen har sat
`app.channel = 'mcp'`. Så kan en check-in eller en kladde, der kom via en
assistent, kendes i loggen. Det er en lille ændring i `withOrgContext` og
i audit-funktionen.

## 6. Hvor det ligger i koden

- `src/app/api/mcp/route.ts`: én route, POST. Den er stateless og svarer
  med `application/json`. Ingen sessioner, ingen SSE, og GET og DELETE får 405.
  En `Origin`, der ikke er Kadences egen, afvises, som specen kræver.
- `src/modules/mcp/protocol.ts`: JSON-RPC 2.0 i begge versioner af MCP,
  som specen tillader på samme adresse
  (https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning).
  Fra 2026-07-28: `server/discover`, `tools/list` (med `ttlMs` og
  `cacheScope`), `tools/call`, `resultType` og tjekket af headerne
  `MCP-Protocol-Version`, `Mcp-Method` og `Mcp-Name`. Fra den forrige
  version: `initialize`, `notifications/initialized` (202) og `ping`, som
  Le Chat bruger i dag. Det er ren logik og testet alene.
- `src/modules/mcp/admit.ts`: token til `OrgContext`, scopes, rolle,
  alder, medlemskab, rate limit.
- `src/modules/mcp/tools/*.ts`: ét værktøj pr. fil, og et register, der
  samler dem.
- `src/modules/mcp/connections.ts`: services og actions for siden med
  forbindelser.
- `src/app/[locale]/(app)/(narrow)/settings/ai-connections/`: siden
  "Din AI" under Indstillinger. Den viser forbindelserne, hvad hver må,
  hvornår de sidst blev brugt, en knap til at fjerne og en kort vejledning
  til Claude, ChatGPT og Le Chat.
- `src/app/[locale]/(auth)/connect/`: samtykkesiden, på dansk. Den siger,
  hvem der beder om adgang, hvilket arbejdsrum, og hvad assistenten må og
  ikke må.
- Installationsflaget `MCP`, slået til som standard som de andre (ADR
  0057), også på kadence.haij.dk fra begyndelsen (10.5). Slået fra giver
  `/api/mcp` og OAuth-endepunkterne 404, og siden findes ikke.

Ingen MCP-SDK. Den officielle pakke (`@modelcontextprotocol/sdk` 1.32)
trækker Express, Hono, CORS og en HTTP-server med sig, som en Next-route
ikke skal bruge. Den del af protokollen, Kadence har brug for, er
JSON-RPC over én POST i to versioner. Det er et par hundrede linjer,
fordelt på filer under 300 linjer, med tests.

## 7. Det, der bevidst ikke er med

- **Forældre.** En forælder ser kun det, rytteren deler. At sende det
  videre til en tredje models sky er rytterens valg, ikke forælderens.
  Det kan tages op, når der er brugt en vinter.
- **Ingen sletning, ingen afsendelse, ingen kalender** (2.3).
- **Ingen upload af ture gennem MCP.** Upload-nøglen (ADR 0029) og
  enhederne gør det allerede.
- **Ingen ressourcer, prompts, sampling eller elicitation** fra
  MCP-specifikationen. Kun værktøjer, som alle klienterne kan.
- **Ingen model i Kadence bliver kaldt** fra MCP. Kadences egen AI og
  dens grænser er urørte.

## 8. Bølger

Hver bølge er en PR til Martin og kan deployes for sig.

1. **Døren og rytterens læsning.** ADR 0118, flaget, OAuth med
   samtykkesiden, `ai_connections`, siden "Din AI", protokollen og 4.1.
   Martin prøver den på sin egen konto med Claude og Le Chat, før noget
   andet.
2. **Rytterens check-in og trænerens læsning.** 4.2 og 4.3, og
   isolationstestene for træneren (at intet felt om helbred kommer ud).
3. **Trænerens udkast.** 4.4, med reglen om ikke at skrive oven i en
   andens kladde.
4. **Det, der mangler bagefter.** Vejledningen i Hjælp, en
   demoforbindelse i demoen (som en række, der viser siden, uden et
   token), `docs/subprocessors.md` og manualen.

Tests i hver bølge:

- Protokollen: `initialize`, `tools/list`, ukendt metode, ukendt
  værktøj, forkert input og fejl som JSON-RPC-fejl, aldrig en stak.
- Et meta-test over registret: hvert værktøj har rolle, scope og
  annotationer, og kun de navngivne skriveværktøjer har
  `readOnlyHint: false`.
- Isolation: et token for hold A ser intet fra hold B. En rytters token
  ser ikke en holdkammerats data. Trænerens værktøjer returnerer ingen
  nøgler fra en liste over helbredsfelter, testet mod svarene, ikke mod
  koden.
- Livet: en fjernet forbindelse, en person, der har forladt holdet, og en
  arkiveret rytter får 401 med det samme. Et udløbet arbejdsrum kan læse,
  ikke skrive. Under 15 år afvises ved samtykket.
- `tests/i18n` for samtykkesiden og siden "Din AI".

## 9. Spørgsmål til Martin

1. **Ser træneren, at en rytter har forbundet en AI?** Forslag: ja, at
   der findes en, og assistentens navn, ikke hvad den har spurgt om. Det
   er sådan med upload-nøgler. Træneren kan fjerne den.
2. **Kan et hold sige nej?** Forslag: en holdindstilling, "Ryttere må
   forbinde deres egen AI", slået til som standard. Data om en selv er
   noget, rytteren alligevel kan hente med eksporten, men en klub med
   U17-ryttere kan ønske at sige nej.
3. **Holdets "Må AI'en læse rytternes data" og MCP.** Forslag: den
   indstilling gælder kun Kadences egen model, og træneren får aldrig
   rytternes helbredsdata gennem MCP. Det alternativ, der kunne overvejes:
   guardrail-flag og fornavn, som Mistral får, hvis indstillingen er slået
   til.
4. **En personlig nøgle til klienter uden OAuth.** Le Chat, Claude Code
   og lokale modeller kan også bruge en fast nøgle i stedet for OAuth.
   Den ville se ud som en upload-nøgle (ADR 0029), men med læseadgang.
   Nu, senere eller aldrig? Forslag: senere, efter bølge 1 er prøvet,
   fordi en nøgle, der kan læse, er farligere at miste end en, der kun
   kan aflevere en fil.
5. **Hvornår slås det til på kadence.haij.dk?** Forslag: når du har
   brugt det selv i et par uger, og spørgsmål 9.1–9.3 er besvaret.
6. **Tre nye pakker**: `@better-auth/mcp`, `@better-auth/oauth-provider`
   og `@better-auth/cimd`, alle på 1.7.14 og flyttet sammen med de tre
   andre. Ja? Alternativet er at skrive OAuth-serveren selv, og det
   anbefaler jeg ikke.
7. **ChatGPT.** Med OpenAIs regler i dag virker skriveværktøjerne kun
   for Business, Enterprise og Edu, og læsning kun fra Pro. Skal
   vejledningen nævne Claude og Le Chat først og sige det om ChatGPT
   ligeud? Forslag: ja.

## 10. Martins svar, 27. november 2026

1. **Træneren ser ikke forbindelserne.** Kun personen selv ser, giver og
   fjerner sine egne (5.2).
2. **Holdet kan ikke sige nej.** Der kommer ingen holdindstilling.
3. **Holdets "Må AI'en læse rytternes data" gælder kun Kadences egen
   model i EU.** Træneren får aldrig rytternes helbredsdata gennem MCP.
4. **En personlig nøgle kommer senere,** efter bølge 1 er prøvet.
5. **Slået til fra begyndelsen,** også på kadence.haij.dk, fordi der
   stadig kun er testbrugere. Flaget er derfor slået til som standard og
   kan slås fra.
6. **Ja til de tre pakker** `@better-auth/mcp`, `@better-auth/oauth-provider`
   og `@better-auth/cimd`, på 1.7.14.
7. **Vejledningen nævner Claude og Le Chat først** og siger ligeud, hvad
   ChatGPT kan og ikke kan.

## 11. Bølge 1, bygget 27. november 2026

På branchen `feat/mcp`:

- `/api/mcp` taler MCP 2026-07-28 og den tidligere version
  (`src/modules/mcp/protocol.ts`), med de syv værktøjer fra 4.1 til
  læsning.
- Login går gennem `@better-auth/mcp` og `@better-auth/cimd` på 1.7.14.
  Dynamisk registrering er slået til for Le Chat. Discovery ligger ved
  roden (`/.well-known/oauth-*`).
- `/connect` sender en person gennem Kadences eget login, også med
  to-trinsbekræftelse, og videre til samtykkesiden. Samtykkesiden lader
  personen vælge arbejdsrum.
- Migreringen er `drizzle/0063`. Den indeholder Better Auths
  OAuth-tabeller på auth-rollen, `ai_connections` med RLS, så kun personen
  selv ser sine forbindelser, og audit-mærket `ai_connection`.
- Siden "Din AI" ligger under Indstillinger og viser kun rytterens egne
  forbindelser. Når en forbindelse fjernes, får dens tokens 401 ved næste
  kald.
- Tre beslutninger er truffet undervejs og står i ADR 0118:
  - Ture fra Garmin kommer ikke med.
  - Formen afvises for en rytter med ture fra Garmin.
  - Kun ryttere kan forbinde i bølge 1.

Prøvet af mod en dev-server med en klient, der registrerede sig selv:
login, samtykke, token, alle værktøjer i begge protokolversioner,
afvisning af en forælder og af en rytter under 15, fjernelse og 401.
Ikke prøvet endnu: Claude, Le Chat og ChatGPT mod en rigtig
installation, fordi de kræver https.
