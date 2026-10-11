# Fortegnelse over behandlingsaktiviteter

> **UDKAST til Martins rådgiver — ikke gennemgået af en jurist.**
> Udkast af 11. oktober 2026, efter GDPR art. 30. Del 1 er Haijs
> fortegnelse som databehandler (art. 30, stk. 2), del 2 som
> dataansvarlig (art. 30, stk. 1). Opdateres, når en behandling,
> en modtager eller en slettefrist ændrer sig.

**Haij:** Vinther Consulting, CVR [ ], kontakt Martin Nymann Vinther,
martin@vintherconsulting.dk. Ingen databeskyttelsesrådgiver (DPO) udpeget
[se dpia.md, indledningen]. Ingen repræsentant (art. 27): Haij er
etableret i Danmark.

**Fælles sikkerhedsforanstaltninger (S)** for alle aktiviteter nedenfor,
beskrevet i databehandleraftalens Bilag C.2: adskillelse mellem hold og
mellem ryttere i databasen med tvunget RLS (ADR 0002, 0011) og tests
(`tests/rls`); passkeys, TOTP og adgangskoder på mindst 12 tegn;
revisionsspor, der ikke kan redigeres (ADR 0003); https; forseglede
tokens; natlige backups krypteret med `age`, privat nøgle offline; drift
alene i EU (Hetzner, Tyskland); én person med driftsadgang, ingen "log ind
som" (ADR 0048).

**Fælles modtagere (M):** Hetzner Online GmbH (hosting og backup, Tyskland).

## Del 1: Haij som databehandler for klubber

Én fortegnelse pr. klub; klubbens navn og kontakt står i dens
databehandleraftale. [Til Martin: hold en liste over klubberne med
dato for aftalen ved siden af denne fil, ikke i det offentlige repo.]

### D1. Kadence for en klub

| Felt                            | Indhold                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dataansvarlig                   | Klubben, jf. dens databehandleraftale med Haij                                                                                                                                                                                                                                                                                                       |
| Kategorier af behandling        | Opbevaring og visning af træning, ture og check-ins; import af filer og ture fra rytterens forbundne enheder; beregning af belastning, form og opmærksomhedspunkter; AI-forslag på klubbens valg; påmindelser uden indhold; eksport og sletning; backup; revisionsspor                                                                               |
| Formål (klubbens)               | Planlægge og følge rytternes træning og trivsel                                                                                                                                                                                                                                                                                                      |
| Kategorier af registrerede      | Ryttere (overvejende 13–22 år), forældre, trænere og andre medlemmer, inviterede                                                                                                                                                                                                                                                                     |
| Kategorier af personoplysninger | Almindelige: konto, rolle, fødselsår, køn, klasse, UCI ID, pas, ture med GPS-spor, kommentarer, kalender, løbsresultater, enhedsforbindelser, push-adresse, revisionsspor med login-IP. Følsomme (art. 9): check-ins (søvn, energi, humør, ømhed, stress, smerte, sygdom, note), målinger (højde, puls, FTP, vægt fra 19 år), puls i ture. Bilag A.3 |
| Modtagere / underdatabehandlere | M; Mistral AI (EU-endepunkt) kun ved AI-forslag, rytterdata kun hvis holdet har sagt ja. Ikke underdatabehandlere: Wahoo, Garmin, Polar (rytterens valg), browserens push-tjeneste (tom besked)                                                                                                                                                      |
| Overførsel til tredjelande      | Ingen fra Haij. Rytterens eget valg af Wahoo eller Garmin (USA): ture ind, pas ud ved "send". Tom push til Apple, Google, Mozilla eller Microsoft (USA) for den, der har slået påmindelser til [rådgiveren vurderer, se databehandleraftalen punkt 8.2]                                                                                              |
| Slettefrist                     | Til klubben sletter (en rytter med `erase_rider`, arbejdsrummet med `delete_workspace`, begge med det samme); backups 30 dage; slettede pas til påmindelser 7 dage; revisionsspor med arbejdsrummet, planlagt 24 måneder for rækker om ryttere (S-11)                                                                                                |
| Sikkerhed                       | S                                                                                                                                                                                                                                                                                                                                                    |

## Del 2: Haij som dataansvarlig

### A1. Personers egne arbejdsrum (fra S-01; selvoprettelse fra S-08)

| Felt                            | Indhold                                                                                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formål                          | At levere Kadence til en person, der træner alene, eller til en forælder for sit barn under 15                                                                                                      |
| Hjemmel                         | Aftale (art. 6, stk. 1, litra b) for konto og træning; udtrykkeligt samtykke (art. 9, stk. 2, litra a) for check-ins og målinger; under 15 forælderens samtykke (databeskyttelsesloven § 6, stk. 3) |
| Kategorier af registrerede      | Ryttere alene (børn fra 15, voksne), børn under 15 med forælderen som ejer, forældre de inviterer                                                                                                   |
| Kategorier af personoplysninger | Som D1                                                                                                                                                                                              |
| Modtagere                       | M; Mistral ved AI-forslag, hvis personen bruger AI                                                                                                                                                  |
| Overførsel til tredjelande      | Som D1: kun personens eget valg af enheder og påmindelser                                                                                                                                           |
| Slettefrist                     | Til personen sletter arbejdsrummet; check-ins og målinger slettes, hvis samtykket trækkes tilbage (art. 17, stk. 1, litra b); backups 30 dage                                                       |
| Sikkerhed                       | S                                                                                                                                                                                                   |

### A2. Konti og login (alle brugere, også installationens ejer)

| Felt                            | Indhold                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formål                          | At lade personer logge sikkert ind og holde installationen sikker; at vide, hvem der må godkende nye arbejdsrum (`platform_role = 'owner'`, ADR 0004)                                                                                                                                                          |
| Hjemmel                         | Aftale (art. 6, stk. 1, litra b); sikkerhedslog: legitim interesse (art. 6, stk. 1, litra f) og art. 32                                                                                                                                                                                                        |
| Kategorier af registrerede      | Alle med en konto                                                                                                                                                                                                                                                                                              |
| Kategorier af personoplysninger | Navn, e-mail, adgangskode som hash, passkeys, TOTP-hemmelighed, sessioner med IP-adresse og browser, login og logud i revisionssporet med IP-adresse og browser, begrænsning af loginforsøg pr. IP-adresse (`rate_limits`), links til ny adgangskode                                                           |
| Modtagere                       | M. Trænere ser i dag login-IP og browser for holdets medlemmer i revisionssporet og eksporten (dpia.md, R9)                                                                                                                                                                                                    |
| Overførsel til tredjelande      | Ingen                                                                                                                                                                                                                                                                                                          |
| Slettefrist                     | Sessioner 7 dage efter sidste brug (Better Auth's standard). Konti: **ingen frist i dag**, slettes på anmodning af Martin [forslag: personens egen sletning, og konti uden arbejdsrum slettes efter 12 måneder]. Login i revisionssporet: med arbejdsrummet; uden arbejdsrum ingen frist [forslag: 12 måneder] |
| Sikkerhed                       | S; adgangskode-hash, TOTP og tokens er taget ud af revisionssporet (`audit_redact`)                                                                                                                                                                                                                            |

### A3. Ansøgninger om adgang

| Felt                            | Indhold                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formål                          | At installationens ejer kan afgøre, hvem der kommer ind (ADR 0004)                                                                                                              |
| Hjemmel                         | Skridt før en aftale på den registreredes anmodning (art. 6, stk. 1, litra b)                                                                                                   |
| Kategorier af registrerede      | Personer, der søger, og som endnu ikke er brugere                                                                                                                               |
| Kategorier af personoplysninger | Navn, e-mail, klubbens eller arbejdsrummets navn, en linje om holdet, IP-adresse, browser (`access_requests`); invitationer med e-mail og hash af nøglen (`access_invitations`) |
| Modtagere                       | M                                                                                                                                                                               |
| Overførsel til tredjelande      | Ingen                                                                                                                                                                           |
| Slettefrist                     | **Ingen i dag** (ADR 0004 udskød beslutningen til denne fortegnelse). Forslag: 6 måneder efter afgørelsen, IP-adressen efter 30 dage                                            |
| Sikkerhed                       | S; tabellerne har ingen bevilling til applikationsrollen overhovedet (ADR 0004)                                                                                                 |

### A4. Demoen

| Felt                            | Indhold                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Formål                          | At vise Kadence uden tilmelding (`DEMO=on`, ADR 0005, 0054)                                               |
| Hjemmel                         | Legitim interesse (art. 6, stk. 1, litra f); der bør ikke lægges rigtige oplysninger i                    |
| Kategorier af registrerede      | Besøgende                                                                                                 |
| Kategorier af personoplysninger | En konto uden e-mail med opdigtede data; IP-adresse i hukommelsen til begrænsningen på fem demoer i timen |
| Modtagere                       | M                                                                                                         |
| Overførsel til tredjelande      | Ingen                                                                                                     |
| Slettefrist                     | 24 timer (`DEMO_TTL_HOURS`). Demoens revisionsrækker bliver i dag liggende; S-04 sletter dem med demoen   |
| Sikkerhed                       | S; demokonti kan aldrig blive installationens ejer (`tests/auth/demo-never-owner.test.ts`)                |

### A5. Trænerrummet

| Felt                            | Indhold                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Formål                          | Et sted, hvor trænere på tværs af klubber deler erfaringer (ADR 0052)                                                         |
| Hjemmel                         | Legitim interesse (art. 6, stk. 1, litra f) [eller aftalen med træneren; rådgiveren vælger]                                   |
| Kategorier af registrerede      | Trænere; personer, en træner nævner                                                                                           |
| Kategorier af personoplysninger | Trænerens navn og klub, opslag og svar, meldinger, læsemarkører                                                               |
| Modtagere                       | Trænere på installationen; M                                                                                                  |
| Overførsel til tredjelande      | Ingen                                                                                                                         |
| Slettefrist                     | Til forfatteren sletter opslaget; ved en slettet konto bliver opslaget navnløst ("Tidligere træner"). Ikke i klubbens eksport |
| Sikkerhed                       | S; kun trænere læser; ejeren modererer                                                                                        |

### A6. Den åbne side om danske hold

| Felt                            | Indhold                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formål                          | At vise ryttere og forældre, hvilke U19- og U23-hold der findes, og hvem der kører for dem (ADR 0072)                                              |
| Hjemmel                         | Legitim interesse (art. 6, stk. 1, litra f), med oplysning efter art. 14 [mangler på siden]                                                        |
| Kategorier af registrerede      | U19- og U23-ryttere på DCU's og UCI's offentlige lister (nogle 17 år); holdledere, som DCU offentliggør                                            |
| Kategorier af personoplysninger | Navn, fødselsår, hold, plads og point på DCU's lister; holdlederens navn og kontakt som DCU skriver det; fotografier fra Wikimedia Commons af hold |
| Modtagere                       | Offentligheden (siden er åben); M                                                                                                                  |
| Overførsel til tredjelande      | Ingen fra Haij; kilderne er offentlige                                                                                                             |
| Slettefrist                     | Læses igen dagligt; en rytter forsvinder, når kilden ikke længere har rytteren                                                                     |
| Sikkerhed                       | Kun offentlige kilder; intet fra appen vises                                                                                                       |

### A7. Henvendelser og brud

| Felt                            | Indhold                                                                                                                |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Formål                          | At svare på spørgsmål og anmodninger efter art. 15–22, sikkerhedsmeldinger, og at føre log over brud (art. 33, stk. 5) |
| Hjemmel                         | Retlig forpligtelse (art. 6, stk. 1, litra c, med art. 12 og 33)                                                       |
| Kategorier af registrerede      | Dem, der skriver; dem, et brud vedrører                                                                                |
| Kategorier af personoplysninger | Navn, e-mail, hvad der blev spurgt om og svaret                                                                        |
| Modtagere                       | Mailudbyderen for martin@vintherconsulting.dk og security@haij.dk [Martin udfylder: hvilken, og hvor]                  |
| Overførsel til tredjelande      | [Afhænger af mailudbyderen]                                                                                            |
| Slettefrist                     | [Forslag: 3 år efter sagens afslutning (forældelsesloven § 3)]                                                         |
| Sikkerhed                       | Martins egen mailkonto med totrinsbekræftelse                                                                          |

[Til Martin: Hvis kadence.haij.dk's containerlogs (Docker, Coolify)
gemmer IP-adresser eller andet om personer, hører de til A2 med en
slettefrist. Koden logger ingen IP-adresser selv; Coolifys proxy kan.]
