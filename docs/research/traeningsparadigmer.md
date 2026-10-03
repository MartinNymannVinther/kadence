# Træningsparadigmer: alternativer til DCU's model for U17, U19 og U23

Researchnotat, oktober 2026 (kilderne er hentet og læst 3. oktober 2026).

**Spørgsmålet.** Produktejeren spørger: "Undersøg om der findes andet og måske (mere opdateret) træningsparadigme end DCU's, som en træner vil kunne vælge som alternativ."

**Baseline.** Notatet bygger videre på tre eksisterende noter, som ikke gentages her:

- `docs/research/dcu-traeningsanbefalinger.md` (de seks DCU-PDF'er);
- `docs/research/traenermateriale.md` (danske trænerkilder, UCI-regler);
- `docs/research/foraeldre-og-talentudvikling.md` (ATK 2.0, Talenthuset).

Det bygger også på data i `src/modules/dcu`, som allerede har årshjulets intensitetsandele.

**Metode.**

- **Kilderne.** Forbundsdokumenter er hentet som PDF eller HTML og læst i fuld tekst. Videnskabelige artikler er tjekket i PubMed/Europe PMC (abstract) og, hvor det er markeret, i fuld tekst.
- **Mærkerne i teksten:**
  - **[læst]**: hentet og læst i fuld tekst. Sidetal er PDF-sider, medmindre andet står.
  - **[abstract]**: kun abstractet er læst, og tallene stammer derfra.
  - **[web]**: websiden er læst gennem et værktøj, der opsummerer. En person bør se siden igen, før et tal kommer i kode.
  - **[sekundær]**: oplysningen kommer kun fra en anden kilde end originalen.
  - **[søgning]**: kun set i et søgeresultat. Ikke verificeret, og må ikke bruges i kode.
  - **(beregnet)**: tallet står ikke i kilden, men er vores egen regning.
- **Kopierne.** De hentede filer ligger kun lokalt og er ikke lagt i repositoriet. Flere af kilderne forbeholder sig alle rettigheder (se afsnit 7).

---

## 0. Kort svar

1. **DCU's model er ikke forældet, men den er tynd på to punkter.** Det ene er intensitetsfordelingen, det andet er kvinder.
   - Strukturen er klassisk, traditionel periodisering: mængde først, så intensitet, og fra lange til korte intervaller. Den svarer til, hvad norske verdensklassetrænere gør i dag (Sandbakk m.fl. 2025).
   - **Intensiteten** angiver DCU kun som "intervaltid" på 10-20 %, og tempo tælles med.
   - **Kvinder** har ingen timetal.
   - DCU citerer intet paradigme eller nogen forskning. Der findes ikke nyere DCU-materiale end 2025-tabellen, som blev lagt op i oktober 2024.
2. **Fire forbund har konkrete timetal for 15-22-årige.** Det er det tyske BDR (2009), Cycling Canada (2008), det hollandske KNWU (2019) og det svenske SCF (2025).
   - KNWU og dele af SCF genbruger Canadas tal.
   - Kun BDR angiver tal pr. alder og køn, ligesom DCU angiver dem pr. årgang.
   - SCF er det nyeste og det eneste med en intensitetsfordeling.
   - Norge (NCF/Olympiatoppen) har ingen timetabel for 15-22 år. Til gengæld har NCF et konkret intensitets- og periodiseringsoplæg (2014): polariseret fordeling, blokke, én hård økt om ugen også om efteråret og tung styrke først fra 18 år.
3. **Evidensen handler om intensitetsfordeling, ikke om timer.**
   - Polariseret og pyramidal fordeling giver omtrent samme effekt (netværksmetaanalyse 2025; metaanalyse 2024).
   - Meget træning omkring tærsklen ser ud til at være dårligst. Det gælder også i det eneste studie af juniorcykelryttere i den rigtige alder (Guellich & Seiler 2010).
   - Juniorer og U23-ryttere træner i praksis allerede meget i midterzonen (Gallo 2022; Leo 2020). Løbene leverer en stor del af den hårde tid.
   - Blokperiodisering har kun små studier af lav kvalitet bag sig og ingen ekstra effekt i to forsøg med juniorer.
   - Rækkefølgen af intervaltyper (DCU's "lang før kort") betyder næppe noget (Sylta 2016).
4. **Anbefaling** (afsnit 8):
   - Tilbyd **én intensitetsprofil**, "lav intensitet først" (polariseret/pyramidal), som et lag oven på enhver timemodel.
   - Tilbyd **to alternative timemodeller:**
     - **BDR 2009**, pr. alder og med kvindetal;
     - **SCF 2025**, faser med brede korridorer efter modenhed og erfaring.
   - Resten skal kun linkes. Det gælder Canada, KNWU, Sport for Life, Olympiatoppen, British Cycling, USA Cycling, AusCycling, UCI, IOC og NSCA, Friel/TrainingPeaks og "den norske model".

---

## 1. Udgangspunktet: hvad DCU's model egentlig er

Læst samlet består DCU's model af fire lag, og Kadence har allerede alle fire som data i `src/modules/dcu`:

| Lag              | Indhold                                                                                                                                                            | Kilde                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Mængde           | Timer pr. måned pr. årgang, U17 1 til U23 4. Oktober er "pause + frit".                                                                                            | `Landevej_traeningsanbefalinger_2025.pdf`                            |
| Faser            | Pause → distance → lange basisintervaller → korte formtopintervaller → sæson                                                                                       | Kompendierne 2016                                                    |
| Intensitetsandel | Se listen under tabellen                                                                                                                                           | "Årshjul for træning på landevej", cyklingdanmark.dk [læst, rå HTML] |
| Styrke           | 2-3 pas/uge fra november til medio marts, derefter 1 pas/uge. Mindst 30 pas pr. vinter (U17/U19). Mindst 48 t mellem pas. Tung belastning (6-8 RM) allerede i U17. | Styrkeprogrammerne 2015                                              |

Årshjulets intensitetsandele, måned for måned:

- **November:** "Der er ikke grund til at gennemføre perioder med høj intensitet (intervalkørsel)".
- **December:** "omkring 10 % af den samlede træningsmængde".
- **Januar:** "minimum 10 %", og "ikke overstiger ca. 85 % af den maksimale pulsfrekvens".
- **Februar:** "omkring 15-20 % (her medregnes alle planlagte perioder med intensiteter spændende fra 'at holde kæden stram' til maksimal kredsløbsbelastning)". Den helt intensive træning lægges "6-8 uger" før formtoppen.
- **Sæsonen:** "omkring 80 % af træningsmængden i perioden op til sæsonstart (i særlige tilfælde måske 80-120 %)". Der kan typisk nås to formtoppe pr. sæson.

**DCU's model i forskningens sprog.** DCU navngiver ikke et paradigme. Hverken siden, de seks PDF'er, `intervaltraening.pdf` eller "Vejen frem 2025-2028" citerer forskning [læst]. Strukturen er dog let at genkende:

- **Traditionel (lineær) periodisering.** Mængden bygges op først, intensiteten kommer bagefter, og den hårde træning placeres i forhold til formtoppen.
- **Fra lange til korte intervaller** ("relativt lang basisintervaltræning" → "korte, hårde intervaller"). Det svarer til den rækkefølge, Sylta m.fl. (2016) kaldte "increasing HIT" (afsnit 4.4).
- **En pyramidal eller tærskelpræget intensitet, ikke polariseret.** DCU's 10-20 % tæller tempo, "medium" og AT med. AT-zonen ligger på 84-92 % af pulsreserven (`intervaltraening.pdf`), altså omkring tærsklen. Et polariseret program ville flytte det meste af den tid enten ned under første tærskel eller op over anden.

**Findes der nyere DCU-materiale?** Nej, så vidt jeg kan se:

- Siden "Træningsanbefalinger" linker stadig til `Landevej_traeningsanbefalinger_2025.pdf`. Serverens Last-Modified er 7. oktober 2024.
- Filnavnene `..._2026.pdf` og `..._2027.pdf` giver 404.
- Den forrige udgave, `DCU_traeningsanbefalinger_2024.xls__-__Kompatibilitetstilstand.pdf` (Last-Modified 5. februar 2024), ligger der stadig [læst]. Den er næsten identisk med 2016-tallene: i alt 423 t for U17 1 og 884 t for U23 4.
- "Vejen frem 2025-2028" nævner "Træningsanbefalinger mængde/intensitet" og "Adgang til rytternes TrainingPeaks" som ydelser til bruttotrupperne, men ikke nogen ny model [læst].
- Siden "Om unge og træning" (`/leadout/om-unge-og-traening/`) svarede med en serverfejl (TYPO3-undtagelse) og kunne ikke læses.

**Et lille fund om Kadence's egne noter.** Forældrenotatet nævner "cirka 15-20 % af træningen som intensitet", mens `dcu-traeningsanbefalinger.md` skriver, at en intensitetsfordeling "findes ikke". Begge har ret om hver sin kilde: PDF'erne har ingen fordeling, men årshjulet på websiden har. `src/modules/dcu/intensity.ts` bruger allerede årshjulet. Linjen i `dcu-traeningsanbefalinger.md` bør rettes, så den ikke vildleder.

---

## 2. Kandidaterne i overblik

| #   | Paradigme                                                    | Ejer / forfatter                      | År                     | Type                                        | Konkret nok til at styre en sæsonplan?                      |
| --- | ------------------------------------------------------------ | ------------------------------------- | ---------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| A   | Nachwuchsprogramm (NWP), "Stufenprogramm"                    | Bund Deutscher Radfahrer (BDR)        | 2009                   | Timer, km og pas pr. alder og køn           | **Ja.** Kun årstimer, ingen månedsprofil                    |
| B   | "Den blågula cykelvägen"                                     | Svenska Cykelförbundet (SCF)          | 2025 (websider)        | Faser med timespænd og intensitetsfordeling | **Delvist.** Brede korridorer pr. fase, ikke pr. årgang     |
| C   | Cycling Canada LTAD, bind 1                                  | Cycling Canada (efter Balyi)          | 2008 (filen 2014)      | Faser med timespænd, pas og løb             | Delvist. Alle rettigheder forbeholdt                        |
| D   | Talentvisie 2030, "Talentontwikkeling doe je samen"          | KNWU (Marco van Bon)                  | 2019                   | Faser efter vækstspurt, timespænd           | Delvist. Bygger på Canada. Alle rettigheder forbeholdt      |
| E   | Utholdenhetstrening 2.6 og Utviklingstrapp                   | Norges Cykleforbund (Rønnestad m.fl.) | 2014 og 2020           | Intensitet, periodisering, styrke           | Intensitet: ja. Timer for 15-22 år: nej                     |
| F   | "Utvikling av unge utøvere" og I-skalaen                     | Olympiatoppen                         | 2015 og 2024           | Generelle principper, zoneskala             | Nej. Fx "omkring 50 timer" mere pr. år                      |
| G   | Polariseret / pyramidal / tærskel                            | Seiler m.fl., forskningslitteraturen  | 2006-2025              | Intensitetsfordeling                        | **Ja, som lag**: andel i 3 zoner pr. fase                   |
| H   | Blokperiodisering                                            | Issurin; Rønnestad m.fl.              | 2010-2026              | Organisering af hårde uger                  | Som værktøj (Kadence har blokke, ADR 0025), ikke som model  |
| I   | Sport for Life LTD 3.0 (Balyi)                               | Sport for Life Society                | 2019                   | Generel LTAD                                | Nej. Træning/konkurrence-forhold og pas pr. uge             |
| J   | IOC-konsensus om unge (+ REDs, YPD, NSCA)                    | IOC; Lloyd & Oliver; NSCA             | 2015, 2023, 2012, 2016 | Principper og sundhed                       | Nej. Tekst og rækværk                                       |
| K   | British Cycling, USA Cycling, AusCycling, Swiss Cycling, UCI | Forbundene                            | Forskellige            | Talentveje                                  | Nej. Ingen timetal fundet                                   |
| L   | Friel, "The Cyclist's Training Bible"                        | Joe Friel / VeloPress (TrainingPeaks) | 2018 (5. udg.)         | Kommerciel periodisering                    | Ophavsretligt beskyttet. Ikke til ungdom                    |
| M   | "Den norske model" (dobbelt tærskel)                         | Bakken; Casado m.fl.                  | 2023                   | Tærskelbaseret                              | Nej. Ingen kontrollerede studier, ikke i unge eller cykling |

---

## 3. Forbundsmodeller med tal

### 3.1 A. BDR Nachwuchsprogramm 2009 (Tyskland) [læst]

Overblik:

- **Dokument:** "Nachwuchsprogramm des BDR", "Überarbeitete Fassung 2009" ("Das vorliegende Material beinhaltet den Stand von 2009").
- **URL:** https://static.rad-net.de/html/disziplinen/radsportjugend/nachwuchsprogramm-des-bdr_13.pdf
- **Indhold:** et trinprogram fra 9 år til U23 med "Belastungskennziffern" pr. aldersklasse (AK), samme princip som DCU's årgange.
- **Nyere udgave:** ikke fundet.

**Mænd, udholdenhed (landevej/bane), s. 14.** Kolonnerne er pas pr. uge, timer i alt ("T-Umfang"), heraf generelle ("allg.") og specifikke ("spez.") timer, km i alt og løbs-km. Specifikke midler er "Radtraining" (s. 10), så "spez." svarer nogenlunde til DCU's "timer på cykel". De generelle timer er løb, ski, svømning, kredstræning og lignende.

| AK  | DCU-årgang | Pas/uge | Timer i alt | allg. | **spez.** | km i alt | Løbs-km | DCU nov-sep |
| --- | ---------- | ------- | ----------: | ----: | --------: | -------: | ------: | ----------: |
| 15  | U17 1      | 4-5     |         470 |   100 |   **370** |   11.000 |   1.600 |         429 |
| 16  | U17 2      | 4-6     |         560 |    90 |   **470** |   14.000 |   2.000 |         490 |
| 17  | U19 1      | 5-7     |         660 |    80 |   **580** |   17.000 |   3.000 |         554 |
| 18  | U19 2      | 6-8     |         770 |    70 |   **700** |   21.000 |   4.200 |         622 |
| 19  | U23 1      | 7-9     |         860 |    60 |   **800** |   24.000 |   6.500 |         694 |
| 20  | U23 2      | 7-9     |         960 |    60 |   **900** |   27.000 |   8.000 |         752 |

Til tabellen:

- Bane, AK 18/19/20: 670/730/830 timer i alt.
- BDR stopper ved AK 20, så U23 3 og U23 4 har ingen tal.
- Kolonnen "DCU-årgang" er vores sidestilling, og DCU-tallene står i 2025-tabellen. Begge dele er tilføjet af os, ikke af BDR.

**Kvinder, udholdenhed, s. 14** (pas pr. uge som mænd):

| AK  | Timer i alt | allg. | **spez.** | km i alt | Løbs-km |
| --- | ----------: | ----: | --------: | -------: | ------: |
| 15  |         440 |    90 |   **350** |   10.500 |   1.200 |
| 16  |         500 |    80 |   **420** |   13.000 |   1.500 |
| 17  |         570 |    70 |   **500** |   15.000 |   2.500 |
| 18  |         630 |    60 |   **570** |   17.000 |   2.800 |
| 19  |         660 |    60 |   **600** |   18.000 |   3.000 |
| 20  |         730 |    60 |   **670** |   20.000 |   3.500 |

**Principper med tal:**

- **Stigningstakt.** "In der Regel betragen die Steigerungsraten 15 - 20 % von Jahr zu Jahr" (s. 12). Tabellen selv stiger 19, 18, 17, 12 og 12 % fra år til år (beregnet). Til sammenligning siger DCU "10-15 %" for U19 (kompendiet), og 2025-tabellen stiger 6-14 % (beregnet).
- **Belastningsrytme.** "AK 13 - 15 … Belastungsform 2:1", altså to dage med belastning og én hviledag. For "16 - 18" gælder "3:1" (s. 16).
- **Lange pas i træk.** Højst 2 lange pas på dage i træk for AK 15-16 og højst 3 for AK 17-18 (s. 41).
- **Grundtræning (GA)** ligger ved "60-75 % der max. HF" og laktat op til ca. 2 mmol (s. 41). Turlængden for GA-pas er 50-120 km for 14-15-årige drenge, 60-150 km for 16-årige og 70-180 km for 17-18-årige. For piger er tallene 40-90, 40-120 og 50-150 km (s. 42).
- **Udviklingszonen (EB)** ligger ved 70-90 % af maxpuls og 2-6 mmol (s. 42). Løbsspecifik træning bruges kun "ab der Jugend AK 14/15 … mit geringem Umfang" (s. 44).
- **Styrke** trænes året rundt og går fra generel til specifik (s. 45). For MTB i Aufbautraining gælder: 1. år uden ekstra vægt, 2. år indlæring af teknikken med vægt (s. 12).
- **Intensitetsfordeling** i procent er ikke fundet.

**Vurdering:**

- **Evidens:** erfaringsbaseret forbundsmateriale fra 2009 uden kildeliste i den læste version. Det er altså ikke "mere opdateret" end DCU.
- **Egnethed:** høj. Modellen er bygget til netop 15-20 år og til både landevej og bane.
- **Konkrethed:** den mest konkrete alternative kilde. Den har årstimer pr. alder og køn, pas pr. uge, km og en rytme- og progressionsregel.
- **Det mangler:** en månedsprofil. Kadence skulle fordele årstimerne over måneder, for eksempel med DCU's månedsprofil. Det er en Kadence-beslutning, som skal vises som sådan.
- **Det særlige:** BDR er **den eneste kilde med timetal for kvinder pr. alder.** DCU har ingen, og Canada og KNWU har kun spænd for kvinder.
- **Rettigheder:** ingen licenstekst fundet.

### 3.2 B. SCF "Den blågula cykelvägen" (Sverige) [læst, HTML]

- **Status:** Svenska Cykelförbundets officielle udviklingsmodel ("styrdokument") med syv LTAD-agtige faser.
- **Opdateret:** siderne om faserne er opdateret februar-marts 2025 (fx "Träna för att tävla": "Uppdaterad 27 februari, 2025").
- **URL:** https://utbildning.scf.se/den-blagula-cykelvagen/de-sju-faserna

**Träna för att träna** (11-15 år kvinder / 12-16 år mænd):

- "3–7 träningspass per vecka, med totalt < 12 timmars träning i alla utövade idrotter och aktiviteter".
- "40–60 % träning i andra idrotter och aktiviteter och 40–60 % cykelspecifik träning".
- Løb: "10–25 tävlingar per år och 3–6 tävlingsstarter per månad" (Canadas formulering).
- Styrke: barbell-løft indføres sidst i fasen.

**Träna för att tävla** (15-21 år kvinder / 16-23 år mænd, "4–10 år erfarenhet av organiserad cykelträning"). Det er fasen, der dækker U17 til U23:

- Volumen: "ökar progressivt under hela fasen från omkring 300–500 timmar upp till mellan 600–1000 timmar per år".
- Ugevolumen: "från omkring 6–10 timmar i snitt och < 20 timmar som mest till 12–20 timmar i snitt och omkring 30 timmar som mest".
- "4–10 träningspass per vecka". De længste pas er 3-5 timer i starten og op til 6-10 timer sidst i fasen.
- 20-40 % generel og 60-80 % grenspecifik træning.
- **Intensitet:** "För uthållighetsdiscipliner är >75 % av träningen lågintensiv eller teknikträning medan högintensiv träning och styrketräning utgör < 25% på årsbasis".
- "Den absoluta mängden högintensiv träning når under slutet av den här fasen upp till ungefär den nivå som utförs resten av elitkarriären. Framtida ökningar av träningsvolym sker främst via olika typer av lågintensiv träning".
- Konkurrencemålene samles i "< 4 perioder" om året.
- Styrke: maksimal og eksplosiv styrketræning året rundt, periodiseret og overvåget af en træner.

**Träna för att vinna** (fra 18-22 år kvinder / 19-23 år mænd):

- Volumen "stabiliserar sig troligen mellan 700 och 1100 timmar". Ugevolumen er 15-25 t i snit og op til 40 t.
- "80–95 % av träningen under året är lågintensiv och teknikträning, medan 5–20 % är högintensiv träning och styrketräning. En stor del av den högintensiva träningen kan komma från tävlingar, framförallt inom landsvägscykling."

**Vurdering:**

- **Evidens:** forbundsmateriale med en egen forskningsside. Kildelisten er ikke gennemgået.
- **Det bedste ved modellen:** den er **den nyeste** og den eneste forbundsmodel, der både har timer og en intensitetsfordeling (mindst 75 % lav). Den siger også eksplicit, at løb er en del af den hårde tid.
- **Svagheden:** faserne bestemmes af alder **og** erfaring, og spændene er brede. For en U19-rytter giver modellen 300-1000 t, alt efter hvor i fasen rytteren er. Kadence skal derfor lade træneren placere rytteren i fasen.
- **Rettigheder:** ingen licenstekst fundet.

### 3.3 C. Cycling Canada LTAD, bind 1 [læst]

- **Udgave:** forsiden siger "February 2008", ISBN 978-0-9809082-0-6, og filnavnet siger 2014.
- **URL:** https://cyclingcanada.ca/wp-content/uploads/2012/05/CC_LTAD_Vol1_EN-2014.pdf
- **Faser:** de er bestemt af modenhed (PHV) og alder.
- **Tallene** (trykte s. 20-24):

| Fase             | Alder                       | Timer/år                                     | Timer/uge | Pas/uge | Pas-længde | Løb                           |
| ---------------- | --------------------------- | -------------------------------------------- | --------- | ------- | ---------- | ----------------------------- |
| Train to Train   | 11-15 kvinder, 12-16 mænd   | 120-400 (mænd), 100-320 (kvinder)            | 6-12      | 3-7     | 2:00-3:30  | 10-25/år eller 3-6 pr. måned  |
| Learn to Compete | 15-17 kvinder, 16-18 mænd   | 300-640 (mænd), 240-500 (kvinder)            | 10-14     | 4-9     | 3:00-4:15  | 20-45/år eller 4-8 pr. måned  |
| Train to Compete | 17-21 kvinder, 18-23 mænd   | Landevej 450-700 (mænd), 400-600 (kvinder)   | 11-17     | 4-9     | 3:30-5:00  | 20-50/år eller 5-10 pr. måned |
| Learn to Win     | 18-23+ kvinder, 19-23+ mænd | Landevej 550-700 (mænd), 450-650 (kvinder)   | 15-22     | 4-9     | 5:00-6:00  | 40-60/år                      |
| Train to Win     | 23-25+                      | Landevej 600-1200 (mænd), 500-1000 (kvinder) | 16-30     | 4-9     | 5:00-7:00  | 40-120/år                     |

Øvrigt:

- Enkeltperiodisering frem til Train to Compete.
- Styrken går fra core og frie vægte til maksimal kraft.
- Sammenligning (beregnet): DCU's U23 3 og U23 4 (819 og 870 t) ligger over Canadas 700 t for Train to Compete og Learn to Win.

**Vurdering:**

- Modellen er stamfaderen til KNWU's og dele af SCF's tal. Den er godt struktureret, men fra 2008 og uden evidens ud over Balyis LTAD, som er kritiseret (afsnit 6).
- **Rettigheder:** "All rights reserved … for commercial purposes … without permission". Tabellen må ikke gengives i appen uden tilladelse. Link og kildeangivelse er fint.

### 3.4 D. KNWU Talentvisie 2030 (Holland) [læst via Wayback-kopi af ResearchGate]

- **Dokument:** Marco van Bon, "Talentontwikkeling doe je samen", KNWU Cycling Publishing, juli 2019.
- **Links:** KNWU linker fra https://www.knwu.nl/bepaal-fase, hvor en fase-beregner bruger højde, siddehøjde og vægt.
- **Faser:** bestemmes efter vækstspurt og træningsalder, ikke kalenderalder. Gennemsnitsaldre for mænd / kvinder:
  - Opbouwfase 2: 14,5-17 / 13-16 år;
  - Specialisatiefase: 17-20 / 16-19 år;
  - Prestatiefase 1: over 20 / over 19 år.
- **Timer:**
  - Opbouwfase 2: "Tot 450 trainingsuren per jaar (mannen) / 350 (vrouwen)".
  - Specialisatiefase: "500-640 (mannen) / 400-600 (vrouwen)".
  - Prestatiefase 1: "600-1200 (mannen) / 500-1000 (vrouwen)".
  - Tallene er Canadas.
- **Andre regler:**
  - Opbouwfase 2: HIIT højst hver 2.-3. uge, ingen wattmåler, og maksimal styrke begynder.
  - Specialisatiefase: anaerob træning højst én gang om ugen.
- **Rettigheder:** "Alle rechten voorbehouden. Niets uit deze uitgave mag worden verveelvoudigd…". Kun link.

### 3.5 E. Norges Cykleforbund (NCF) [læst]

**"Treningsanbefalinger for å bedre sentrale fysiologiske faktorer i sykkelprestasjon – Teori og praksis", version 2.6**

- **Forfattere:** Bent R. Rønnestad (Høgskolen i Lillehammer / Olympiatoppen) med Knutsen, Lexberg, Kristiansen og Falk (NCF). PDF'en er oprettet december 2014, 43 sider.
- **URL:** https://sykling.no/wp-content/uploads/2020/11/UTHOLDENHETSTRENING2_6.pdf

Indhold:

- **Intensitetsfordeling (s. 27):** "Det har blitt foreslått at en polariseringstilnærming, der ~75% av det totale treningsvolumet gjennomføres som LIT, 5-10% som MIT og 15-20% gjennomføres som HIT, er en optimal fordeling av treningstiden (Seiler et al. 2010)."
- **Den traditionelle uge (s. 27):** "ukentlig gjennomføre 1-2 HIT økter, 0-1 MIT økt og supplere med LIT økter".
- **Blokke (s. 27-28):** én uge med 5 HIT-økter efterfulgt af 3 uger med én HIT-økt pr. uge, gentaget 3 gange. Gruppen fik bedre resultater end en gruppe med samme mængde fordelt jævnt (Rønnestad m.fl. 2014).
- **Efterårets intensitet (s. 28):** én HIT-økt om ugen i de første 8 uger efter sæsonen holdt tærskelwatten. Gruppen med kun lav intensitet tabte. Det står i direkte modsætning til DCU's "ingen intervaller i november". Studiet (Rønnestad m.fl. 2014c) er kun læst gennem NCF's referat.
- **Styrke (s. 23):** "anbefaler vi å vente med fokus på tung styrketrening til 18-årsalderen. Dette er ikke fordi det er farlig …, men fordi vi mener fokuset først og fremst bør være på å utvikle aerobe egenskaper". DCU's U17-program har til sammenligning 6-8 RM allerede som 15-16-årig.
- **Forbehold for unge (s. 5):** "man må være varsom med å kopiere inn dette på yngre utøvere". En proff kører 80-90 løb om året, "Våre beste U23 ryttere kjører omkring halvparten".

**"Utviklingstrapp" for yngre klasser** (november 2020): https://sykling.no/app/uploads/2020/11/Utviklingstrapp-ferdig-redigert.pdf

- Den stopper ved 13-16 år og har ingen timer pr. alder.
- "De beste seniorutøverne i sykling trener mellom 700-1100 treningstimer i året" (s. 29).
- Efter puberteten anbefales 1-3 styrkeøkter om ugen.

**Eksempelplan:** NCF har også en "Forslag til treningsplan 650 timer" (regneark, oktober-september, uger på ca. 4-20 t, ingen alder angivet).

**Vurdering:**

- Det bedst underbyggede **intensitets- og periodiseringsoplæg** fra et cykelforbund, med referencer til forskningen.
- Til gengæld uden timetal for 15-22 år.
- Godt grundlag for en intensitetsprofil (afsnit 8).
- **Rettigheder:** ingen licenstekst fundet.

### 3.6 F. Olympiatoppen (Norge, alle idrætter) [læst]

**"Utvikling av unge utøvere"** (PDF oprettet 2015; gælder alle idrætter). Fundet hos Norges Klatreforbund: https://klatring.no/siteassets/dokumenter/for-deg/trener/trener-1/utvikling-av-unge-utovere---olypiatoppens-utviklingsfilosofi-og-praktiske-rad-fra-fagavdelingene-1.pdf

- **Før puberteten:** "omkring 200-400 timer med aerob utholdenhetstrening per år" og 15-25 konkurrencer.
- **Under puberteten:** "øke varigheten med omkring 50 timer per år". En tredelt intensitetsskala indføres.
- **Efter puberteten:** "minst 80 % av treningstiden" er aerob udholdenhedstræning, og varigheden "økes gradvis med omkring 50 timer per år". En femdelt skala indføres. Der er "25 til 40" konkurrencer.
- Bemærk: de 80 % er andelen af udholdenhedstræning, ikke andelen ved lav intensitet.

**Olympiatoppens intensitetsskala, version 2 (2024)**: https://olt-skala.nif.no/olt_2024_no.pdf

- Skalaen har I-1 til I-8.
- Puls i % af maxpuls: I-1 ca. 55-72 %, I-2 ca. 72-82 %, I-3 ca. 82-87 %, I-4 ca. 87-92 % og I-5 ca. 92-100 % (s. 3).
- Den er "veiledende" og skal tilpasses den enkelte.
- **Vigtigt for optælling (s. 27):** ved korte intervaller undervurderer pulsen den høje intensitet. Olympiatoppen anbefaler derfor at føre hele dragets tid i den planlagte zone, fx "registrere alle de 15 arbeidende minuttene som I-5", og ikke blot aflæse pulsuret.
- Olympiatoppen anbefaler, at hvert særforbund laver egne regler for, hvordan intensitet tælles.

**Vurdering:** gode principper og en gennemarbejdet zoneskala, men ingen cykelspecifik timetabel. Brug den som tekst og som argument for at tælle efter pasets mål (afsnit 8.3).

### 3.7 Andre forbund: ingen timetal fundet

- **British Cycling.** Websitet ligger bag Cloudflare og er læst gennem Wayback [web].
  - Artiklen "Cycling through the ages: Young Riders" siger om 12-14-årige: "at least two full days off the bike in their week". Om dem over 14: "riding their bike 5 days a week with two rest days".
  - Talentvejen er Development Centres → Regional Schools of Racing → National Schools of Racing.
  - Det ofte citerede "8-10 t/uge for Youth A, 12-14 t/uge for juniorer" kommer fra en klub (PPYCC), ikke fra British Cycling.
- **USA Cycling.** USOPC's generelle "American Development Model" (faser, ingen mængder) og en talentvej fra 2023 med lejre. Ingen timetal [web].
- **AusCycling.** "Competitive Rider Journey – Road Racing" (2022, revideret 2024) har faser, men næsten ingen tal. Det eneste er fokus på hoveddisciplinen: først 60-70 %, så "80%-20%". "© 2026 AusCycling. All rights reserved." [læst]. AIS' FTEM er en klassifikation uden træningsdoser [sekundær].
- **Swiss Cycling.** "Radsport im Kindes- und Jugendalter" (2020) bygger på FTEM og har ingen mængder [læst].
- **Cycling Vlaanderen (Belgien), Jeugdreglementering 2026** [læst]. Den har ikke et paradigme, men regler, der kan bruges som rækværk:
  - højst 45 løb om året for U13-U15 (s. 27);
  - højst 50 løb om året for U17 (s. 43);
  - højst 60 løb om året for juniorer (s. 58).
- **UCI / World Cycling Centre.** Ingen offentlige mængder for juniorer fundet.

---

## 4. Forskningen: intensitetsfordeling og periodisering

### 4.1 Definitionerne

Fordelingen beskrives i en tre-zone-model: under første tærskel (LT1/VT1), mellem tærsklerne og over anden tærskel (LT2/VT2).

| Fordeling   | Typisk form                      | Kilde                                                                                                                                                                                                                    |
| ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Polariseret | ca. 75-80 % / ≤ 5-10 % / 15-20 % | Seiler & Kjerland 2006: 75/8/17 % efter puls hos 11 **juniorskiløbere** [abstract]. Seiler 2010: "about 80% of training sessions" lav, ca. 20 % hård, **talt i pas, ikke i tid** [abstract]. NCF 2014: 75 / 5-10 / 15-20 |
| Pyramidal   | zone 1 > zone 2 > zone 3         | Stöggl & Sperlich 2015: "The majority of studies present a 'pyramidal' TID" [abstract]. Sperlich m.fl. 2023: 89 af 175 fordelinger var pyramidale, 65 polariserede, 8 tærskel [abstract]                                 |
| Tærskel     | meget tid mellem tærsklerne      | Fx Neal 2013's tærskelgruppe: 57/43/0 % [abstract]                                                                                                                                                                       |

Hvad cykelryttere faktisk gør:

- Cykelryttere og svømmere lægger mindre i zone 1 ("<72%") og mere i zone 2 (">16%") end andre udholdenhedsidrætter (Sperlich 2023) [abstract].
- Elite-U23 (Zapico 2007, gengivet hos Stöggl & Sperlich 2015) fordelte sig 78/20/2 om vinteren og 70/22/8 om foråret [sekundær].
- Tre top-5-ryttere fra Giro d'Italia trænede 14,7-19,7 t/uge med 83,6-91,3 % i zone 1. Fordelingen var "overall pyramidal" og mere polariseret i løbsuger (Gallo m.fl. 2022, SJMSS) [abstract].

### 4.2 Hvad virker bedst? Voksne og unge voksne

| Studie                                               | Design                                                                                   | Fund                                                                                                                                                                                                | Mærke      |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Rosenblat m.fl. 2025, Sports Med 55:655-673          | Netværksmetaanalyse, individdata, 13 studier, n = 348, **gennemsnitsalder 17,6-41,5 år** | "no difference in VO2max (SMD = −0.06 …) or TT performance (SMD = −0.05 …) between POL and pyramidal". Konkurrenceatleter får måske mere VO2max ud af polariseret, motionister mere ud af pyramidal | [abstract] |
| Silva Oliveira m.fl. 2024, Sports Med 54:2071-2095   | Metaanalyse, 17 studier, n = 437                                                         | Polariseret giver lidt mere VO2peak (SMD 0,24), men kun i forløb under 12 uger og hos højt trænede. Ingen forskel i tidskørsel (SMD −0,01) eller tærskelwatt (0,04)                                 | [abstract] |
| Rosenblat m.fl. 2019, JSCR 33:3491-3500              | Metaanalyse af polariseret mod tærskel, kun 4 RCT'er (3 i analysen)                      | Moderat effekt til fordel for polariseret i tidskørsel (ES −0,66), men svag evidensbase                                                                                                             | [abstract] |
| Neal m.fl. 2013, J Appl Physiol 114:461-471          | Crossover, 12 trænede cykelryttere, 6 uger                                               | Polariseret (80/0/20) gav større fremgang end tærskel (57/43/0) i peak power (8 % mod 3 %) og laktattærskel (9 % mod 2 %)                                                                           | [abstract] |
| Stöggl & Sperlich 2014, Front Physiol 5:33           | RCT, 48 voksne (31 ± 6 år), 9 uger                                                       | Polariseret gav +11,7 % VO2peak. Tærskel og stor mængde gav ingen signifikant ændring. Den polariserede gruppe lå reelt på 68/6/26                                                                  | [læst]     |
| Kenneally m.fl. 2018, IJSPP 13:1114-1121             | Systematisk review, løbere                                                               | "Pyramidal and polarized training are more effective than threshold training"                                                                                                                       | [abstract] |
| Foster m.fl. 2022 mod Burnley m.fl. 2022, MSSE 54(6) | Debat                                                                                    | Burnley m.fl. mener, at intet viser, at polariseret er optimal, og at zone 1 og 2 bør prioriteres over zone 3 (pyramidalt)                                                                          | [søgning]  |

**Konklusion for voksne.** Lav intensitet skal fylde mest. Polariseret og pyramidal fordeling er stort set ligeværdige, mens meget tærskeltræning klarer sig dårligst. "80/20" er en god tommelfingerregel, men ikke en bevist optimal fordeling.

### 4.3 Evidens i juniorer og U23 (den rigtige aldersgruppe)

**Træningsfordeling:**

- **Guellich & Seiler 2010**, IJSPP 5:316-327 [abstract]. Det mest direkte relevante studie.
  - 51 tyske juniorbanecykelryttere på 17,4 ± 0,5 år, fulgt over 15 ugers grundtræning.
  - Dem, der blev bedre (+11 % watt ved 4 mM), kørte mere under 2 mM. Dem, der blev dårligere (−7 %), kørte mere ved 3-6 mM.
  - Fordelingen forklarede ca. 60 % af variationen.
  - "Excessive training near threshold intensity … may negatively impact lactate threshold development".
  - Det er et observationsstudie og banecykling, men alderen er præcis Kadence's.
- **Gallo m.fl. 2022**, Int J Sports Med 43:1183-1189 [abstract].
  - Juniorer, U23 og professionelle, 10 af hver, i 2019-sæsonen. Pas-længden var 2,0, 2,2 og 2,6 t.
  - "JUN spent more training time at medium and high heart rate intensity zones compared to U23 and PRO".
- **Gallo m.fl. 2022**, IJSPP 17:450-457 [abstract]. Juniorløb er kortere, men "more internally demanding", med mere tid i de høje zoner.
- **Rodríguez-Marroyo m.fl. 2011**, JSCR 25:511-519 [abstract]. I endagsløb tilbragte ungdoms- og juniorryttere 40,2 % af løbstiden over den respiratoriske kompensationstærskel (zone 3). I etapeløb var det 15,2 %.
- **Leo m.fl. 2020**, Sports 8:167 [web, PMC].
  - 30 professionelle U23-ryttere på 20,0 ± 1,0 år.
  - Timer inkl. løb: forsæson 167, tidlig sæson 202, midt i sæsonen 219 og sen sæson 150. Det giver ca. 738 t/år (beregnet).
  - Løbsdage i de tre sæsonperioder: 13, 20 og 14, ca. 47 i alt (beregnet).
  - Tid efter puls i forsæsonen: under VT1 29,2 t, mellem tærsklerne 104,5 t og over VT2 15,3 t. Det er ca. 20/70/10 % (beregnet).
  - Forfatterne: fordelingen "did not follow a polarized approach", muligvis på grund af "poor intensity zone discipline" i de rolige pas.
- **Spragg, Leo & Swart 2023**, Eur J Sport Sci 23:489-498 [abstract]. 30 professionelle U23-ryttere: mere tid under VT1 hang sammen med bedre "durability", altså bedre watt efter forudgående arbejde. Korrelation, ikke årsag.
- **Kong m.fl. 2025**, Metabolites 15:17 [web]. Det eneste randomiserede forsøg med unge, jeg fandt: 24 roere på 14-16 år i 8 uger, tærskel (72/24/4) mod polariseret (78/8/14). Begge blev bedre på 2 km, **uden forskel**.

**Mængde og løb:**

- **Svendsen m.fl. 2018**, IJSPP 13:1287-1292 [abstract]. 80 ryttere, opdelt efter niveau som 23-årige. At de er norske og var 18 år i 2005-2011, står kun i et referat [sekundær].
  - De 9, der nåede WorldTour, kørte flere **løbstimer** som 18-årige end klubrytterne (91,5 mod 62,8 t) og dem, der var stoppet (61,8 t).
  - De havde også højere maksimal aerob effekt (533 mod 451 W).
  - Træningsmængde og intensitetsfordeling var ifølge et referat ikke forskellige mellem grupperne [sekundær: Cheung, PezCycling 2018].
  - Et søgeresultat påstod "600-800 t/år" for de kommende WorldTour-ryttere. Tallet findes ikke i kilden og **må ikke bruges**.
- **Leo m.fl. 2022**, J Sports Sci 40:1874-1884 [abstract]. U23-ryttere, der rykkede op i eliten, havde flere timer, km, højdemeter og pas.
- **Karlsson m.fl. 2021**, PLoS One 16:e0250088 [abstract]. Langrendsløbere fra 16 til 22 år steg lineært fra ca. 470 til 730 t, ca. 55 t pr. år, og næsten alt var lav intensitet. Et cykelstudie af samme slags fandt jeg ikke.
- **Staff m.fl. 2023**, Sports Med 53:1595-1607 [abstract].
  - Talentudviklingens mængder stiger ikke-lineært fra år til år og flader så ud.
  - Praksis er "built upon limited scientific evidence".
  - En casestudie af en senere Grand Tour-rytter (Pinot & Grappe 2015) fandt 79 % flere timer fra 18 til 23 år [abstract].
- **Jayanthi m.fl. 2015**, Am J Sports Med 43:794-801 [abstract]. Blandede idrætter, 7-18 år, ikke cykling. Flere ugentlige timer organiseret idræt end alder i år gav en odds ratio på 2,07 for alvorlig overbelastningsskade. Det er et interessant rækværk, men ikke cykelspecifikt.

**Hvad det betyder for juniorer:**

- **Ingen RCT** har testet 80/20, polariseret, pyramidal eller tærskel i juniorlandevejsryttere.
- Det, der findes, peger samme vej: masser af lav intensitet og ikke for meget tærskeltræning. Det taler mod at tælle "tempo" og "AT" som det, der skal udgøre 10-20 %, sådan som DCU gør.
- Juniorernes løb giver i forvejen meget hård tid. En intensitetsprofil skal derfor tælle løbsdage med.

### 4.4 Periodisering: traditionel, blok og rækkefølge

- **Sandbakk m.fl. 2025**, Sports Med Open 11:45 [abstract]. 12 norske verdensklassetrænere, blandt dem i landevejscykling: "All coaches adhere to a traditional periodization model". De kombinerer meget lav intensitet med "2-3 weekly 'key workout' days consisting of 3-5 intensive training sessions". DCU's grundstruktur svarer altså til praksis i toppen.
- **Galán-Rioja m.fl. 2023**, IJSPP 18:112-122 [abstract]: "No evidence is currently available favoring a specific periodization model during 8 to 12 weeks in trained road cyclists".
- **Sylta m.fl. 2016**, MSSE 48:2165-2174 [abstract]. 63 trænede cykelryttere i 12 uger.
  - Intervallerne kom fra lang til kort (4×16 → 4×8 → 4×4 min, ligesom DCU), fra kort til lang, eller blandet.
  - "little or no effect on training adaptation when the overall training load is the same".
  - **DCU's rækkefølge er altså fin, men ikke nødvendig.**
- **Blokperiodisering:**
  - Rønnestad m.fl. 2014 (to små RCT'er med trænede cykelryttere, n = 8-10 pr. gruppe) fandt fordele [abstract].
  - Metaanalysen af Mølmen, Øfsteng & Rønnestad 2019 fandt VO2max SMD 0,40, men "small studies with generally low methodological quality (mean PEDro score = 3.7/10)" [abstract].
  - **Hos juniorer** fandt to forsøg med langrendsløbere ingen ekstra effekt:
    - McGawley m.fl. 2017: 20 juniorer på ca. 17 år. 9 hårde pas samlet i én uge var ikke bedre end 3 om ugen [abstract].
    - Walther m.fl. 2026: 20 juniorer. En blok med 160 % lav-intensiv mængde i én uge gav ingen ekstra effekt (VO2max P = .83), og blokgruppen rapporterede "significantly lower mood and perceived recovery" i den store uge og ugen efter [abstract].
  - Kiely 2018 (Sports Med 48:753-764) kritiserer periodiseringsteoriens grundlag generelt [abstract].

**Konklusion.** Periodiseringsformen betyder mindre end den samlede belastning og intensitetsfordelingen. Blokke er et værktøj, en træner kan bruge (Kadence har træningsblokke, ADR 0025), men ikke et selvstændigt paradigme, som er værd at tilbyde unge.

### 4.5 "Den norske model" (dobbelt tærskel)

- **Casado, Foster, Bakken & Tjelta 2023**, IJERPH 20:3782 [læst].
  - Modellen er 3-4 laktatstyrede tærskeløkter (2-4,5 mmol/L) og én VO2max-økt om ugen inden for en meget stor mængde.
  - Forfatternes egne forbehold:
    - den bygger "on the basis of only observational studies and reports";
    - "No controlled studies have tested the efficacy of this training model";
    - den er beskrevet "only in 1500 m and 5000 m runners";
    - flere hårde økter "may represent an increased risk of injury/overtraining syndrome".
- Jeg fandt **ingen** fagfællebedømte studier af modellen i unge eller i cykling. Ungdomsversioner på nettet kommer fra blogs.
- Den passer også dårligt med Guellich & Seiler 2010.
- **Den skal ikke tilbydes.** Højst kan den nævnes i trænerguiden som noget, man ikke skal kopiere.

---

## 5. Styrke: paradigmerne er uenige

| Kilde                                      | Hvornår tung styrke                                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| DCU / Team Danmark (2015)                  | U17: 6-8 RM efter tilvænning, 2-3 pas/uge om vinteren. "ikke skadesfremkaldende"                                             |
| NCF 2014                                   | "vente med fokus på tung styrketrening til 18-årsalderen" (ikke af hensyn til sikkerheden, men for at prioritere det aerobe) |
| NCF Utviklingstrapp 2020                   | Efter puberteten 1-3 styrkeøkter/uge, tunge sæt på 3-8 gentagelser                                                           |
| SCF 2025                                   | Barbell-løft sidst i "Träna för att träna", maksimal og eksplosiv styrke året rundt i "Träna för att tävla"                  |
| BDR 2009                                   | Året rundt, fra generel til specifik. MTB: 1. år uden ekstra vægt                                                            |
| Lloyd m.fl. 2014 (international konsensus) | Styrketræning for unge er sikker og gavnlig under kvalificeret vejledning [kun citat verificeret]                            |
| ATK 2.0 (Team Danmark)                     | Ikke farligt, hæmmer ikke væksten (se forældrenotatet)                                                                       |

Valenzuela m.fl. 2023 (IJSPP 18:1275-1282) fandt, at styrke og kraft **ikke** adskilte de U23-ryttere, der blev professionelle, fra resten. Det gjorde udholdenhedsmålene [abstract].

**For Kadence betyder det,** at styrkeplanen bør være en del af paradigmet og kunne vælges: DCU's tunge program eller et lettere program med tung styrke først fra 18 år, dvs. U19 2 (NCF).

---

## 6. Rammer for udvikling, ikke planer

- **Balyi / Sport for Life.**
  - Den nyeste udgave er "Long-Term Development in Sport and Physical Activity 3.0" (2019) [læst].
  - Forholdet mellem træning og konkurrence er 60:40 i Train to Train, **40:60** i Train to Compete og **30:70** i Train to Win. "Konkurrence" omfatter konkurrencespecifik træning.
  - Pas pr. uge: 6-9, 9-12 og 9-15.
  - Udgave 3.0 ændrede Balyis gamle forhold fra 2004 (50:50 og 25:75).
  - "Copyright© 2019 Sport for Life Society. All rights reserved."
- **Kritikken af LTAD.** Ford m.fl. 2011 (J Sports Sci 29:389-402) [abstract]: modellen er "one-dimensional". Der er "a lack of empirical evidence", og data hviler på "questionable assumptions and erroneous methodologies". Den er "a generic model rather than an individualized plan". Det rammer også de "vinduer", Canada og KNWU bygger på.
- **IOC-konsensus om unge**, Bergeron m.fl. 2015 (BJSM 49:843-851) [læst]:
  - undgå tidlig specialisering;
  - overbelastning opstår især ved "transitioning too rapidly to higher levels of training and competition demands during adolescence";
  - regelmæssig hvile;
  - søvn 8,5-9,5 t for unge;
  - ingen træning eller konkurrence med smerter.
  - Konsensussen giver principper og rækværk, ikke timer.
- **IOC REDs 2023**, Mountjoy m.fl. (BJSM 57:1073-1097) [abstract]. Kadence beregner ikke energitilgængelighed (se trænernotatet). Brug den som tekst og henvisning.
- **YPD**, Lloyd & Oliver 2012, og **NSCA's LTAD-holdning**, Lloyd m.fl. 2016 [citat verificeret, indhold ikke]. Pointen er, at fysiske egenskaber kan trænes hele barndommen og ungdommen, ikke kun i "vinduer". De kan bruges som baggrund for styrketeksten.
- **ATK 2.0 og Talenthuset** (Team Danmark/DIF) er allerede beskrevet i forældrenotatet. ATK sætter ikke tal på timer.
- **Periodisering efter menstruationscyklus** er ikke et paradigme, der kan tilbydes. McNulty m.fl. 2020 (Sports Med 50:1813-1827) fandt højst en "trivially reduced" præstation i den tidlige follikulære fase, og evidensen var af lav kvalitet. De anbefaler "a personalised approach" frem for generelle regler [abstract].

---

## 7. Rettigheder: må vi gengive tallene?

Dette er ikke juridisk rådgivning. Tal og fakta er som udgangspunkt ikke ophavsretligt beskyttede, og Kadence citerer allerede DCU's tal med sidehenvisning. Men en tabel med "et større antal oplysninger" kan være beskyttet som katalog eller database (ophavsretslovens § 71). Derfor bør vi spørge, før en hel tabel kommer ind i appen.

| Kilde                                        | Licenstekst                                                          | Brug i Kadence                                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| DCU                                          | Ingen                                                                | Som nu: tal med kilde og side                                                                            |
| BDR NWP 2009                                 | Ingen fundet                                                         | Tallene med kildeangivelse. **Skriv til BDR/Deutsche Radsportjugend og spørg**, før tabellen bliver data |
| SCF "Den blågula cykelvägen"                 | Ingen fundet                                                         | Spænd og principper med kildeangivelse. Spørg SCF                                                        |
| NCF (2014, 2020), Olympiatoppen (2015, 2024) | Ingen fundet                                                         | Principper og citater med kildeangivelse                                                                 |
| Cycling Canada LTAD                          | "All rights reserved … for commercial purposes … without permission" | Link. Enkelte tal kan omtales i tekst. Ingen tabel uden tilladelse                                       |
| Sport for Life 3.0                           | "All rights reserved"                                                | Link                                                                                                     |
| KNWU Talentvisie 2030                        | "Alle rechten voorbehouden"                                          | Link                                                                                                     |
| AusCycling                                   | "© 2026 AusCycling. All rights reserved."                            | Link                                                                                                     |
| Videnskabelige artikler                      | Forlagets ophavsret til teksten                                      | Tal og fund må omtales med kildeangivelse. Abstracts skal parafraseres                                   |
| Friel / VeloPress                            | Bog, ophavsret                                                       | Kun link                                                                                                 |

Kadence er AGPL og gratis, men hostet Kadence kan blive regnet for "commercial". Det gør spørgsmålet til Canada, Sport for Life og KNWU relevant, hvis vi nogensinde vil vise deres tabeller.

---

## 8. Anbefaling

### 8.1 Hvilke paradigmer skal kunne vælges

**1. Intensitetsprofilen "Lav intensitet først" (polariseret/pyramidal).** Laves først, fordi den har mest evidens og kræver den mindste ændring.

- **Hvad den er:** et lag oven på enhver timemodel, også DCU's. Den erstatter årshjulets "intervaltid 10-20 % inkl. tempo" med en andel i tre zoner pr. fase.
- **Kilder:**
  - NCF 2014: ~75 / 5-10 / 15-20;
  - SCF 2025: mindst 75 % lav, under 25 % hård og styrke i alt;
  - Seiler 2010: ca. 80/20, talt i pas;
  - Guellich & Seiler 2010 for juniorer;
  - Rosenblat 2025 og Oliveira 2024 for ligeværdigheden mellem polariseret og pyramidal.
- **Forslag til tal (Kadence's syntese, ikke én kildes):**
  - Distance- og basisfaserne: mindst 75-80 % i zone 1, højst 10 % i zone 2 og resten i zone 3.
  - Sæsonen: løbsdagene tælles med.
  - Profilen viser et flag (ikke et forbud), når zone 2 vokser sig stor (Guellich & Seiler 2010; Leo 2020).
- **Forbehold:**
  - Profilen bør hedde "Lav intensitet først", ikke "80/20" eller "polariseret". Evidensen viser ikke, at én fast fordeling er optimal.
  - Juniorernes løb fylder meget af den hårde tid.

**2. BDR 2009 som alternativ timemodel.**

- **Hvorfor:** den er konkret pr. alder (15-20 år) og den eneste med kvindetal pr. alder. Den har også pas pr. uge, rytmen 2:1/3:1, en progression på 15-20 % og en grænse for lange pas i træk. Den passer direkte ind i Kadence's klasse-år-model.
- **Forbehold:**
  - Den er ældre end DCU's (2009 mod 2025), og den slutter ved AK 20.
  - Der er ingen månedsprofil. Kadence fordeler årets "spez."-timer efter DCU's månedsprofil og skal vise, at det er Kadence's valg.
  - U23 3 og U23 4 skal enten have DCU's tal eller ingen.
  - Vi skal spørge BDR først.

**3. SCF 2025 som korridormodel (valgfri, efter 1 og 2).**

- **Hvorfor:** den er den nyeste forbundsmodel, den har både timer og intensitet, og faserne bestemmes af modenhed og erfaring frem for årgang. Den passer til trænere, der ikke vil styres af ét tal.
- **Forbehold:**
  - Spændene er brede (300-500 → 600-1000 t over fasen "Träna för att tävla").
  - Træneren skal placere rytteren i fasen.
  - Kadence viser en korridor, ikke et mål.
  - Den dækker Canada-familien (Canada og KNWU) med de nyeste tal og uden deres forbehold om alle rettigheder. Vi skal stadig spørge SCF.

**Kun link, eller tekst i trænerguiden:**

- Cycling Canada LTAD og KNWU Talentvisie 2030 (alle rettigheder forbeholdt; tallene er Canadas);
- Sport for Life 3.0 (generel; LTAD-kritikken skal nævnes);
- Olympiatoppen (principper, I-skalaen, +50 t/år);
- NCF's Utviklingstrapp (stopper ved 16);
- British Cycling ("to hviledage om ugen"), USA Cycling, AusCycling, Swiss Cycling, UCI;
- IOC-konsensus, REDs, YPD og NSCA (tekst og rækværk);
- Friel/TrainingPeaks (kommerciel);
- den norske model (ingen evidens for unge);
- blokperiodisering (et værktøj, ikke en model).

### 8.2 Datamodellen

Et paradigme er en navngiven, versioneret og kildeangivet pakke. Det kunne være data i kode som `src/modules/dcu` i dag, fx `src/modules/paradigm/<id>`, så paradigmerne selv ikke kræver en ny tabel. Valget gemmes som et felt på sæsonplanen, hvilket er en lille migration (se nedenfor). Pakken har syv dele:

1. **Mængde.** Timer pr. måned pr. basis som en korridor med lav, mål og høj.
   - DCU har kun et mål, og Kadence lægger ±20 % på (ADR 0015).
   - BDR har kun årstimer. Månederne afledes fra en profil, og afledningen er markeret.
   - SCF har kun spænd, så lav og høj er kildens, og målet er midten (beregnet).
   - Et paradigme uden timer, fx en ren intensitetsprofil, arver timerne fra et andet.
2. **Basis.** Enten klasse-år (DCU, BDR efter alder) eller fase plus placering i fasen (SCF, Canada, KNWU), som træneren vælger. Kadence registrerer allerede højde (ADR 0013), men vækstspurten skal ikke beregnes automatisk. Træneren vælger.
3. **Faser.** En liste med måneder (eller uger før en formtop), navn og formål. DCU's fem faser er én instans.
4. **Intensitetsfordeling pr. fase.** Andel i tre zoner, med tolerance, zoneanker og optællingsmetode:
   - **Zoneanker:** power, puls eller RPE. Sanders m.fl. 2017 viser, at samme træning gav 87 % i zone 1 efter puls, 80 % efter watt og 45 % efter RPE [abstract]. En profil uden anker giver ingen mening.
   - **Optælling:** enten tid i zone eller pasets mål. Pasets mål er Seilers optælling i pas og Olympiatoppens anbefaling om at føre hele draget i den planlagte zone.
   - **Løb tæller med.**
   - Kadence's syv zoner (% af FTP) kan lægges sammen til tre: zone 1-2 er lav, zone 3-4 er mellem og zone 5-7 er høj. Det er Kadence's tilnærmelse, ikke en kildes, fordi første tærskel ikke ligger på en fast procent af FTP.
   - DCU's årshjul bliver en instans med kun "andel over grundtræning" udfyldt.
5. **Styrke.** Pas pr. uge pr. fase, den tidligste alder for tung belastning og en skabelon: DCU's programmer eller en NCF-agtig variant med tung styrke fra 18.
6. **Rækværk.** De grænser, paradigmet selv angiver, hver med kilde, fx:
   - længste tur (DCU: 4 t / 120 km for U17, 5 t / 150 km for U19);
   - progression pr. år (DCU 10-15 %; BDR 15-20 %);
   - lange pas i træk (BDR 2 / 3);
   - belastningsrytme (BDR 2:1 / 3:1);
   - hviledage (British Cycling 2 pr. uge over 14 år);
   - løb pr. år (Cycling Vlaanderen 50 for U17 og 60 for juniorer; Canada pr. måned);
   - formtoppe pr. år (DCU: "typisk" 2; SCF: under 4 perioder med konkurrencemål).
   - **Et paradigme kan kun tilføje eller stramme rækværk.** Det kan aldrig løsne Kadence's ungdomsstandarder (ADR 0013) eller de rækværk, Kadence selv har.
7. **Metadata.** Navn, ejer, version og år, URL, licens og om tallene må gengives, evidensniveau, og en kort dansk tekst til træneren om, hvad paradigmet er godt til, og hvad det ikke ved.

**Konsekvenser for den nuværende kode.** `buildSeasonPlan` og `compareToDcu` (`src/modules/dcu/season.ts`) og de fire tal fra ADR 0040 ("DCU, Mål, Planlagt, Udført") antager, at referencen er DCU.

- Med flere paradigmer bliver "DCU"-tallet til "Reference (DCU 2025)" eller "Reference (BDR 2009)".
- Afvigelser vises fortsat altid (ADR 0014), nu mod det valgte paradigme.
- DCU forbliver standard.
- Valget er pr. sæsonplan, så en træner kan prøve et alternativ på én rytter.
- Det kræver en ny ADR.

### 8.3 Det mindste første skridt

Byg en **visning af intensitetsfordelingen i tre zoner** pr. uge og pr. fase. Den skal tælle efter pasets mål og have løbsdagene med. Vis den ved siden af årshjulets andel. Det giver træneren den evidensbaserede pointe ("for meget i midten?") uden at skifte timemodel. Det kan bygges på Kadence's eksisterende tid i zoner (`src/modules/load/zones.ts`).

---

## 9. Ikke verificeret eller ikke fundet

- **DCU:** nyere træningsanbefalinger end 2025 er ikke fundet. Siden "Om unge og træning" gav en serverfejl.
- **Intensitetsfordeling i procent** i BDR NWP 2009 er ikke fundet.
- **Officielle timetal** fra British Cycling, USA Cycling, AusCycling, Swiss Cycling og UCI er ikke fundet.
- **Svendsen 2018:**
  - træningstimer pr. gruppe er ikke verificeret (kun løbstimer i abstractet);
  - påstanden "600-800 t/år" er ikke fundet i nogen kilde.
- **Rønnestad m.fl. 2014c** (HIT om efteråret) er kun læst gennem NCF's referat.
- **Debatten i MSSE 2022** er kun set i søgeresultater (betalingsmur).
- **Lloyd & Oliver 2012, NSCA 2016 og Lloyd 2014:** citaterne er verificeret, indholdet ikke i detaljer.
- **Rønnestad m.fl. 2019** (junior-VM-vinder, 496-759 t fra 16 til 18 år) er kun set i et søgeresultat. Må ikke bruges.
- **Studier af danske juniorcykelryttere:** ingen fundet. Svendsen 2018 er norsk ifølge et referat.
- **Licenser:** BDR, SCF og NCF er ikke spurgt.

---

## Kilder

**Cykling Danmark (DCU)**

- Træningsanbefalinger, inkl. "Årshjul for træning på landevej" (side, hentet 3. okt. 2026): https://www.cyklingdanmark.dk/uddannelse/traeningsanbefalinger
- Landevej træningsanbefalinger 2025: https://www.cyklingdanmark.dk/fileadmin/user_upload/Landevej_traeningsanbefalinger_2025.pdf
- Træningsanbefalinger landevej 2024 (forrige udgave): https://www.cyklingdanmark.dk/fileadmin/user_upload/DCU_traeningsanbefalinger_2024.xls__-__Kompatibilitetstilstand.pdf
- Intervaltræning: https://www.cyklingdanmark.dk/fileadmin/user_upload/intervaltraening.pdf
- Vejen frem, talent- og elitestrategi 2025-2028: https://dcu2023.idefadev.dk/fileadmin/PDF/VEJEN_FREM_DCU_Talent-_og_Elitestrategi_2025-2028.pdf
- Om unge og træning (serverfejl 3. okt. 2026): https://www.cyklingdanmark.dk/leadout/om-unge-og-traening/

**Forbund og organisationer**

- BDR, Nachwuchsprogramm 2009: https://static.rad-net.de/html/disziplinen/radsportjugend/nachwuchsprogramm-des-bdr_13.pdf
- SCF, Den blågula cykelvägen, de syv faser: https://utbildning.scf.se/den-blagula-cykelvagen/de-sju-faserna
  - Träna för att träna: https://utbildning.scf.se/den-blagula-cykelvagen/de-sju-faserna/trana-for-att-trana
  - Träna för att tävla: https://utbildning.scf.se/den-blagula-cykelvagen/de-sju-faserna/trana-for-att-tavla
  - Träna för att vinna: https://utbildning.scf.se/den-blagula-cykelvagen/de-sju-faserna/trana-for-att-vinna
- Cycling Canada, LTAD vol. 1: https://cyclingcanada.ca/wp-content/uploads/2012/05/CC_LTAD_Vol1_EN-2014.pdf
- Cycling Canada, Track LTAD: https://cyclingcanada.ca/wp-content/uploads/2012/05/6-Track-specific-LTAD1.pdf
- KNWU, fase-beregner: https://www.knwu.nl/bepaal-fase
- KNWU, Talentvisie 2030 (Wayback-kopi): http://web.archive.org/web/20230218222654/https://www.researchgate.net/publication/334291408
- NCF, Utholdenhetstrening 2.6 (Rønnestad m.fl.): https://sykling.no/wp-content/uploads/2020/11/UTHOLDENHETSTRENING2_6.pdf
- NCF, Utviklingstrapp: https://sykling.no/app/uploads/2020/11/Utviklingstrapp-ferdig-redigert.pdf
- NCF, Forslag til treningsplan 650 timer: https://sykling.no/wp-content/uploads/2020/11/Forslag-til-treningsplan-650timer-nov-15-1.xlsx
- Olympiatoppen, Utvikling av unge utøvere: https://klatring.no/siteassets/dokumenter/for-deg/trener/trener-1/utvikling-av-unge-utovere---olypiatoppens-utviklingsfilosofi-og-praktiske-rad-fra-fagavdelingene-1.pdf
- Olympiatoppens intensitetsskala, version 2 (2024): https://olt-skala.nif.no/olt_2024_no.pdf
- Sport for Life, LTD 3.0 (2019): https://sportforlife.ca/wp-content/uploads/2019/06/Long-Term-Development-in-Sport-and-Physical-Activity-3.0.pdf
- Sport for Life, LTAD 2.1 (2016): https://sportforlife.ca/wp-content/uploads/2017/04/LTAD-2.1-EN_web.pdf
- Balyi & Hamilton 2004: https://alancouzens.com/blog/Balyi_LTAD.pdf
- AusCycling, Competitive Rider Journey – Road: https://admin.platform.auscycling.org.au/uploads/Competitive%20Rider%20Journey%20Road.pdf
- Cycling Vlaanderen, Jeugdreglementering 2026: https://cycling.vlaanderen/assets/uploads/downloads/Jeugdreglementering-2026-1.pdf
- USOPC, American Development Model: https://www.usopc.org/ADM
- Joe Friel, The All New Cyclist's Training Bible (2018): https://joefrieltraining.com/the-all-new-cyclists-training-bible/
- PezCycling (Cheung 2018) om Svendsen 2018: https://pezcyclingnews.com/amp/toolbox/junior-cyclist-to-pro-nature-or-nurture/

**Videnskabelige artikler** (DOI-links)

- Bergeron MF m.fl. 2015, IOC consensus statement on youth athletic development, BJSM: https://doi.org/10.1136/bjsports-2015-094962
- Casado A, Foster C, Bakken M, Tjelta LI 2023, IJERPH: https://doi.org/10.3390/ijerph20053782
- Foster C m.fl. 2022, MSSE: https://doi.org/10.1249/MSS.0000000000002871
- Burnley M m.fl. 2022, MSSE: https://doi.org/10.1249/MSS.0000000000002869
- Ford P m.fl. 2011, J Sports Sci: https://doi.org/10.1080/02640414.2010.536849
- Galán-Rioja MÁ m.fl. 2023, IJSPP: https://doi.org/10.1123/ijspp.2022-0302
- Gallo G m.fl. 2022, Int J Sports Med (træning junior/U23/pro): https://doi.org/10.1055/a-1847-5414
- Gallo G m.fl. 2022, IJSPP (løbskrav junior/U23/pro): https://doi.org/10.1123/ijspp.2021-0256
- Gallo G m.fl. 2022, SJMSS (Giro top-5): https://doi.org/10.1111/sms.14201
- Guellich A, Seiler S 2010, IJSPP: https://doi.org/10.1123/ijspp.5.3.316
- Jayanthi NA m.fl. 2015, Am J Sports Med: https://doi.org/10.1177/0363546514567298
- Karlsson Ø, Laaksonen MS, McGawley K 2021, PLoS One: https://doi.org/10.1371/journal.pone.0250088
- Kenneally M m.fl. 2018, IJSPP: https://doi.org/10.1123/ijspp.2017-0327
- Kiely J 2018, Sports Med: https://doi.org/10.1007/s40279-017-0823-y
- Kong F m.fl. 2025, Metabolites: https://doi.org/10.3390/metabo15010017
- Leo P m.fl. 2020, Sports (U23): https://doi.org/10.3390/sports8120167
- Leo P m.fl. 2022, J Sports Sci: https://doi.org/10.1080/02640414.2022.2117394
- Lloyd RS, Oliver JL 2012, Strength Cond J: https://doi.org/10.1519/SSC.0b013e31825760ea
- Lloyd RS m.fl. 2014, BJSM: https://doi.org/10.1136/bjsports-2013-092952
- Lloyd RS m.fl. 2016, JSCR: https://doi.org/10.1519/JSC.0000000000001387
- McGawley K m.fl. 2017, Front Physiol: https://doi.org/10.3389/fphys.2017.00413
- McNulty KL m.fl. 2020, Sports Med: https://doi.org/10.1007/s40279-020-01319-3
- Mølmen KS, Øfsteng SJ, Rønnestad BR 2019, Open Access J Sports Med: https://doi.org/10.2147/OAJSM.S180408
- Mountjoy M m.fl. 2023, IOC REDs, BJSM: https://doi.org/10.1136/bjsports-2023-106994
- Neal CM m.fl. 2013, J Appl Physiol: https://doi.org/10.1152/japplphysiol.00652.2012
- Pinot J, Grappe F 2015, J Sports Sci: https://doi.org/10.1080/02640414.2014.969296
- Rodríguez-Marroyo JA m.fl. 2011, JSCR: https://doi.org/10.1519/JSC.0b013e3181bf4426
- Rosenblat MA, Perrotta AS, Vicenzino B 2019, JSCR: https://doi.org/10.1519/JSC.0000000000002618
- Rosenblat MA m.fl. 2025, Sports Med: https://doi.org/10.1007/s40279-024-02149-3
- Rønnestad BR, Hansen J, Ellefsen S 2014, SJMSS: https://doi.org/10.1111/j.1600-0838.2012.01485.x
- Rønnestad BR m.fl. 2014, SJMSS: https://doi.org/10.1111/sms.12016
- Sandbakk Ø m.fl. 2025, Sports Med Open 11:45 (PMC12031707): https://pmc.ncbi.nlm.nih.gov/articles/PMC12031707/
- Sanders D, Myers T, Akubat I 2017, IJSPP: https://doi.org/10.1123/ijspp.2016-0523
- Seiler KS, Kjerland GØ 2006, SJMSS: https://doi.org/10.1111/j.1600-0838.2004.00418.x
- Seiler S 2010, IJSPP: https://doi.org/10.1123/ijspp.5.3.276
- Silva Oliveira P, Boppre G, Fonseca H 2024, Sports Med: https://doi.org/10.1007/s40279-024-02034-z
- Sperlich B, Matzka M, Holmberg HC 2023, Front Sports Act Living (PMC10641476): https://pmc.ncbi.nlm.nih.gov/articles/PMC10641476/
- Spragg J, Leo P, Swart J 2023, Eur J Sport Sci: https://doi.org/10.1080/17461391.2022.2049886
- Staff HC m.fl. 2023, Sports Med: https://doi.org/10.1007/s40279-023-01850-z
- Stöggl T, Sperlich B 2014, Front Physiol: https://doi.org/10.3389/fphys.2014.00033
- Stöggl TL, Sperlich B 2015, Front Physiol: https://doi.org/10.3389/fphys.2015.00295
- Svendsen IS m.fl. 2018, IJSPP: https://doi.org/10.1123/ijspp.2017-0824
- Sylta Ø m.fl. 2016, MSSE: https://doi.org/10.1249/MSS.0000000000001007
- Valenzuela PL m.fl. 2023, IJSPP: https://doi.org/10.1123/ijspp.2023-0083
- Walther J m.fl. 2026, IJSPP: https://doi.org/10.1123/ijspp.2025-0552
