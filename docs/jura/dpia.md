# Konsekvensanalyse (DPIA) for Kadence

> **UDKAST til Martins rådgiver — ikke gennemgået af en jurist.**
> Udkast af 11. oktober 2026, efter GDPR art. 35, stk. 7 og
> overskrifterne i Datatilsynets vejledning om konsekvensanalyse
> (datatilsynet.dk → Regler og vejledning → Behandlingssikkerhed →
> Konsekvensanalyse). Skal gennemgås igen, før S-08 åbner for
> selvoprettelse, og hver gang behandlingen ændrer sig væsentligt.

**Hvis analyse.** For personers egne arbejdsrum er Haij (Vinther
Consulting) dataansvarlig og ejer analysen. For en klubs arbejdsrum er
klubben dataansvarlig og ejer pligten (art. 35, stk. 1); Haij bistår som
databehandler (art. 28, stk. 3, litra f) og stiller denne analyse til
rådighed, så klubben kan tage den til sig og tilføje sit eget. Haijs
databeskyttelsesrådgivning: [rådgiverens navn]. Der er ingen
databeskyttelsesrådgiver (DPO) udpeget; [til rådgiveren: kræver
behandling af helbredsoplysninger om mindreårige "i stort omfang" en
DPO efter art. 37, stk. 1, litra c, når mange klubber er på?].

## 1. Er en konsekvensanalyse påkrævet?

**Ja.** Begrundelsen:

Datatilsynets liste over behandlinger, der altid kræver en
konsekvensanalyse (offentliggjort efter art. 35, stk. 4), rammer Kadence
på tre punkter, hver for sig nok:

- **Punkt 3: lokationsdata sammen med mindst ét af kriterierne i WP248
  rev. 01.** Hver tur med GPS bærer et spor af, hvor en rytter har været,
  og ofte hvor rytteren bor. Kriterierne "følsomme oplysninger"
  (helbredsoplysninger) og "sårbare registrerede" (børn) er opfyldt.
- **Punkt 4: ny teknologi sammen med mindst ét kriterium.** En sprogmodel
  læser på holdets valg rytteres opmærksomhedspunkter om søvn, smerte og
  sygdom.
- **Punkt 7: sårbare personer eller følsomme oplysninger, hvor der bruges
  profilering.** Kadence vurderer automatisk aspekter af en rytters
  helbred og trivsel — belastning, form, en check-ins "røde zone",
  opmærksomhedspunkter — og viser træneren, hvem der "har brug for en
  snak". Det er profilering i art. 4, nr. 4's forstand, også selv om
  ingen afgørelse træffes automatisk.

Artikel 29-gruppens retningslinjer (WP248 rev. 01, godkendt af EDPB) siger,
at to eller flere af ni kriterier som regel kræver en analyse. Kadence
opfylder fem: evaluering eller scoring (1), følsomme oplysninger (4),
sammenstilling af datasæt — ture fra enheder, check-ins og DCU's
resultater (6), sårbare registrerede (7) og innovativ teknologi (8).
"Stort omfang" (5) er ikke opfyldt i pilotvinteren (ét hold), men kan blive
det, når mange klubber er på; det ændrer ikke svaret.

## 2. Systematisk beskrivelse af behandlingen

### 2.1 Formål

At lade trænere planlægge og følge unge landevejsrytteres træning, rytterne
føre deres ture og en daglig check-in, og forældre følge med i det, rytteren
deler, med Cykling Danmarks anbefalinger for rytterens klasse som
udgangspunkt (README.md). Formålet er rytterens udvikling og trivsel;
opmærksomhedspunkterne skal give træneren anledning til en samtale, ikke
afgøre noget.

### 2.2 Karakter, omfang og sammenhæng

- **Registrerede:** ryttere, overvejende 15–22 år, nogle 13–14, snart også
  voksne og børn alene (plan §2.3); deres forældre; trænere.
- **Oplysninger:** som Bilag A.3 til databehandleraftalen: konto,
  træning, ture med GPS, puls og watt, daglige check-ins (søvn, energi,
  humør, ømhed, stress, smerte efter ATK's smertetrappe, sygdom, note),
  målinger, forældrelinks, revisionsspor med login-IP.
- **Omfang:** pilotvinteren 2026–27 ét hold, omkring 20–40 ryttere med
  forældre og trænere [Martin retter tallet]; derefter flere klubber på
  kadence.haij.dk og personer alene. Planen regner med, at Haij kan komme
  til at holde "tusind rytteres filer" (plan §4).
- **Sammenhæng:** trænere er ofte frivillige; rytterne er ofte
  mindreårige og står i et afhængighedsforhold til træneren (udtagelse,
  holdplads). Det er derfor, at rytteren bestemmer, hvad forældrene ser,
  og at der ingen private beskeder er mellem en voksen og en ung rytter
  (README.md, "Parents").

### 2.3 Hvordan oplysningerne flyder

1. Træneren opretter rytteren og forældrene og inviterer dem med et link,
   træneren selv giver videre (ADR 0010, 0064).
2. Rytteren logger ind, bekræfter sine forældre, fører sin check-in og
   uploader ture eller forbinder Wahoo, Garmin eller Polar (ADR 0018, 0020).
3. Kadence regner belastning, form, zoner og opmærksomhedspunkter i
   databasen og i ren logik uden netværk (`src/modules/load`).
4. Træneren ser holdets uge og opmærksomhedslisten; forælderen ser sit
   barns side (ADR 0011, 0063).
5. Beder en træner om et AI-forslag, går en prompt til Mistrals
   EU-endepunkt eller til Ollama på serveren (ADR 0008, 0017).
6. Påmindelser går som tomme web push-beskeder (ADR 0060).
7. Alt ligger i én Postgres på én server hos Hetzner i Tyskland; hver nat
   en krypteret dump til EU-lager, 30 dage.

### 2.4 Aktiver

Webapplikationen (Next.js), Postgres 16 med row level security, Better
Auth 1.7.14, Docker Compose på en VPS hos Hetzner, Coolify som
drifts-panel, backup-scriptet med `age` og `rclone`.

## 3. Nødvendighed og proportionalitet

| Spørgsmål                                       | Svar                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hjemmel (art. 6 og 9)                           | Klubber: klubbens, typisk udtrykkeligt samtykke for helbredsoplysninger (databehandleraftalen punkt 3.3). Alene: aftale for kontoen (art. 6, stk. 1, litra b) og udtrykkeligt samtykke for check-ins og målinger (art. 9, stk. 2, litra a), som kan trækkes tilbage under Indstillinger → Data [planlagt med S-08]. Sikkerhedslog: legitim interesse (art. 6, stk. 1, litra f). |
| Formålsbegrænsning (art. 5, stk. 1, litra b)    | Oplysningerne bruges kun i Kadence til træning og trivsel. Ingen reklame, intet salg, ingen statistik ud af huset. Installationens ejer ser kun tal pr. klub, aldrig et navn eller en check-in (ADR 0048, `platform_overview()`).                                                                                                                                               |
| Dataminimering (art. 5, stk. 1, litra c)        | Fødselsår, ikke fødselsdato (ADR 0011). Ingen vægt for ryttere under 19, medmindre holdet slår det til (`measurements.ts`). Wahoos og Polars profiler kasseres ulæst (`docs/subprocessors.md`). AI'en får fornavn og opmærksomhedspunkter, ikke check-ins som tekst (`coach-brief.ts`). Påmindelser bærer intet indhold.                                                        |
| Rigtighed (art. 5, stk. 1, litra d)             | Rytteren og træneren retter selv; check-ins ændres på dagen.                                                                                                                                                                                                                                                                                                                    |
| Opbevaring (art. 5, stk. 1, litra e)            | Arbejdsrum til de slettes, backups 30 dage, slettede pas 7 dage, demoen 24 timer. Svagheder: konti og adgangsansøgninger har ingen slettefrist, revisionssporet har ingen endnu (24 måneder planlagt, S-11). Se fortegnelse.md.                                                                                                                                                 |
| Oplysning (art. 12–14)                          | `/terms` i dag; delt i vilkår og privatlivspolitik (vilkaar-og-privatliv-forslag.md) før S-08. Klubben oplyser sine ryttere og forældre.                                                                                                                                                                                                                                        |
| Rettigheder (art. 15–21)                        | Eksport med ét klik (xlsx og JSON); sletning af en rytter med revisionssporets kopier (`erase_rider`); sletning af arbejdsrummet med det samme. Mangler: en persons egen sletning af sin konto.                                                                                                                                                                                 |
| Databehandlere og overførsler (art. 28, kap. V) | Hetzner og Mistral, begge EU (Bilag B). Ingen overførsel til tredjelande fra Haij. Enhedsudbyderne er rytterens eget valg; push-tjenesterne får en tom besked (databehandleraftalen punkt 8).                                                                                                                                                                                   |
| Kunne formålet nås med mindre?                  | Check-in er frivillig og kan være kort; træning kan følges uden check-in og uden enheder (filer, manuel afkrydsning). Uden sprogmodel virker alt andet. Det er rimeligt proportionalt.                                                                                                                                                                                          |

## 4. Risici for de registreredes rettigheder og frihedsrettigheder

Sandsynlighed (S) og konsekvens (K) som lav, middel eller høj, **før**
foranstaltningerne i afsnit 5.

| ID  | Risiko                                                                                                                                                  | S      | K      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| R1  | En træner læser en mindreårigs helbredsoplysninger og bruger dem forkert (presser, udtager, deler dem), eller en anden end holdets træner læser dem.    | Middel | Høj    |
| R2  | En forælder ser det, rytteren ikke har delt (check-ins, træning), eller en anden rytters data.                                                          | Middel | Middel |
| R3  | Et invitationslink lækker, og en fremmed bliver rytteren eller forælderen.                                                                              | Middel | Høj    |
| R4  | En træner bruger et link til ny adgangskode til at overtage et medlems konto.                                                                           | Lav    | Høj    |
| R5  | AI'en læser check-ins (hvor holdet har sagt ja): oplysninger hos Mistral, et svar der diagnosticerer eller kommenterer vægt, eller en prompt-injektion. | Middel | Middel |
| R6  | Enhedsudbydere i USA: rytterens ture og, ved "send", FTP og tærskelpuls hos en amerikansk virksomhed.                                                   | Høj    | Middel |
| R7  | GPS-spor viser, hvor en mindreårig bor og træner, og hvornår.                                                                                           | Middel | Høj    |
| R8  | Brud på serveren eller databasen: alt for alle hold på én gang.                                                                                         | Lav    | Høj    |
| R9  | Trænere ser medlemmers login-IP og browser i revisionssporet og eksporten.                                                                              | Høj    | Lav    |
| R10 | Revisionssporet bevarer helbredsoplysninger efter, at de er rettet eller slettet i grænsefladen.                                                        | Høj    | Middel |
| R11 | Push-tjenesterne (USA) lærer en rytters rytme af aftener.                                                                                               | Middel | Lav    |
| R12 | Den åbne side om danske hold viser navn, fødselsår, hold og point for U19-ryttere, nogle 17 år.                                                         | Høj    | Lav    |
| R13 | En træner skriver om en navngiven rytters helbred i Trænerrummet, som trænere fra andre klubber læser.                                                  | Lav    | Middel |
| R14 | Et barn under 15 opretter sig alene med et forkert fødselsår (fra S-08).                                                                                | Middel | Middel |
| R15 | Driftens adgang: den, der driver serveren, kan læse alt.                                                                                                | Lav    | Høj    |

## 5. Foranstaltninger

| ID  | Foranstaltninger (kilde)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Kun ejere og administratorer af holdet er trænere; adskillelse mellem hold og mellem ryttere i databasen med tvunget RLS (ADR 0002, 0011), bevist af `tests/rls/product-isolation.test.ts` og `tests/rls/rider-isolation.test.ts`; meta-testen i `tests/rls/tenant-isolation.test.ts` fejler på en tabel uden tvunget RLS. Ingen private beskeder mellem voksne og ryttere. Påmindelsen om en rytter i den røde zone nævner intet navn (ADR 0060). Opmærksomhedspunkter er "shown, never enforced". Revisionssporet viser, hvem der ændrede hvad. Klubben indhenter samtykke og oplyser. Fjernes en træner fra holdet, mister vedkommende adgang med det samme. |
| R2  | En forælder ser intet, før rytteren har bekræftet linket; profil altid, træning medmindre rytteren siger nej, check-ins kun ved ja; fra året rytteren fylder 18 kun efter ny bekræftelse (`app_is_guardian_of`, drizzle/0003). En trigger gør bekræftelsen rytterens alene. Forældre læser ingen andres adresser (ADR 0070, `tests/rls/member-addresses.test.ts`). Bevist i `tests/rls/rider-isolation.test.ts`.                                                                                                                                                                                                                                                |
| R3  | Linket er bundet til én adresse, kan bruges én gang og udløber efter 7 dage (ADR 0064); invitationernes id'er gives kun til trænere (`src/core/auth/coach-only.ts`, `tests/team/invitation-leak.test.ts`); siden siger, hvem linket er til (ADR 0065); en forælder ser intet uden rytterens bekræftelse; træneren ser, hvem der er kommet ind. Svaghed: adressen bekræftes ikke, før mail kommer (S-07).                                                                                                                                                                                                                                                        |
| R4  | Aldrig for en ejer eller for sig selv; personen logges ud alle steder; linket står på personens sikkerhedsside med, hvem der lavede det; revisionssporet navngiver træneren; totrinsbekræftelse stopper det helt; højst 10 links i timen pr. træner (ADR 0032, `tests/team/reset-link.test.ts`).                                                                                                                                                                                                                                                                                                                                                                |
| R5  | Holdets valg, standard nej (`ai_on_rider_data`); kun fornavn og opmærksomhedspunkter; Mistrals EU-endepunkt eller Ollama på serveren; alt en person skrev lægges i prompten som data; svaret renses og afkortes (`src/modules/ai/sanitize-helpers.ts`, `tests/ai/assists.test.ts`); prompten forbyder diagnoser og kommentarer om vægt, krop og mad (`coach-brief.ts`); AI'en skriver, sender og sletter intet (dogme fem); et loft over kald pr. hold pr. dag (ADR 0009).                                                                                                                                                                                      |
| R6  | Kun rytteren kan forbinde, databasen afviser en træner (ADR 0018); afbryd når som helst; tokens forseglet; Wahoos profil kasseres; intet sendes i baggrunden; aldrig check-ins eller målinger (`docs/subprocessors.md`). Uden nøglerne tilbydes ingen af dem. FIT-upload virker uden.                                                                                                                                                                                                                                                                                                                                                                           |
| R7  | Kortet serveres af Kadence selv, så ingen position når en korttjeneste (ADR 0023); sporet ses kun af rytteren, trænerne og bekræftede forældre med træning; ingen offentlige links til ture. [Forslag: et privatlivsfelt, der skjuler de første og sidste ca. 500 m af et spor for andre end rytteren, før personer alene kommer på.]                                                                                                                                                                                                                                                                                                                           |
| R8  | Krypterede backups med privat nøgle offline; passkeys og TOTP; ingen hemmeligheder i koden, gitleaks i CI; `pnpm audit --prod` i CI; sikkerhedsoverskrifter (`tests/meta/security-headers.test.ts`); begrænsning af loginforsøg; meldevej til security@haij.dk. Svagheder: databasen er ikke krypteret på applikationsniveau; ingen overvågning endnu (S-05).                                                                                                                                                                                                                                                                                                   |
| R9  | Ingen i dag. [Forslag til S-04 eller S-05: fjern `ip_address` og `user_agent` fra de rækker, trænere kan læse, eller skriv login-hændelser uden `org_id`, så kun driften ser dem.]                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| R10 | Kun trænere læser sporet (drizzle/0003 `app_select_audit`); filer, målepunkter og hemmeligheder tages ud (`audit_redact`); `erase_rider` sletter sporets kopier om rytteren; sporet slettes med arbejdsrummet. Planlagt: 24 måneder for rækker om ryttere (S-11).                                                                                                                                                                                                                                                                                                                                                                                               |
| R11 | Opt-in pr. person og pr. browser; beskeden er tom; adressen logges aldrig og slettes ved afmelding (ADR 0060).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| R12 | Kun hvad DCU og UCI selv offentliggør; en rytter vises kun, når en liste sætter rytteren på et hold; ingen resultater inde i appen (ADR 0072). [Mangler: oplysning efter art. 14 på siden og en vej til indsigelse (art. 21).]                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| R13 | Kun trænere læser rummet; en linje under feltet beder om at holde rytternes navne ude; enhver træner kan melde et opslag; ejeren skjuler (ADR 0052). Ingen AI i rummet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| R14 | Fødselsåret giver klassen, og under 15 kan man ikke selv oprette (plan §2.3, med 15 i stedet for 13). [Til rådgiveren: art. 8, stk. 2 kræver "rimelige bestræbelser" på at kontrollere forældrenes samtykke. Er en forælders egen konto, hvor forælderen inviterer barnet, nok?]                                                                                                                                                                                                                                                                                                                                                                                |
| R15 | Én person med driftsadgang; ingen "log ind som" (ADR 0048); ejerens overblik viser kun tal (`platform_overview()`); tavshedspligt i databehandleraftalen punkt 5.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## 6. Restrisiko

Efter foranstaltningerne:

| ID  | Restrisiko | Hvorfor                                                                                                             |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| R1  | Middel     | At træneren ser alt, er formålet. Misbrug kan ikke forhindres teknisk, kun ses; det hviler på klubbens ansvar.      |
| R2  | Lav        | Adskillelsen er i databasen og testet.                                                                              |
| R3  | Middel     | Indtil mail bekræfter adressen (S-07, S-08). Med mail: lav.                                                         |
| R4  | Lav        | Synligt for personen og i sporet; TOTP fjerner det.                                                                 |
| R5  | Lav        | Med Mistral: oplysninger hos Mistral i op til 30 dage efter Mistrals vilkår [tjek niveau og "zero data retention"]. |
| R6  | Middel     | Uden for Kadences kontrol, men rytterens eget valg; Kadences del er lav.                                            |
| R7  | Middel     | Lav, når privatlivsfeltet er bygget.                                                                                |
| R8  | Middel     | Konsekvensen er høj; sandsynligheden er lav, men én server samler alt.                                              |
| R9  | Middel     | Lav, når forslaget er bygget.                                                                                       |
| R10 | Lav        | Med 24 måneders frist.                                                                                              |
| R11 | Lav        |                                                                                                                     |
| R12 | Lav        | Når siden oplyser og har en vej til indsigelse.                                                                     |
| R13 | Lav        |                                                                                                                     |
| R14 | Middel     | En alder kan ikke efterprøves uden at indsamle mere; det er accepteret i branchen [rådgiveren vurderer].            |
| R15 | Lav        |                                                                                                                     |

Ingen risiko står som høj efter foranstaltningerne.

## 7. Konklusion

1. **En konsekvensanalyse er påkrævet** (afsnit 1), både for klubbernes
   arbejdsrum (klubben som dataansvarlig, med Haijs bistand) og for
   personer alene (Haij).
2. **Forudgående høring af Datatilsynet (art. 36) er efter dette udkast
   ikke nødvendig**, fordi ingen restrisiko er høj, **forudsat** at
   følgende er på plads, før de nævnte døre åbnes:
   - før den første rytters data: databehandleraftalen underskrevet med
     pilotklubben, og klubbens samtykke fra ryttere (15+) og forældre
     (under 15);
   - før S-08 (selvoprettelse): privatlivspolitikken (vilkaar-og-privatliv-forslag.md),
     samtykket til helbredsoplysninger med tilbagetrækning under
     Indstillinger → Data, aldersgrænsen 15, og bekræftet e-mailadresse
     (S-07);
   - snarest, og før flere klubber kommer på: R9 (IP i revisionssporet),
     en slettefrist for konti og adgangsansøgninger, oplysning og
     indsigelse på holdsiden (R12), og en række for backup-lageret i
     `docs/subprocessors.md`.
3. [Til rådgiveren: Holder konklusionen, hvis R1 vurderes som høj, fordi
   trænere er frivillige og rytterne børn? I så fald: er klubbens
   samtykke og ADR 0011's adskillelse nok til at sænke den, eller skal
   Datatilsynet høres?]

## 8. Opfølgning

Analysen gennemgås, når: S-08 åbner for selvoprettelse; en ny
underdatabehandler kommer på; AI'en får adgang til mere end
opmærksomhedspunkter; antallet af ryttere passerer 500; og ellers én gang
om året, første gang september 2027 efter pilotvinteren.
