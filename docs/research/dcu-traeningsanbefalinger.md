# DCU / Cykling Danmark – træningsanbefalinger (U17, U19, U23)

Sammenfatning af seks officielle PDF'er fra Cykling Danmark (tidl. Danmarks Cykle Union, DCU). Alle tal er gengivet præcist som i kilderne med kildehenvisning `[kilde s.X]`. Værdier markeret **(beregnet)** står ikke i dokumenterne og er udledt af os. Maskinlæsbar version: [`dcu-anbefalinger.json`](./dcu-anbefalinger.json).

## Kilder

| ID    | Fil                                                                                                                                    | Indhold                                                                     | Sider              | Afsender / dato (PDF-metadata)                                   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------- |
| **A** | [Landevej_traeningsanbefalinger_2025.pdf](https://www.cyklingdanmark.dk/fileadmin/user_upload/Landevej_traeningsanbefalinger_2025.pdf) | "TRÆNINGSANBEFALINGER - LANDEVEJ 2025": timer/måned og timer/dag pr. årgang | 1 (liggende tabel) | Oprettet 2024-10-07 fra "Landevej træningsanbefalinger 2025.xls" |
| **B** | [DCU_U17_kompendium_2016.pdf](https://www.cyklingdanmark.dk/fileadmin/user_upload/DCU_U17_kompendium_2016.pdf)                         | "U17-rytter 2016 – Kompendium"                                              | 21                 | Morten Bennekou, talentchef; 2015-11-02                          |
| **C** | [DCU_U19_kompendium_2016.pdf](https://www.cyklingdanmark.dk/fileadmin/user_upload/DCU_U19_kompendium_2016.pdf)                         | "U19-rytter 2016 – Kompendium"                                              | 31                 | Morten Bennekou, talentchef; 2015-11-02                          |
| **D** | [DCU_U17_styrketraening.pdf](https://www.cyklingdanmark.dk/fileadmin/user_upload/DCU_U17_styrketraening.pdf)                           | "Styrketræningsprogram for U17 landsholdsryttere"                           | 2                  | Jarl Pors Jakobsen, sportsfysiolog, Team Danmark; 2015-10-23     |
| **E** | [DCU_U19_styrketraening.pdf](https://www.cyklingdanmark.dk/fileadmin/user_upload/DCU_U19_styrketraening.pdf)                           | "Styrketræningsprogram for U19 landsholdsryttere"                           | 2                  | Jarl Pors Jakobsen; 2015-10-23                                   |
| **F** | [DCU_U23_styrketraening.pdf](https://www.cyklingdanmark.dk/fileadmin/user_upload/DCU_U23_styrketraening.pdf)                           | "Styrketræningsprogram for U23 landsholdsryttere"                           | 1                  | Jarl Pors Jakobsen; 2015-10-22                                   |

Sidetal i B og C er både PDF-sidenummer og det trykte sidetal (de er identiske).

### Læsbarhed og metode

- Al tekst blev udtrukket med PyMuPDF. Alle sider med tabeller og billeder blev desuden renderet til PNG og kontrolleret visuelt.
- **A** er en roteret, liggende side. Tekstudtrækket kom i forkert rækkefølge, så tallene er aflæst fra den renderede side og krydstjekket mod teksten. Summerne "Nov-mar" og "Nov-sep" stemmer med månedstallene for alle otte kolonner.
- Billederne i **B**, **C**, **D**, **E** og **F** er øvelsesfotos uden yderligere data. **Intet indhold var ulæseligt.**

### Vigtigt: Det står IKKE i dokumenterne

| Emne                                                           | Status                                                                                                                                                                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zonemodel baseret på % af FTP, % af max-puls, laktat e.l.      | **Findes ikke.** Eneste intensitetsangivelser er "Tempotræning (70-80 %)", "AT (80-90 %)", "fartlege" og "Opladning: 1*5 min. AT eller 1*3 max." i eksempelugerne [B s.14; C s.16–17]. Det står **ikke**, hvad procenten er af. |
| Intensitetsfordeling (fx % tid i zoner, polariseret/pyramidal) | Findes ikke                                                                                                                                                                                                                     |
| Antal løbsdage pr. sæson                                       | Findes ikke (eksempelugerne i sæsonen har ét cykelløb om søndagen)                                                                                                                                                              |
| Udvekslingsbegrænsninger (gearing)                             | Findes ikke i nogen af de seks dokumenter                                                                                                                                                                                       |
| Cykelteknik og anbefalinger om andre idrætsgrene               | Findes ikke, bortset fra at andre træningsformer ikke tæller med i timetallet [B s.12]                                                                                                                                          |
| Eksplicit antal cykelpas pr. uge                               | Findes ikke. Kan kun udledes af eksempelugerne (se afsnit 4).                                                                                                                                                                   |
| Tal for yngre klasser (drenge/piger, U15) eller seniorer       | Findes ikke (se afsnit 9)                                                                                                                                                                                                       |
| U23-kompendium, U23-eksempeluger, U23-maks. turlængde          | Findes ikke blandt kilderne                                                                                                                                                                                                     |

### Tolkning af kolonnenavne

"U17 1", "U17 2", "U19 1", "U19 2" og "U23 1" til "U23 4" tolkes som 1. og 2. (… 4.) år i kategorien. Tabellerne definerer det ikke, men tolkningen understøttes af to steder: "U17-årene udgør således de første to år af et kontinuerligt … forløb på i alt otte sæsoner (U17, U19, U23)" [B s.6], og yngre U23-ryttere "har fire år til at komme op på det anbefalede niveau" [B s.13; C s.14].

---

## 1. Træningsmængde – 2025-anbefalingerne (gældende) [A s.1]

Oktober er angivet som **"pause + frit"** for alle årgange. Der er ingen timetal for oktober.

### 1.1 Timer pr. måned

| Måned       |        U17 1 |        U17 2 |        U19 1 |        U19 2 |        U23 1 |        U23 2 |        U23 3 |        U23 4 |
| ----------- | -----------: | -----------: | -----------: | -----------: | -----------: | -----------: | -----------: | -----------: |
| Oktober     | pause + frit | pause + frit | pause + frit | pause + frit | pause + frit | pause + frit | pause + frit | pause + frit |
| November    |           21 |           27 |           34 |           38 |           44 |           54 |           60 |           68 |
| December    |           34 |           40 |           46 |           54 |           64 |           70 |           76 |           84 |
| Januar      |           43 |           50 |           56 |           62 |           70 |           76 |           84 |           90 |
| Februar     |           45 |           50 |           56 |           60 |           64 |           70 |           75 |           80 |
| Marts       |           50 |           56 |           62 |           68 |           70 |           74 |           80 |           84 |
| April       |           42 |           46 |           52 |           60 |           66 |           70 |           74 |           78 |
| Maj         |           43 |           48 |           54 |           60 |           68 |           70 |           76 |           80 |
| Juni        |           38 |           42 |           46 |           50 |           54 |           60 |           64 |           66 |
| Juli        |           46 |           52 |           56 |           66 |           72 |           78 |           86 |           92 |
| August      |           37 |           43 |           50 |           56 |           68 |           70 |           78 |           80 |
| September   |           30 |           36 |           42 |           48 |           54 |           60 |           66 |           68 |
| **Nov-mar** |      **193** |      **223** |      **254** |      **282** |      **312** |      **344** |      **375** |      **406** |
| **Nov-sep** |      **429** |      **490** |      **554** |      **622** |      **694** |      **752** |      **819** |      **870** |

### 1.2 Timer pr. dag (som angivet i A)

| Måned     | U17 1 | U17 2 | U19 1 | U19 2 | U23 1 | U23 2 | U23 3 | U23 4 |
| --------- | ----: | ----: | ----: | ----: | ----: | ----: | ----: | ----: |
| Oktober   |     - |     - |     - |     - |     - |     - |     - |     - |
| November  |   0,7 |   0,9 |   1,1 |   1,3 |   1,5 |   1,8 |   2,0 |   2,3 |
| December  |   1,1 |   1,3 |   1,5 |   1,7 |   2,1 |   2,3 |   2,5 |   2,7 |
| Januar    |   1,4 |   1,6 |   1,8 |   2,0 |   2,3 |   2,5 |   2,7 |   2,9 |
| Februar   |   1,6 |   1,8 |   2,0 |   2,1 |   2,3 |   2,5 |   2,7 |   2,9 |
| Marts     |   1,6 |   1,8 |   2,0 |   2,2 |   2,3 |   2,4 |   2,6 |   2,7 |
| April     |   1,4 |   1,5 |   1,7 |   2,0 |   2,2 |   2,3 |   2,5 |   2,6 |
| Maj       |   1,4 |   1,5 |   1,7 |   1,9 |   2,2 |   2,3 |   2,5 |   2,6 |
| Juni      |   1,3 |   1,4 |   1,5 |   1,7 |   1,8 |   2,0 |   2,1 |   2,2 |
| Juli      |   1,5 |   1,7 |   1,8 |   2,1 |   2,3 |   2,5 |   2,8 |   3,0 |
| August    |   1,2 |   1,4 |   1,6 |   1,8 |   2,2 |   2,3 |   2,5 |   2,6 |
| September |   1,0 |   1,2 |   1,4 |   1,6 |   1,8 |   2,0 |   2,2 |   2,3 |

"Timer/dag" svarer til månedstimer divideret med kalenderdage, fx 45 t / 28 dage ≈ 1,6 i februar for U17 1. Det er altså et gennemsnit, der inkluderer hviledage.

### 1.3 Timer pr. uge **(beregnet = timer/dag × 7; ikke angivet af DCU)**

| Måned     | U17 1 | U17 2 | U19 1 | U19 2 | U23 1 | U23 2 | U23 3 | U23 4 |
| --------- | ----: | ----: | ----: | ----: | ----: | ----: | ----: | ----: |
| November  |   4,9 |   6,3 |   7,7 |   9,1 |  10,5 |  12,6 |  14,0 |  16,1 |
| December  |   7,7 |   9,1 |  10,5 |  11,9 |  14,7 |  16,1 |  17,5 |  18,9 |
| Januar    |   9,8 |  11,2 |  12,6 |  14,0 |  16,1 |  17,5 |  18,9 |  20,3 |
| Februar   |  11,2 |  12,6 |  14,0 |  14,7 |  16,1 |  17,5 |  18,9 |  20,3 |
| Marts     |  11,2 |  12,6 |  14,0 |  15,4 |  16,1 |  16,8 |  18,2 |  18,9 |
| April     |   9,8 |  10,5 |  11,9 |  14,0 |  15,4 |  16,1 |  17,5 |  18,2 |
| Maj       |   9,8 |  10,5 |  11,9 |  13,3 |  15,4 |  16,1 |  17,5 |  18,2 |
| Juni      |   9,1 |   9,8 |  10,5 |  11,9 |  12,6 |  14,0 |  14,7 |  15,4 |
| Juli      |  10,5 |  11,9 |  12,6 |  14,7 |  16,1 |  17,5 |  19,6 |  21,0 |
| August    |   8,4 |   9,8 |  11,2 |  12,6 |  15,4 |  16,1 |  17,5 |  18,2 |
| September |   7,0 |   8,4 |   9,8 |  11,2 |  12,6 |  14,0 |  15,4 |  16,1 |

**Samlet ugeinterval (beregnet), nov–sep:** U17 er på 4,9–12,6 t/uge, U19 på 7,7–15,4 t/uge og U23 på 10,5–21,0 t/uge.

---

## 2. Træningsmængde – 2016-anbefalingerne (historisk) [B s.13; C s.13]

"TRÆNINGSANBEFALINGER – LANDEVEJ 2016" er timer pr. måned. Tabellen er identisk i begge kompendier.

| Måned     |   U17 1 |   U17 2 |   U19 1 |   U19 2 |   U23 1 |   U23 2 |   U23 3 |   U23 4 |
| --------- | ------: | ------: | ------: | ------: | ------: | ------: | ------: | ------: |
| November  |      20 |      25 |      30 |      35 |      40 |      45 |      50 |      55 |
| December  |      26 |      32 |      38 |      44 |      50 |      56 |      62 |      68 |
| Januar    |      36 |      42 |      48 |      54 |      60 |      66 |      72 |      78 |
| Februar   |      45 |      50 |      55 |      60 |      65 |      70 |      75 |      80 |
| Marts     |      56 |      64 |      72 |      78 |      84 |      90 |      94 |      98 |
| April     |      40 |      45 |      52 |      60 |      70 |      75 |      80 |      85 |
| Maj       |      40 |      45 |      52 |      60 |      70 |      75 |      80 |      85 |
| Juni      |      35 |      40 |      46 |      52 |      58 |      62 |      66 |      70 |
| Juli      |      45 |      50 |      56 |      65 |      75 |      80 |      90 |     100 |
| August    |      40 |      45 |      52 |      60 |      70 |      75 |      80 |      85 |
| September |      35 |      40 |      45 |      50 |      60 |      70 |      75 |      80 |
| **I alt** | **418** | **478** | **546** | **618** | **702** | **764** | **824** | **884** |

### 2016 sammenlignet med 2025 (nov–sep, timer)

|                 | U17 1 | U17 2 | U19 1 | U19 2 | U23 1 | U23 2 | U23 3 | U23 4 |
| --------------- | ----: | ----: | ----: | ----: | ----: | ----: | ----: | ----: |
| 2016 [B/C s.13] |   418 |   478 |   546 |   618 |   702 |   764 |   824 |   884 |
| 2025 [A s.1]    |   429 |   490 |   554 |   622 |   694 |   752 |   819 |   870 |

Profilen er ændret. I 2016 er marts den klart største vintermåned, og teksten siger, at det "formentlig kræver en træningslejr sydpå" [C s.14]. I 2025 er vinterkurven fladere, og juli er den største måned for U23.

---

## 3. Regler for mængde og progression (tekst)

| Emne                    | DCU's formulering                                                                                                                                                                                                                                 | Kilde             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Hvad tæller             | Træningstimerne vedrører "timer på cykel" (landevej, bane, MTB, spinning, ruller mv.). Andre træningsformer (løb, svømning, gymnastik, ski, boldspil mv.) tæller ikke med.                                                                        | B s.12            |
| Overholdelse            | Det anbefales, at man "hverken træner meget mere eller meget mindre end disse anbefalinger". Anbefalingerne er vejledende og bør nuanceres af klub- eller landstrænere.                                                                           | B s.12; C s.13    |
| Rød tråd                | Der er "indarbejdet en rød tråd i træningsmængden fra U17-sektionen, igennem U19-tiden og til og med U23-kategorien".                                                                                                                             | B s.12; C s.13    |
| U17                     | "det vigtigste er, at rytterne her ikke træner for meget". For store mængder kan dræbe motivationen og gør progression svær. Anbefalingerne bygger på "ikke alt for store træningsmængder, hverken i første halvdel af vinteren eller i sæsonen". | B s.12; C s.13    |
| U19 – årlig progression | Det er naturligt at øge træningsmængden "passende (10-15 %)". For store mængder for tidligt gør det sværere at øge mængden kontinuerligt senere.                                                                                                  | C s.12            |
| U19 – vinter            | "stødt stigende træningsmængde, som topper med 72-78 anbefalede træningstimer i marts" (kræver formentlig træningslejr sydpå)                                                                                                                     | C s.14; B s.12    |
| U19 – sæson             | "45-60 timer hver måned". Lidt mindre i juni (mange vigtige starter, der slutter med DM), lidt mere i juli (sommerferie, træningsbase), lidt mindre i august og september. Sæsonen bør køres helt til ende.                                       | C s.14; B s.12–13 |
| U23                     | Samme skabelon: progressivt stigende mængde over vinteren. I sæsonen samme skabelon som U19, "dog med en ca. 20 % forøgelse af træningsmængden måned for måned". Det er naturligt, at yngre U23-ryttere ligger lidt under.                        | B s.13; C s.14    |
| Træningslejre           | Undgå for store "spring" i mængden. Akutte, voldsomme forøgelser giver risiko for overtræningssymptomer samt led- og seneskader.                                                                                                                  | B s.14–15; C s.17 |
| **Maks. turlængde U17** | "du ALDRIG kører træningsture, der overstiger fire timer eller 120 km." Så store mængder kun under de helt rette forudsætninger (godt og varmt vejr, flere til at tage føringer, lille niveauforskel).                                            | B s.15            |
| **Maks. turlængde U19** | "du som U19-rytter ALDRIG kører træningsture, der overstiger fem timer eller 150 km." Samme forudsætninger som for U17.                                                                                                                           | C s.18            |
| Maks. turlængde U23     | Ikke angivet                                                                                                                                                                                                                                      | –                 |

Bemærk: B s.12 skriver "rettet mod cykelryttere, som i 2015 ønsker …", mens C s.13 skriver "i 2016". Det er formentlig en rest fra en tidligere udgave.

---

## 4. Periodisering, intensitet og eksempeluger

### 4.1 Sæsonfaser

DCU navngiver ikke faserne. Rækkefølgen nedenfor er DCU's beskrivelse.

| Periode                 | Indhold                                                                                                                                           | Kilde             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Oktober                 | "pause + frit"                                                                                                                                    | A s.1             |
| November–december       | Formopbygningen tager "primært udgangspunkt i stigende træningsmængde (distance)". Bane-, MTB- og crossryttere kører dog også en del intervaller. | B s.13–14; C s.14 |
| Efter nytår (jan–feb)   | "relativt lang basisintervaltræning påbegyndes, samtidig med at træningsmængden fortsat øges måned for måned"                                     | B s.14; C s.14    |
| Omkring marts           | "egentlige formtop intervaller (korte, hårde intervaller)" lægges ind "i relation til ønsket om tidspunkt for den ønskede formtop"                | B s.14; C s.14–15 |
| April–september (sæson) | Se mængderegler ovenfor. Sæsonen køres helt til ende (mange løb i september).                                                                     | B s.12–13; C s.14 |
| Hele året               | Planlægningen omfatter som oftest hele kalenderåret. Hold ikke fuldstændig pause vinteren igennem.                                                | B s.12            |

Generelt princip: "intensitetstræning bør hvile på et passende træningsvolumengrundlag … grundtræningen [skal være] i orden, inden træningen intensiveres med intervaltræning" [B s.13; C s.14]. Planhierarkiet er årsplan, derefter periode-, måneds- og ugeplaner og til sidst dagsplaner. Planen evalueres og justeres løbende [B s.11; C s.12].

### 4.2 Intensitetsbetegnelser (den eneste "zonemodel" i kilderne)

| Betegnelse          | Definition i kilden                                                                                                      | Kilde             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| Grundtræning        | Ikke defineret                                                                                                           | B s.14; C s.16–17 |
| Tempotræning        | "Tempotræning (70-80 %)". Referencen for procenten er **ikke angivet**.                                                  | B s.14; C s.16–17 |
| AT                  | "AT (80-90 %)". Forkortelsen udfoldes ikke (normalt anaerob tærskel, vores tolkning), og referencen er **ikke angivet**. | B s.14; C s.16–17 |
| Fartlege            | "fartlege"                                                                                                               | B s.14; C s.16–17 |
| Opladning           | "1*5 min. AT eller 1*3 max." (dagen før løb)                                                                             | B s.14; C s.17    |
| Restitution         | Ikke defineret (1 time)                                                                                                  | B s.14; C s.17    |
| Basisintervaller    | "relativt lang basisintervaltræning"                                                                                     | B s.14; C s.14    |
| Formtop-intervaller | "korte, hårde intervaller"                                                                                               | B s.14; C s.15    |

**Der findes ingen zoner defineret som % af FTP eller % af max-puls i nogen af de seks dokumenter.**

### 4.3 Eksempeluger

DCU skriver, at eksemplerne "skal nuanceres af din træner".

**U17 – træningsuge i februar** [B s.14]

| Ugedag    | Timer  | Fokus         | Forslag til intervaller                        |
| --------- | ------ | ------------- | ---------------------------------------------- |
| Mandag    | Fri    | Styrketræning | -                                              |
| Tirsdag   | 2      | Interval      | Tempotræning (70-80 %), AT (80-90 %), fartlege |
| Onsdag    | 2      | Grundtræning  | -                                              |
| Torsdag   | 2      | Interval      | Tempotræning (70-80 %), AT (80-90 %), fartlege |
| Fredag    | Fri    | Styrketræning | -                                              |
| Lørdag    | 3      | Interval      | Tempotræning (70-80 %), AT (80-90 %), fartlege |
| Søndag    | 3      | Grundtræning  | -                                              |
| **I alt** | **12** |               |                                                |

**U17 – træningsuge i sæsonen** [B s.14]

| Ugedag    | Timer  | Fokus        | Forslag til intervaller                        |
| --------- | ------ | ------------ | ---------------------------------------------- |
| Mandag    | 1      | Restitution  | -                                              |
| Tirsdag   | 3      | Interval     | Tempotræning (70-80 %), AT (80-90 %), fartlege |
| Onsdag    | 3      | Grundtræning | -                                              |
| Torsdag   | 2      | Interval     | Tempotræning (70-80 %), AT (80-90 %), fartlege |
| Fredag    | Fri    | -            | -                                              |
| Lørdag    | 1      | Opladning    | 1*5 min. AT eller 1*3 max.                     |
| Søndag    | 2      | Cykelløb     | -                                              |
| **I alt** | **12** |              |                                                |

**U19 – træningsuge i februar** [C s.16]

| Ugedag    | Timer  | Fokus                        | Forslag til intervaller                        |
| --------- | ------ | ---------------------------- | ---------------------------------------------- |
| Mandag    | Fri    | Styrketræning                | -                                              |
| Tirsdag   | 3      | Interval                     | Tempotræning (70-80 %), AT (80-90 %), fartlege |
| Onsdag    | 2      | Grundtræning / Styrketræning | -                                              |
| Torsdag   | 3      | Interval                     | Tempotræning (70-80 %), AT (80-90 %), fartlege |
| Fredag    | Fri    | Styrketræning                | -                                              |
| Lørdag    | 3      | Interval                     | Tempotræning (70-80 %), AT (80-90 %), fartlege |
| Søndag    | 4      | Grundtræning                 | -                                              |
| **I alt** | **15** |                              |                                                |

**U19 – træningsuge i sæsonen** [C s.17]

| Ugedag    | Timer  | Fokus         | Forslag til intervaller                        |
| --------- | ------ | ------------- | ---------------------------------------------- |
| Mandag    | Fri    | Styrketræning | -                                              |
| Tirsdag   | 3      | Interval      | Tempotræning (70-80 %), AT (80-90 %), fartlege |
| Onsdag    | 3      | Grundtræning  | -                                              |
| Torsdag   | 3      | Interval      | Tempotræning (70-80 %), AT (80-90 %), fartlege |
| Fredag    | 1      | Restitution   | -                                              |
| Lørdag    | 1      | Opladning     | 1*5 min. AT eller 1*3 max.                     |
| Søndag    | 3      | Cykelløb      | -                                              |
| **I alt** | **14** |               |                                                |

**Pas pr. uge (beregnet ud fra eksempelugerne):**

|             | Cykeldage |   Intervalpas | Styrkepas | Løb | Dage uden cykel | Timer |
| ----------- | --------: | ------------: | --------: | --: | --------------: | ----: |
| U17 februar |         5 |             3 |         2 |   0 |               2 |    12 |
| U17 sæson   |         6 | 2 + opladning |         0 |   1 |               1 |    12 |
| U19 februar |         5 |             3 |         3 |   0 |               2 |    15 |
| U19 sæson   |         6 | 2 + opladning |         1 |   1 |               1 |    14 |

---

## 5. Restitution og hvile

| Regel                                                                                                                                                                                       | Kilde               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **Superkompensationsuger**: "træningsvolumen, antallet af træningspas og træningsintensiteten nedsættes". Restitutionen "udløser" ofte fremgangen. Hyppighed og længde er **ikke angivet**. | B s.12              |
| Kvalitet kan være hård træning, moderat træning, aktiv hvile eller "deciderede hviledage, hvor der ikke trænes"                                                                             | B s.12              |
| Ingen fuldstændig vinterpause. Ved lange pauser når man "i princippet ikke … et højere niveau, end det du sluttede på i den foregående sæson".                                              | B s.12              |
| Oktober: "pause + frit"                                                                                                                                                                     | A s.1               |
| Eksempeluger: 1–2 dage uden cykel pr. uge, restitutionstur (1 t) efter eller før løb, opladning (1 t) dagen før løb                                                                         | B s.14; C s.16–17   |
| Styrketræning: "minimum 48 timer imellem hvert styrketræningspas" og restitutionsmåltid lige efter træning                                                                                  | D s.2; E s.2; F s.1 |
| Træningsforstand: lyt til kroppens signaler, læg restitutionsfaser ind, og formtop på passende tidspunkter                                                                                  | B s.8–9             |

---

## 6. Styrketræning

### 6.1 Fælles rammer

| Emne                                         | U17                                                                                                                        | U19                                                                                      | U23                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Opbygning **start november – medio marts**   | 2-3 pas/uge. Fokus: "Tilvænning til styrketræning, tekniktræning og muskelstyrke." [D s.2]                                 | 2-3 pas/uge. Fokus: "Tilvænning og muskelstyrke." [E s.2]                                | 2-3 pas/uge. Fokus: "Tilvænning og muskelstyrke." [F s.1]                  |
| Vedligehold **medio marts – start november** | 1 pas/uge: "Vedligeholdelse af muskelstyrke" [D s.2]                                                                       | 1 pas/uge [E s.2]. "i hvert fald et enkelt træningspas og [sic] ugen" i sæsonen [C s.22] | 1 pas/uge [F s.1]                                                          |
| Minimum pr. vinter                           | 30 sessioner. Kan det ikke nås, bør man "slet ikke" påbegynde et forløb [B s.15]. Afslut senest omkring 1. marts [B s.16]. | 30 sessioner [C s.20, s.22]. Afslut senest omkring 1. marts [C s.20].                    | Ikke angivet                                                               |
| Pause mellem sæt                             | ca. 3 minutter [B s.16]                                                                                                    | ca. 3 minutter [C s.20]                                                                  | Ikke angivet                                                               |
| Mellem pas                                   | min. 48 timer [D s.2]                                                                                                      | min. 48 timer [E s.2]                                                                    | min. 48 timer [F s.1]                                                      |
| Opvarmning                                   | 8 min kondicykel [D s.1] (B s.18: 10 min) + squat 1x20 med lav belastning                                                  | 8 min kondicykel + 1 x 20 squat med **lav** belastning [E s.1; C s.23]                   | 8 min kondicykel + 1 x 20 squat med **50 % af træningsbelastning** [F s.1] |
| Opstartsprotokol for benøvelser              | 6 pas 3×16 → 6 pas 3×12 → 4×6-8 [D s.2]                                                                                    | 4 pas 3×12 → 4 pas 3×8 → 4×6 [E s.2; C s.21–22]. E s.1 skriver i stedet pas 1-6 og 7-12. | 3 pas 3×10-12 → 3 pas 3×8 → 4×4-6 [F s.1]                                  |
| Belastningsmål                               | 6-8 RM                                                                                                                     | 6 RM                                                                                     | 4-6 RM                                                                     |

Fælles retningslinjer:

- Øvelserne udføres "med størst mulig indsats i den koncentriske fase og ved kontrolleret hastighed i den excentriske fase" [D s.2; E s.2; F s.1].
- Lav styrketræning "så tidligt på dagen og cykeltræningen så sent på dagen som muligt" [D s.2; E s.2; F s.1]. Samme dag: styrke først og gerne mindst 5-6 timer mellem de to pas [B s.18; C s.23].
- "Teknik før belastning" [D s.2]. Stræk efter styrketræningen [B s.18; C s.23].
- RM = Repetition Maximum: "6 RM betyder at belastningen skal være så tung at du kun kan udføre 6 repetitioner" [D/E/F s.1]. Kan man tage flere gentagelser, øges vægten [B s.16; C s.20].
- U19/U23: "Muskelstyrke opbygges/trænes primært ved tung belastning på 4-6 RM og kan opnås med moderat træningsfrekvens og moderat træningsvolumen, dvs 1-3 træningspas per uge. Men jo højere træningsfrekvens, jo mere fokus på muskelstyrke og jo større udbytte." [E s.2; F s.1]
- U19: Styrketræning er et supplement og må ikke erstatte cykeltimerne. Overvej det kun, hvis der er tid til ekstra timer om vinteren [C s.18]. De fleste bør foretrække neural styrketræning frem for øget tværsnitsareal (hypertrofi), som kun er relevant for fx spinkle ryttere, der ønsker vægtforøgelse [C s.19].
- U17: Styrketræning er "ikke skadesfremkaldende" og anses for skadesforebyggende "også for unge på 15-16 år" [B s.15]. Den "går ikke ud over knogler, led eller vækst" [D s.2].

### 6.2 U17-program [D s.1–2; B s.15–18]

| #   | Øvelse (katalognavn)                                     | Sæt × reps                                                                                   | Noter                                                                                   |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | Squat – opvarmning (Deep back squat 03553)               | 1 × 20                                                                                       | Lav belastning. Ret ryg/let svaj, knæene på linje med fødderne, fødder i skulderbredde. |
| 2   | Mave bøjning (Sit up 04869)                              | 3 × 15-20 RM                                                                                 |                                                                                         |
| 3   | Faldskærm – Ryg bøjning (Faldskærm 10010)                | 3 × 15-20 RM                                                                                 |                                                                                         |
| 4   | Ben ekstension, i stedet for squat (Leg extension 00854) | Pas 1-6: 3 × 16 RM (træn **ikke** til udmattelse). Pas 7-12: 3 × 12 RM. Derefter 4 × 6-8 RM. | Størst mulig indsats i den koncentriske fase                                            |
| 5   | Ben fleksion (Leg curl 03149)                            | som #4                                                                                       | Få puden til at ramme ballerne                                                          |
| 6   | Benpres (Leg press 00923)                                | som #4                                                                                       | Hold hoften i sædet, knæ på linje med fod                                               |
| 7   | Læg strækning (Calf raise 03132)                         | som #4                                                                                       | Strakte ben, vip op på tæerne og sænk langsomt                                          |

### 6.3 U19-program [E s.1–2; C s.20–23]

| #   | Øvelse (katalognavn)                                                     | Sæt × reps                                                                                                                                                              | Noter                                                                                                                                  |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| –   | Opvarmning                                                               | 8 min kondicykel + 1 × 20 squat, lav belastning                                                                                                                         |                                                                                                                                        |
| 1   | Mave bøjning med vægtstang (BB sit up 01182)                             | 3 × 15-20 RM                                                                                                                                                            |                                                                                                                                        |
| 2   | Ryg bøjning, evt. med vægt på brystet (Roman chair back extension 04278) | 3 × 15-20 RM                                                                                                                                                            |                                                                                                                                        |
| 3   | Ben ekstension, i stedet for squat (Leg extension 00854)                 | E s.1: pas 1-6: 3 × 12 RM (træn ikke til udmattelse). Pas 7-12: 3 × 8 RM. Derefter 4 × 6 RM. E s.2 og C s.21: pas 1-4: 3 × 12 RM. Pas 5-8: 3 × 8 RM. Derefter 4 × 6 RM. | Køres indtil squat-teknikken mestres                                                                                                   |
| 4   | Squat, i stedet for ben ekstension (Deep back squat 03553)               | 4 × 6 RM                                                                                                                                                                | Køres først når teknikken mestres (øves i opvarmningen). Derefter droppes ben ekstension. Ret ryg/let svaj, knæ på linje med fødderne. |
| 5   | Ben fleksion (Leg curl 03149)                                            | som #3                                                                                                                                                                  | Få puden til at ramme ballerne                                                                                                         |
| 6   | Et bens pres (Single leg leg press 00925)                                | som #3                                                                                                                                                                  | Hold hoften i sædet, knæ på linje med fod                                                                                              |

"Alt i alt indeholder programmet 5 øvelser", fordi ben ekstension og squat er alternativer [E s.2].

### 6.4 U23-program [F s.1]

| #   | Øvelse (katalognavn)                                                     | Sæt × reps                                                                                               | Noter                                                                          |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| –   | Opvarmning                                                               | 8 min kondicykel + 1 × 20 squat med 50 % af træningsbelastningen                                         |                                                                                |
| 1   | Mave bøjning med vægtstang (BB sit up 01182)                             | 3 × 15-20 RM                                                                                             |                                                                                |
| 2   | Ryg bøjning, evt. med vægt på brystet (Roman chair back extension 04278) | 3 × 15-20 RM                                                                                             |                                                                                |
| 3   | Squat (Deep back squat 03553)                                            | Pas 1-3: 3 × 10-12 RM. Pas 4-6: 3 × 8 RM. Derefter 4 × 4-6 RM.                                           | Ret ryg/let svaj, knæ på linje med fødderne. Størst mulig koncentrisk indsats. |
| 4   | Et bens pres (Single leg leg press 00925)                                | Pas 1-3: 3 × 10-12 RM til hvert ben. Pas 4-6: 3 × 8 RM til hvert ben. Derefter 4 × 4-6 RM til hvert ben. | Hold hoften i sædet, knæ på linje med fod                                      |

### 6.5 Uoverensstemmelser i styrkematerialet

| #   | Uoverensstemmelse                                                                                                                                                                      | Kilder                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | U17-opvarmning er 8 min kondicykel i programmet og 10 min i kompendiet                                                                                                                 | D s.1 og B s.18           |
| 2   | U17: pas 1-6 skal ifølge programmet ikke trænes til udmattelse, men kompendiet siger "der altid løftes til udmattelse"                                                                 | D s.1 og B s.16           |
| 3   | Kompendierne siger, at "de første 6 uger" er tilvænningsfase. Programmerne definerer protokollen i antal pas.                                                                          | B s.16; C s.20 og D/E s.2 |
| 4   | Kompendierne siger "i alt fire benstyrketræningsøvelser" og "altid fire sæt i hver øvelse". Programmerne har 3 sæt i opstarten og for mave/ryg, og U19 har kun 3 benøvelser ad gangen. | B s.15; C s.20            |
| 5   | U19-progression: pas 1-6/7-12 på programmets side 1, men 4+4 pas på side 2 og i kompendiet                                                                                             | E s.1 og E s.2; C s.21–22 |
| 6   | Opbygningen slutter "senest omkring 1. marts" i kompendierne, men "medio marts" i programmerne                                                                                         | B s.16; C s.20 og D/E/F   |
| 7   | U17's sæsoneksempeluge har ingen styrkepas, selvom programmet anbefaler 1 pas/uge i sæsonen                                                                                            | B s.14 og D s.2           |

---

## 7. Teknik, andre idrætsgrene og udveksling

- **Andre idrætsgrene:** Den eneste omtale er, at "andre træningsformer (løb, svømning, gymnastik, ski, boldspil mv.) ikke tæller med" i timetallet [B s.12]. Der er ingen anbefaling for eller imod dem.
- **Discipliner:** Bane, MTB, spinning og ruller tæller som cykeltimer [B s.12]. Bane-, MTB- og crossryttere kører også intervaller i nov–dec [B s.13–14; C s.14].
- **Cykelteknik:** Ikke behandlet. Styrketræning: "teknik før belastning" [D s.2].
- **Udveksling (gearing):** **Ikke nævnt** i nogen af kilderne.
- **Løbstaktik (U19):** Landsholdets kørestil er at køre aggressivt og offensivt, køre løbene forfra og hellere køre sin egen chance end ødelægge de andres [C s.26–27].

---

## 8. Andet pr. aldersgruppe

**U17**

- Bruttolandsholdstruppen er ca. 30 ryttere fordelt på de to U17-årgange. Truppen har to vintersamlinger (weekender) og indsender træningsregistreringer hver måned [B s.6, s.19].
- Talentudviklingstruppen er ca. 15 ryttere fra hver side af Storebælt (ca. 30 i alt) med efterårssamling i november [B s.7].
- U17-landsholdet kører internationale løb og afdelinger af U19's hjemlige cup. Hvert andet år deltager det i Ungdoms-OL [B s.7].
- Oprykning til U19 kan ske efter B&U DM i august. Det er en subjektiv vurdering, og flere ryttere rykkes op samtidig [B s.21].
- Træningsdagbog anbefales til alle [B s.19].

**U19**

- Bruttolandsholdstruppen er ca. 30 ryttere med to træningssamlinger om vinteren og månedlige træningsregistreringer [C s.7, s.24].
- DCU satser primært på UCI's Nations Cup. Der findes også et "boblerlandshold" [C s.7–8].
- Test: DCU tester fem U19-ryttere tre gange årligt (november, februar, maj) på Team Danmark Testcentrene i Brøndby og Odense. Testprotokollen er ikke beskrevet [C s.8].
- Oprykning efter 2. år [C s.30]:
  - Aftale med et continental-hold giver A-klassen.
  - ≥ 24 point giver B-klassen.
  - 5-23 point giver C-klassen.
  - < 5 point giver D-klassen.
  - 1. års U19 med < 5 point kan søge D-licens.
  - DCU dispenserer "kun yderst sjældent" [C s.31].

**U23**

- Kun mængdetal (afsnit 1–2), en progressionsregel (ca. 20 % over U19 i sæsonen) og styrkeprogrammet (F). Intet kompendium.

---

## 9. Yngre klasser og seniorer (kontekst)

- **Yngre:** Der er ingen tal. Om drenge- og pigeklasserne (fx "Yngste Drenge eller Yngste Pige") skriver B s.3/s.5, at "kammeratskab, leg, sjov, klubliv og klubture selvfølgelig også udgjorde vigtige elementer. Sådan SKAL det fortsat være!". Overgangen til U17 markerer, at træningen "for første gang skal angribes mere systematisk" [B s.5].
- **Seniorer:** Der er ingen træningstal, kun oprykningsreglerne fra U19 til A/B/C/D-klassen [C s.30–31]. Forløbet U17 → U19 → U23 omtales som "otte sæsoner" [B s.6, s.10; C s.7].
