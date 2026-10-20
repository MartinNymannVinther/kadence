# Wahoo og Garmin: den bedste integration til Kadence

_Opsamling, forklaring og anbefaling. Skrevet til dig, Martin; holdets trænere og bestyrelsen kan læse med, og det tekniske står i bilagene. Læst og skrevet 11. oktober 2026._

**Sådan læser du mærkerne.** _[bekræftet dato]_: kilden eller koden er læst den dag. _[fra noter]_: taget fra en af Kadences researchnoter, uden at kilden er læst igen. _[bekræftet af Tredict]_: Tredict har bekræftet det direkte, men det står ikke i en offentlig kilde. _[ubekræftet]_: ingen primærkilde. _Ikke afprøvet_: aldrig prøvet på en rigtig enhed. Det sidste gælder meget. Intet i Kadences enhedsområde har endnu mødt en rigtig Edge, en ELEMNT, en telefon eller en hometrainer [bekræftet 2026-10-11, TECH-DEBT.md]. "Bygget" betyder her "bygget og testet mod efterligninger".

To regler gælder hele vejen. Kadence beder aldrig om en rytters Garmin-adgangskode og bygger intet, der logger ind hos Garmin som rytteren [bekræftet, ADR 0029]. Og intet forlader Kadence, uden at en person trykker [bekræftet, docs/subprocessors.md].

## 1. Kort sagt

1. Spørg holdet i denne uge: Edge-model og softwareversion, telefon, computer derhjemme, Wahoo, og hvor og i hvilket program de kører indendørs. Beskeden står klar i afsnit 8. Svarene bestemmer rækkefølgen af alt nedenfor.
2. Kablet er gulvet begge veje. Det kræver ingen nøgle fra nogen og virker på hver installation. Bygget, men ikke afprøvet på en rigtig Edge.
3. Mandag morgen har træneren kun brug for turens tal, ikke filen [bekræftet i koden]. Derfor skal rytterens besvær pr. tur ned.
4. Garmins partnerprogram er sat på pause og er kun for virksomheder. Planlæg intet på det.
5. Automatiske Garmin-ture ind betyder Tredict med rytterens egen adgangsnøgle: december, ikke november, og først efter din beslutning A-07. Intet af det er bygget i dag.
6. Wahoos adapter er bygget. Sæt den i drift, kun hvis en rytter kører med en ELEMNT, og i første omgang kun for ryttere på 18 år og derover. For ryttere under 18 skal Wahoo først svare på, om en forældrekonto er acceptabel (A-04); indtil da bruger de den manuelle vej fra Wahoo-appen.
7. Hjælpetekster pr. model, en rettet tjekliste og et dagsbudget på synkroniseringsdørene kommer før enhver ny adapter.
8. Connect IQ til pas ud er næste år: efter enhedsugen, efter din udviklerkonto, udviklingsværktøjet og en Edge i hånden, og når Connect IQ er set stabilt på 540-generationen i produktion.
9. Indendørs optager Rulle selv passet på hometraineren, uden cykelcomputer. Heller ikke Rulle har mødt en rigtig hometrainer endnu; det hører med i enhedsugen.
10. En enhedsuge uden kode kommer før ny kode.

**Det gør du først.** Spørg holdet med beskeden i afsnit 8. Lån to Edges (en 530 eller 830 og en 540 eller 840) og én ELEMNT. Afklar de åbne spørgsmål med Tredict (afsnit 4). Svar på A-07's tre akser; anbefalingen er tallene først, rytterens egen nøgle nu, og indendørs dækning efter holdets svar.

## 2. Hvorfor Garmin og Wahoo

En cykelcomputer sidder på styret og optager turen: tid, afstand, højde, puls, kadence, watt og rute. Den gemmer turen som en fil i formatet FIT. Garmins Edge-serie og Wahoos ELEMNT-serie er de vigtigste for os; det er dit udgangspunkt for dette dokument, og holdets svar (afsnit 8) bekræfter eller retter det. Polar har en adapter i koden, men denne installation har ikke sat den op.

**Hvad vi ved, og hvad vi skal spørge om.** Vinteren starter med ét hold. Ingen har spurgt rytterne, hvilken Edge de har, om den er opdateret, hvilken telefon de bruger, hvilken computer der står derhjemme, om nogen kører med Wahoo, og hvor de kører indendørs (Zwift, MyWhoosh, Rouvy eller TrainingPeaks Virtual). En Edge 530 med en familiecomputer er en helt anden vinter end en Edge 840 med en iPhone.

**Ture ind, forklaret.** Når rytteren har kørt, ligger turen som en fil på cykelcomputeren og, hvis telefonen har Garmin Connect eller Wahoo-appen, også i producentens sky. Filen skal ind i Kadence på en af fire måder: rytteren lægger den ind selv; rytteren sætter cykelcomputeren i en computer med et kabel, og Kadence henter de nye ture; en mellemstation (Tredict) henter turen fra Garmins sky og lader Kadence hente den der; eller producentens sky sender turen direkte (Wahoo efter godkendt ansøgning; Garmin kun for godkendte partnere). Inde i Kadence lander turen på dagens pas, og tallene går videre til ugens belastning, kondition, træthed og friskhed, DCU-korridoren og opmærksomhedspunkterne.

**Pas ud, forklaret.** Træneren planlægger et pas med trin: opvarmning, fire gange otte minutter ved en bestemt watt eller puls, pauser, nedkørsel. Passet skal gerne ligge på cykelcomputeren, så rytteren kan følge det på skærmen. Det kan ske over et kabel (bygget), gennem producentens sky (Garmin kræver partnernøgle, Wahoo en godkendt ansøgning) eller med en lille Kadence-app på Edge'en (Connect IQ, ikke bygget). Indendørs kører Rulle passet på hometraineren direkte fra Kadence, uden cykelcomputer.

## 3. Hvad Kadence kan i dag

Læst i koden den 11. oktober 2026. Intet er afprøvet mod en rigtig enhed eller leverandør.

| Retning  | Vej                                                                                                 | Status                                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Ture ind | Upload af FIT, TCX og GPX, også som .gz eller .zip, inklusive Garmin Connects "Export Original"-zip | I drift. Ikke afprøvet med en rytters rigtige fil.                                                                                     |
| Ture ind | "Hent fra enheden": cykelcomputeren som en mappe i browseren, kun nye ture, højst 60 pr. tryk       | I drift. Prøvet kun med en mappe på disk lagt ud som en Edge. Ikke afprøvet med en rigtig Edge, en telefon, Windows eller en MTP-Edge. |
| Ture ind | Deling til den installerede app på Android                                                          | I drift. Ikke afprøvet fra en rigtig telefon. Findes ikke på iPhone.                                                                   |
| Ture ind | Uploadnøgle pr. rytter og scriptet send-rides.sh                                                    | I drift. Prøvet på en Mac mod en Edge-lignende mappe. Ingen Windows-udgave.                                                            |
| Ture ind | Strava-arkiv i ét træk                                                                              | I drift. Ikke afprøvet med et rigtigt arkiv.                                                                                           |
| Ture ind | Rulle optager selv et indendørs pas                                                                 | I drift. Aldrig mødt en rigtig hometrainer.                                                                                            |
| Ture ind | Wahoo Cloud API (ture kommer af sig selv)                                                           | Bygget, sovende. Ingen nøgler, ingen ansøgning.                                                                                        |
| Ture ind | Garmins partner-API                                                                                 | Bygget, sovende. Programmet er sat på pause.                                                                                           |
| Ture ind | Tredict (mellemstation)                                                                             | Ikke bygget. Ingen kode, ingen række i databehandlerlisten.                                                                            |
| Pas ud   | "Send til cykelcomputer" og "Send ugens pas": FIT-fil i Garmin/NewFiles over kabel (ADR 0031)       | I drift i Chrome og Edge-browseren på en computer. Ikke afprøvet på en rigtig Edge.                                                    |
| Pas ud   | Hent filen selv (.fit, .zwo, .erg, .mrc) og kopier den                                              | I drift.                                                                                                                               |
| Pas ud   | "Send til Wahoo" (plan og pas i Wahoos sky)                                                         | Bygget, sovende. Aldrig afspillet på en ELEMNT.                                                                                        |
| Pas ud   | "Send til Garmin" (Garmins trænings-API)                                                            | Bygget, sovende. Kan ikke tages i brug.                                                                                                |
| Pas ud   | Connect IQ-app på Edge'en                                                                           | Ikke bygget. Kun en plan.                                                                                                              |

## 4. Garmin: ture ind

### Dørene

**Sat på pause, kun for virksomheder: Garmins partnerprogram.** Programmet giver partnere ture ind (Activity API) og pas ud (Training API). Dets egne spørgsmål og svar siger, at det "kun er til forretningsbrug"; ansøgningssiden viser den 11. oktober 2026 ingen formular, dens vedligeholdelsesblok er oprettet 25. marts 2026 og blev set som "Under Construction" i april; og Garmins svar pr. e-mail til ansøgere, gengivet på Garmins forum den 22. maj 2026, siger, at nye ansøgninger er "midlertidigt sat på pause", uden dato [alle bekræftet 2026-10-11]. Den rigtige formulering er "sat på pause, kun for virksomheder", ikke "lukket"; driftsvejledningen (docs/devices-setup.md §2) er blødere og bør rettes. Selv hvis programmet åbner igen, hjælper det kun den installation, der selv får en nøgle: partneraftalen (FRM-0952 Rev. B) forbyder at dele nøglen uden Garmins skriftlige tilladelse (§5.2(e)) og at sende data videre uden Garmins godkendelse (§5.2(o)) [bekræftet 2026-10-11]. Om en dansk klub tæller som "forretningsbrug", er ubekræftet. Garmin har ejet TrainingPeaks siden 22. juli 2026 [bekræftet]; et venligere program for et lille, åbent trænerværktøj er ikke sandsynligt.

**Aldrig: det uofficielle login.** Flere værktøjer logger ind hos Garmin med rytterens eget brugernavn og adgangskode. Det gør Kadence ikke, hverken på en server, på familiens computer (MyWhoosh2Garmin beder om Garmin-adgangskoden [bekræftet, programmets egen beskrivelse]) eller på telefonen (RunGap [fra noter]). Garmins vilkår, gældende fra 1. april 2026, forbyder at dele kontooplysninger og at hente indhold ad veje, Garmin ikke har åbnet [bekræftet 2026-10-11]. Dertil var loginvejen mørk fra 17. marts 2026 i 16 til 58 dage for de projekter, der kom tilbage, og to kom aldrig tilbage [fra noter]; den er set afvist fra én Hetzner-adresse, hvor Kadence kører [fra noter]; nøglen giver adgang til hele kontoen, og konti er blevet låst [fra noter].

**I dag, uden nogens nøgle, ikke afprøvet på en enhed.** Fire døre står åbne på hver installation:

1. _Kabel til en computer._ Edge'en i computeren, Kadence i Chrome eller Edge-browseren, Mig, "Hent fra enheden", vælg drevet GARMIN. Kadence beholder kun ture fra en mappe ved navn Activities (ellers hele det valgte drev), springer skjulte filer over og sender de ture, den ikke har, nyeste først, højst 60 pr. tryk [bekræftet]. Bygget til en Edge, der viser sig som et almindeligt USB-drev, og kun prøvet med en mappe på computerens egen disk lagt ud som en Edge; om den også kan åbne en MTP-Edge på Windows eller en Chromebook, er ubekræftet.
2. _Kun telefon._ Garmin Connect-appen eksporterer efter Garmins egen vejledning ingen fil: vejledningen, som Wayback-arkivet fangede den 19. september 2026, beskriver hver eksport "fra en webbrowser", og Garmins forummoderatorer skrev det samme i 2024 [bekræftet via arkivet og forum; Garmins side afviser automatisk læsning; ikke afprøvet på en telefon]. To tredjepartssider fra 2026 påstår det modsatte uden at vise trin [ubekræftet]. Vejen er browseren til connect.garmin.com, turen, tandhjulet, "Export Original", gem i Filer, åbn Kadence, upload. Ingen hjælpetekst i Kadence beskriver den; den eneste opskrift på at få en fil ud i Hjælp er Stravas.
3. _Deling på Android._ Filen deles til den installerede Kadence-app. Hvad en rigtig deling ser ud som for serveren, er aldrig set.
4. _Uploadnøgle og script._ Rytteren laver en uploadnøgle under Indstillinger → Enheder → Avanceret; et lille script på en Mac eller Linux sender nye ture fra drevet. Ingen Windows-udgave, og intet kører af sig selv, når kablet sættes i.

### Hvilken Edge, hvilken telefon, hvilken computer

Edge-modellerne deler sig i to. De ældre viser sig som et almindeligt USB-drev på enhver computer: Edge 130, 130 Plus, 530, 830, 1030 og 1030 Plus [bekræftet 2026-10-11, Garmins manualer]. De nyere bruger MTP, en overførselsmåde, som Windows forstår, en Mac ikke forstår uden Garmin Express, og som en telefon ikke får filer ud af: telefonen viser mapperne, men ingen filer [bekræftet], og Garmins support siger om en Edge 1050 og en Pixel-telefon, at kun en pc eller Bluetooth til Garmin Connect virker [bekræftet 2026-10-11]. MTP-modellerne er Edge 550, 850, 1040, 1050 og MTB ifølge manualerne, og Edge 540, 840 og Explore 2 via en softwareopdatering fra slutningen af 2024, som 1040 fik på samme måde [bekræftet 2026-10-11]. En 540, 840, 1040 eller Explore 2, der aldrig er opdateret siden, kan stadig være et almindeligt drev.

Om Chromes mappevælger kan åbne en MTP-Edge på Windows eller en Chromebook, er ubekræftet; indtil det er prøvet, må hjælpen love en kopi i Stifinder og ikke mere. En almindelig Edge på en iPhone med kabel er kun rapporteret på en iPad [fra noter]; et eksperiment til enhedsugen, ikke et løfte. Tjeklisten på Mig siger i dag til hver Garmin-rytter: "Sæt din Garmin i computeren eller telefonen med et kabel." Det lover en telefon til alle, også til MTP-modellerne [bekræftet i koden], og skal rettes pr. model før vinteren.

| Rytteren har                           | Pr. tur (skøn, intet afprøvet på en enhed)                                                                                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Almindelig Edge og en familiecomputer  | Kabel, "Hent fra enheden", vælg drevet. Ca. 3 klik.                                                                                                                                                                           |
| Almindelig Edge og en Mac med scriptet | Kabel, kør scriptet. 0 tryk i appen. Hjælp nævner ikke scriptet.                                                                                                                                                              |
| MTP-Edge og en Windows-pc              | Stifinder, kopier nye filer, upload. Ca. 5 til 8 klik. Om mappevælgeren virker direkte, er ubekræftet.                                                                                                                        |
| MTP-Edge og en Mac                     | Ingen vej over kabel. Kun hjemmesidevejen eller et tredjepartsværktøj.                                                                                                                                                        |
| Enhver Edge og kun en iPhone           | connect.garmin.com, "Export Original", Filer, upload. Ca. 8 tryk. Ikke i Hjælp.                                                                                                                                               |
| Almindelig Edge og Android             | OTG-kabel i Chrome 132 eller nyere, "Hent fra enheden", ca. 3 tryk; eller del filen til appen, 3 tryk. Chromes udgivelsesnote siger, at mappevælgeren kom til Android i 132; caniuse siger stadig nej [bekræftet 2026-10-11]. |

### Tredict: den ene mellemstation, der tager ryttere fra 14 år

Tredict er en træningstjeneste fra Hamburg, der henter ture fra Garmin Connect, Zwift (14. juli 2026) og Rouvy (7. oktober 2026) [bekræftet 2026-10-11], efter egen liste også fra Wahoo og flere [fra noter], og lader et andet program hente dem videre. Operatøren er en enkeltperson; serverne står hos Hetzner i Tyskland og hos netcup, hvis servere står i Østrig [bekræftet 2026-10-11]. Vilkårene, gældende fra 25. september 2026, retter sig til personer fra 14 år; under myndighedsalderen forsikrer man, at en forælder har godkendt vilkårene [bekræftet]. Rytteren har altså en konto i eget navn. Tredict er den eneste af de undersøgte mellemstationer i EU, hvis vilkår tager ryttere fra 14 år, og hvis grænseflade lader rytteren selv give Kadence en adgangsnøgle uden godkendelse pr. installation [bekræftet].

Tredict har bekræftet mere, end dokumentationen siger: begynd med rytternes egne personlige adgangsnøgler, og skift til en egentlig klientforbindelse, hvis vinteren lykkes; listen over ture kan læses uden betalt konto, men den originale fil kræver fuld adgang; at spørge hvert kvarter er fint, med omkring to filer i sekundet; der er ingen betingelser for ture, der er kommet fra Garmin; information til forældre og databeskyttelse er Kadences ansvar [bekræftet af Tredict]. Disse spørgsmål til Tredict er åbne: om listen med udvidede tal svarer for en rytter uden fuld adgang; om Tredict giver en klient til et AGPL-projekt pr. installation; om klientforbindelsen også følger 14-dages-reglen; om filen kræver fuld adgang under en klientforbindelse; hvordan en klientforbindelse kender kontoens identitet; om Zwift- og Rouvy-ture står på listen; og om Tredicts aftale med Garmin dækker, at Garmin-ture sendes videre til Kadence (se risici i afsnit 8).

**Sådan ville de to varianter virke (ikke bygget, P2-01).**

|         | Rytterens egen nøgle                                                                                                                                                                                                       | Klientforbindelse                                                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Én gang | Rytteren ville oprette en Tredict-konto, forbinde Garmin Connect der, lave en nøgle under Personal API og sætte den ind under Indstillinger → Enheder i Kadence. Ca. 5 til 8 tryk hos Tredict og 3 til 5 i Kadence (skøn). | "Forbind Tredict", log ind, tillad. Ca. 3 tryk.                                                             |
| Pr. tur | 0 tryk. Kadence ville spørge Tredict hvert kvarter.                                                                                                                                                                        | 0 tryk.                                                                                                     |
| Søvn    | Nøglen sover efter to uger uden login på Tredicts hjemmeside og vågner ved næste login [bekræftet 2026-10-11]. Kortet i Kadence skulle kunne sige "Log ind på Tredict igen".                                               | Ingen dokumenteret søvn. Om klientnøgler er undtaget, er ubekræftet.                                        |
| Status  | Tredicts egen anbefaling.                                                                                                                                                                                                  | Ikke tildelt. Tredict angiver nøglens levetid i et felt, Kadences kode ikke læser (expires_at) [bekræftet]. |

Ingen af delene findes i Kadence i dag.

**Pris.** To måneders fuld adgang gratis, derefter 49 dollar forudbetalt for 12 måneder (399 kr. i landelisten; 49 euro i eurozonen) [bekræftet 2026-10-11]. En træner kan i stedet tildele fuld adgang i enheder af mindst tre måneder fra pakker på 12, 60, 120 eller 240 måneder, hvor de tre største giver 3, 5 eller 10 procent rabat, og 12-måneders-pakken koster det samme som rytterens eget forudbetalte år [bekræftet 2026-10-11]. Et regneeksempel: ti ryttere fra november til marts er to gratis måneder plus én tre-måneders enhed pr. rytter: 30 måneder, altså tre 12-måneders pakker, i runde tal 150 euro (3 × 49 euro) i alt. Om enheder kan tildeles en konto under 18, er ikke læst. Eller ingenting, hvis den gratis liste bærer ugen. Tredict kan begrænse ekstern læsning uden en betalt periode [bekræftet].

**Hvad der kommer igennem.** En mellemstation får Garmins filtrerede fil, ikke den fil, hjemmesiden eksporterer (intervals.icu, 12. marts 2026) [bekræftet]; watt, puls, GPS og kadence overlever [bekræftet, en bro-udviklers beskrivelse]. Samme tur i hånden og via Tredict er derfor to filer med samme startsekund; Kadence afviser i dag nummer to som dublet, men kun for de fire kendte kilder [bekræftet]. Garmin sender ikke ture videre, som et andet program (Zwift, MyWhoosh, Rouvy) har synkroniseret til Garmin Connect [bekræftet, Garmins medarbejder på forum]. En fil, rytteren selv lægger ind på Garmin Connects hjemmeside, sendes dog videre ifølge Garmins udviklerblog [ubekræftet, kun set i søgeuddrag]; apps' egen synkronisering gør ikke. Tredict henter Zwift (14. juli 2026) og Rouvy (7. oktober 2026) direkte; MyWhoosh og TrainingPeaks Virtual står ikke på Tredicts liste eller i ændringsloggen pr. 11. oktober 2026 [bekræftet].

### Garmins aldersregel

Garmins privatlivspolitik sagde i 2022-udgaven (arkiveret maj og august 2022), at personer under 16 uden for USA ikke skulle give personoplysninger [bekræftet via arkiv]; hvornår sætningen forsvandt, er ikke læst. Versionen "sidst opdateret 9. januar 2026" siger i stedet, at børn fra 8 år må give oplysninger med bekræftet forældresamtykke, og at "barn" alt efter land betyder under 13 til under 18 [bekræftet 2026-10-11]. Hvad der sker, når en 15-årig i Danmark opretter en konto, er ikke afprøvet. Hvilken konto en U17-rytters Garmin, og dermed en Tredict-forbindelse, sidder på, kan holdet selv svare på.

### Tal eller fil

Den vigtigste enkelte iagttagelse for Garmin. Alle ugens og sæsonens visninger (kalenderen, belastning, kondition, træthed og friskhed, DCU-korridoren, alle tolv opmærksomhedspunkter, forældrenes uge) bruger kun turens tal: dato, sport, tid i bevægelse, afstand, belastning, oplevet anstrengelse og starttid [bekræftet 2026-10-11 i koden]. Filen føder kun turens egen side (kort, kurver, omgange, zonetider, effektkurve) og effekt-metoden i belastningsberegningen, som kræver en sekund-for-sekund strøm eller en vægtet effekt; Tredicts dokumenterede liste (den ender med "etc.") og en Connect IQ-apps data har ingen vægtet effekt, Wahoos besked har [bekræftet 2026-10-11]. Svarer Tredicts gratis liste for alle ryttere, kunne ugen, korridoren og opmærksomhedspunkterne køre på tallene, med belastning fra puls eller oplevet anstrengelse, mens filen kommer senere eller aldrig. Det kræver en ny indlæsning af tal: en ny kildetype, opgradering på stedet, når filen dukker op, og en dublet-regel efter startsekund. Størrelse M; venter på Tredicts svar. I dag kræver hver tur ind selve filen [bekræftet].

## 5. Garmin: pas ud

### Kablet i dag

"Send til cykelcomputer" på et pas og "Send ugens pas til cykelcomputeren" på Mig skriver en FIT-fil med passet i mappen Garmin/NewFiles på en Edge, der er sat i en computer (ADR 0031). Det virker i Chrome og Edge-browseren på en computer og, ifølge Chromes egen udgivelsesnote, i Chrome 132 og nyere på Android [bekræftet]. I Safari, Firefox og på hver iPhone viser knappen en liste med filer at hente og kopiere selv. Kadence sletter intet på enheden og skriver kun filer med sit eget navnemønster [bekræftet]. Hvert felt og hver kode i FIT-filen er den 11. oktober 2026 holdt op mod Garmins offentliggjorte FIT-profil, og alt stemmer [bekræftet]. Passet hedder dagen først ("29.09 Tempo", "29.09-2" for dagens andet pas), så to pas ikke overskriver hinanden; de fleste Garmin-enheder viser de første 15 tegn [fra noter]. Et trin uden watt eller puls får målet med ord i noten. Et pausetrin skrives med koden "rest"; Garmins profil har også koden "recovery", som en Edge måske viser anderledes. Det er et valg, ikke en fejl, og ikke afprøvet.

Ikke afprøvet: om Edge'en tager filerne ind fra NewFiles, når kablet tages ud; 15-tegnsreglen; om noten og kadence-målet vises; om 530/830 og 540/840 opfører sig ens. Testen i koden bruger en mappe i hukommelsen, ikke "browserens eget private filsystem", som TECH-DEBT.md skriver [bekræftet]. For MTP-modellerne er vejen: hent filerne, kopier dem i Stifinder på Windows; en Mac har ingen vej. Hjælpeteksten nævner 540, 840, 1040 og 1050, men ikke 550, 850, Explore 2 og MTB [bekræftet]. Pr. uge, skøn: kabel i Chrome omkring tre klik plus kabel og "skub ud"; hent selv: seks til ti handlinger. Garmin Connect tager ingen pas-fil ind [fra noter].

### Connect IQ-appen, næste skridt

Garmin lader udviklere lave små apps til Edge'en gennem Connect IQ. Sådan en app kan hente en FIT-fil med et pas fra en adresse på nettet, gemme den som et pas på enheden og starte Garmins egen afspiller med det [bekræftet 2026-10-11, Garmins egne beskrivelser]. Garmins liste over enheder, der understøtter gemte pas (PersistedContent.Workout), omfatter Edge 520, 520 Plus, 530, 540, 550, 820, 830, 840, 850, 1000, 1030, 1030 Plus, 1040 og 1050, men ikke Edge 130, 130 Plus, Explore 2 og MTB [bekræftet 2026-10-11, Garmins API-dokumentation; ikke afprøvet på en Edge]. Rytteren installerer appen én gang med Kadences adresse og en nøgle og trykker derefter efter vores skøn to til fem gange på Edge'en pr. pas (åbn appen, vælg passet, hent og start; ikke afprøvet), med telefonen eller Wi-Fi i nærheden: ingen computer, intet kabel, intet tryk i Kadence. Appen taler kun med rytterens egen Kadence-server, så en klub, der selv kører Kadence, får det samme. Uploadnøglen kan kun lægge ture ind og intet læse [bekræftet], så appen kræver en ny nøgletype, der må læse rytterens egne næste pas.

Garmins udvikleraftale (6. august 2024) kræver en udvikler på mindst 18 år og en privatlivspolitik og lader Garmin fjerne en app "af enhver grund"; intet udelukker AGPL [bekræftet 2026-10-11]. Gennemgangen er færdig inden for 72 timer ifølge Garmins udgivelsesside [bekræftet 2026-10-11]. Udviklingsværktøjet (9.2.0, 6. oktober 2026) [bekræftet] koster efter alt at dømme intet [ubekræftet; siden er læst for aftalen og versionen, ikke for en pris]; butiksgebyrer er ubekræftede. Ingen åben kildekode viser et cykelpas startet sådan på en Edge; det nærmeste eksempel kører kun på ure [bekræftet]. Der findes ingen Connect IQ-kode i Kadence.

Et advarselstegn: en brugers fejlmelding på betaversion 31.61 til Edge 540, 840 og 1040 (Connect IQ-apps og datafelter går ned) har stået som "Under Review" siden 18. september 2026 uden svar fra Garmin; ingen betaversion til og med 31.64 (7. oktober 2026) nævner den, og produktionsversion 31.30 havde en tråd med et lignende symptom [bekræftet 2026-10-11]. Det er én melding på en beta, ikke en bekræftet fejl. Enhedsugen skal vise, om Connect IQ-apps kører stabilt på en opdateret 540 eller 840, som også er den generation, kablet ikke når fra en Mac.

Appen er derfor næste år, og grunden er det, der mangler: enhedsugen først, så en udviklerkonto i dit navn, udviklingsværktøjet på din Mac, en Edge at prøve på, et valg af licens, en privatlivspolitik og en nøgletype, der må læse. Dertil skal Connect IQ være set stabilt på 540-generationen i produktion. Connect IQ kan ikke læse FIT-filer på enheden [bekræftet, Garmins forum]; en app kan derfor aldrig sende turen ind, højst et lille sammendrag af tal, og det kræver indlæsningen af tal først.

### Hvad Garmins eget program ville give, og hvorfor ikke nu

Med en partnernøgle ville træneren trykke én gang, og passet ville ligge i rytterens Garmin Connect-kalender og gå til Edge'en via telefonen, som hos TrainingPeaks. Koden er skrevet [bekræftet], men programmet er sat på pause, nøglen må ikke deles, og vi ved ikke, om kaldene passer, fordi beskrivelsen kun udleveres til godkendte partnere [bekræftet]. Selv med nøgle gemmer afsendelsen intet om, hvad den sendte, og sender ved hvert tryk passet igen uden eget id [bekræftet]; om Garmin så viser to pas eller erstatter det første, er ubekræftet, fordi beskrivelsen kun udleveres til godkendte partnere. Driftsvejledningen (§7) lover stadig pas til en forbundet Garmin; ADR 0057 fjernede det løfte fra enhedssiden, og vejledningen skal følge med.

## 6. Wahoo: ture ind og pas ud

### Adapteren og ansøgningen

Wahoos sky-grænseflade er åben for ansøgning. En udvikler opretter sig på developers.wahooligan.com med en Wahoo-konto; en ansøgning står som "afventer godkendelse" også for et testmiljø, og hvor længe det tager, er ubekræftet [bekræftet 2026-10-11]. Testmiljøet giver 25 kald pr. fem minutter, 100 i timen og 250 om dagen; produktion (200, 1.000 og 5.000) kræver Wahoos gennemgang, og et testmiljø kan ikke senere blive til produktion [bekræftet]. Aftalen binder én nøgle til én applikation, så hver installation af Kadence ansøger selv [bekræftet, slutning fra aftalens ordlyd].

Kadences Wahoo-adapter (27. september 2026) svarer til Wahoos offentlige beskrivelse, læst 11. oktober 2026: rettighederne, den sikre login-variant (PKCE), beskeden fra Wahoos sky kontrolleret i konstant tid, og turens fil hentet uden rytterens nøgle, så en udløbet nøgle aldrig stopper ture ind [bekræftet]. Tre ting kan kun en kørsel i testmiljøet afgøre: hvilken server filerne ligger på (Wahoos eksempel er en pladsholder, og en anden server ville få hver import til at fejle lukket); om Wahoo tager imod en hemmelighed og en PKCE-kode i samme kald ved udvekslingen, og om fornyelsen, som Kadence sender med hemmelighed men uden PKCE-kode, godtages (Wahoos PKCE-variant kræver koden også ved fornyelse); og om kaldet må sendes som formular i stedet for i adressen [bekræftet]. Adapteren har aldrig svaret på en rigtig forespørgsel [bekræftet]; intet tyder på, at et testmiljø er oprettet (tomme nøglefelter i .env.example), men det kan kun et login i portalen afgøre [ikke bevist]; og ansøgningen A-04 er ikke skrevet [bekræftet].

**Hvad Wahoo deler.** Kun ture optaget af en Wahoo-enhed eller Wahoos egne apps (ELEMNT, RIVAL, SYSTM, Wahoo-appen); ture fra tredjepartsapps kommer ikke igennem [bekræftet 2026-10-11 for ordlyden "tredjepartsapps"; at det rammer Zwift, MyWhoosh og Rouvy, er vores slutning]. Om en KICKR-tur optaget i Wahoo-appen udløser en besked, er ikke afprøvet, selvom enhedsteksten lover det. Beskeden fra Wahoos sky bærer også en vægtet effekt for turen, som belastningens effekt-metode kunne bruge uden filen; Kadence gemmer i dag kun id, filens adresse og navnet [bekræftet]. Feltet bærer i Wahoos besked et navn, der er TrainingPeaks' varemærke; i Kadence hedder tallet vægtet effekt, og navnet fra beskeden vises aldrig. Wahoo sender ingen besked, når en rytter trækker Kadences adgang tilbage: ture ind bliver tavse, og en afsendelse viser "fejl", aldrig "trukket tilbage" [bekræftet].

**Pas ud, bygget.** "Send til Wahoo" lægger passet som en plan og et pas på dagen i Wahoos sky. Wahoo viser kun en plan på ELEMNT'en, når passet ligger fra i dag til seks dage frem [bekræftet]. Kadence gemmer intet om, hvad den sendte, og kan hverken rette eller slette, så et ændret pas bliver et nyt pas ved siden af det gamle [bekræftet; ikke afprøvet]. Før en træner sender pas ugentligt, skal hver afsendelse registreres (pas, tjeneste, Wahoos id, tidspunkt, sidste fejl) med ret og slet. Ingen kabelvej fra Kadence til en ELEMNT er bygget; Wahoo skriver (15. juli 2026), at filer kan kopieres i mappen "plans" i hånden, men at appen ikke holder styr på dem [bekræftet]; ikke afprøvet.

### 18 år, og hvad det betyder for forældre

Wahoos vilkår for EU (gældende fra 5. december 2023) kræver, at brugeren er mindst 18 år og kun har én konto; der er ingen ordning for mindreårige [bekræftet 2026-10-11]. Wahoos hjælpeside om børnekonti (19. juli 2024) svarer det samme [bekræftet]. Privatlivspolitikken (28. marts 2024) siger, at hjemmesiden ikke er til børn under 16, og at oplysninger opbevares i USA [bekræftet]. En rytter på 15 til 17 år på en forælders konto er derfor uden for Wahoos vilkår, samtykket til Kadence er forælderens, og forælderen skal selv logge ind hos Wahoo, når rytteren forbinder. Wahoos én-konto-regel og Kadences regel om én rytter pr. Wahoo-konto betyder, at to søskende ikke begge kan forbindes [bekræftet]. En trænerberetning fra juni 2026 om, at Wahoo ikke sender puls videre for ryttere under 16, bygger på én forumtråd med Strava som mulig forklaring og er ubekræftet. Ansøgningen skal derfor først spørge, om en forældrekonto brugt af en mindreårig er acceptabel for Wahoo, og dernæst om puls under 16. Indtil Wahoo svarer, sættes skyen kun i drift for ryttere på 18 år og derover; ryttere under 18 bruger den manuelle vej fra Wahoo-appen nedenfor. Databehandlerlisten nævner USA, men ikke 18 år; Hjælpen og enhedssiden nævner ingen af delene [bekræftet].

### De manuelle veje, uden nogens nøgle

I Wahoo-appen: Historik, turen, de tre prikker, "Del aktivitet", "Download .fit activity", derefter telefonens delingsmenu (vejledning 8. september 2026) [bekræftet]. På Android deles filen til Kadence-appen: tre tryk, ikke afprøvet. På iPhone gemmes den i Filer og lægges ind via upload: fire til fem tryk. Over kabel er hver ELEMNT en MTP-enhed med en mappe "exports"; på ACE, BOLT 3 og ROAM 3 skal to kontakter først slås til i appen (vejledning 15. juli 2026) [bekræftet]; på ELEMNT, BOLT 1 og ROAM 1 nås mappen med Stifinder eller et MTP-værktøj (vejledning 23. august 2025) [bekræftet]; BOLT 2 og ROAM 2 er ikke læst i en vejledning [ubekræftet]. Vejen er "kopier, så upload", og ingen af vejene står i Hjælp. Wahoos automatiske deling til Dropbox eller e-mail er ude: Dropbox kræver 16 år nu [fra noter] og 18 år fra 1. januar 2027 [bekræftet] med opbevaring i USA, og Kadence tager ikke imod e-mail [bekræftet].

## 7. Hvad "bedst" betyder for os

**Det, TrainingPeaks og de andre har.** TrainingPeaks, intervals.icu, Tredict, JOIN og Athletica står alle på en godkendt plads pr. operatør i Garmins partnerprogram, og de fire første også på en godkendt app hos Wahoo (Athletica når efter en ubekræftet kilde Wahoo via intervals.icu). Rytteren forbinder én gang og gør intet pr. tur. TrainingPeaks sender de næste 15 dages pas til Garmin løbende (7. september 2026), intervals.icu omkring en uge, JOIN kun dagens pas og inden for sekunder efter en ændring [bekræftet 2026-10-11]. Deres dokumenterede nødvej, når synkroniseringen er nede, er ord for ord Kadences kabelvej: Garmin Connect, "Export Original", træk filen ind; hent passet som .fit og kopier det i enhedens mappe over USB [bekræftet].

**Det, vi ikke kan få.** Garmins partnerplads: sat på pause, kun for virksomheder, nøglen må ikke deles. Den strukturelle grund er ikke kode, men stilling: de andre er lukkede tjenester, der kun kører hos dem selv, med én nøgle hver; Kadence er AGPL og kan køres af enhver klub. Kun veje, der ikke kræver nogens nøgle (filer, kabel, uploadnøgle, en Connect IQ-app mod rytterens egen server, en mellemstation med rytterens egen nøgle), virker på hver installation den dag, de er bygget. Alt, de andre gør automatisk udad, strider desuden mod et løfte, vi har skrevet: et pas går kun ud, når en person trykker [bekræftet, docs/subprocessors.md]. En rullende synkronisering som deres kræver en ny ADR.

**Aldersgrænserne afgør mere end teknikken.** Kun to af de undersøgte tager en 15-årig i eget navn med en forælders samtykke: TrainingPeaks (børnekonto under 16 med forælderens e-mail-samtykke [fra noter]) og Tredict. intervals.icu er 18 år efter sin skriftlige privatlivspolitik [fra noter]; JOIN er 18 år, hvor en forælder kan oprette kontoen og lade barnet bruge den (vilkår 9. oktober 2026) [bekræftet]; Athletica kræver forældresamtykke for 13 til 18 år [bekræftet]; Wahoo er 18 år uden nogen ordning for mindreårige [bekræftet]. Tredict (14 år med forældregodkendelse) er den eneste af de undersøgte mellemstationer i EU, der både tager rytteren og lader rytteren selv række Kadence en nøgle [bekræftet]. Cycling Analytics tager 13-årige, men under australsk lov og uden oplyst serverplacering [bekræftet]; Nolio forbyder, at et program samler brugernes egne nøgler [fra noter]. Aggregatorer koster i størrelsesordenen 300 til 500 dollar om måneden pr. installation [fra noter]; Terra tager 499 dollar om måneden, 399 ved årlig betaling, uden gratis niveau [bekræftet 2026-10-11].

**Dogmerne, der bestemmer.** AGPL og intet, der kun virker hos os. Ingen sky-nøgle som forudsætning. EU eller egen drift: Tredict er i Hamburg; Wahoo og Garmin er i USA og står som tjenester, rytteren selv vælger. Intet sendes uden et tryk. Intet vises frem, før det har kørt en rigtig vinter.

## 8. Anbefaling

### Rækkefølgen

| #   | Hvad                                                                                                                                                                                                                                       | Størrelse | Hvem   | Afhænger af                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------ | ------------------------------------------------------------------------------------------------- |
| 1   | Spørg holdet med beskeden nedenfor: Edge-model og softwareversion, telefon, computer derhjemme, Wahoo, indendørs program                                                                                                                   | S         | Martin | intet                                                                                             |
| 2   | Enhedsuge uden kode: Mac, Windows, Android og iPhone; en MTP-Edge i Chromes mappevælger på Windows; NewFiles kørt på 530/830 og 540/840; en Wahoo-deling fra en rigtig Android; Rulle på en rigtig hometrainer (P1-06)                     | S         | Martin | 1                                                                                                 |
| 3   | Hjælp pr. model og kilde: tjeklistens kabelsætning, MTP-sætningen med 550, 850, Explore 2 og MTB, driftsvejledningens §2, §3 og §7, TECH-DEBT, den tavse grænse på 20 filer, Wahoos 18 år i Hjælp, på enhedssiden og i databehandlerlisten | S         | Claude | 2                                                                                                 |
| 4   | Dagsbudget på mappe-, delings- og nøgledørene, og Rulle ud af den fælles spand; et tidspunkt i "prøv igen"-teksten                                                                                                                         | S         | Claude | intet                                                                                             |
| 5   | Afklar de åbne spørgsmål med Tredict, også om Garmins §5.2(o); beslut A-07; ret P2-01's forudsatte ja                                                                                                                                      | S         | Martin | intet                                                                                             |
| 6   | Indlæsning af tal: ny kildetype, opgradering på stedet, dublet efter startsekund                                                                                                                                                           | M         | Claude | 5 og Tredicts svar                                                                                |
| 7   | Tredict-adapter med rytterens egen nøgle: sovende tilstand, række i databehandlerlisten, ADR                                                                                                                                               | L         | Claude | 5, 6                                                                                              |
| 8   | Send A-04 (spørg om forældrekonti og puls under 16 først); opret appen i Wahoos testmiljø; i drift kun for ryttere på 18 år og derover, indtil Wahoo svarer                                                                                | S         | Martin | 1 og en Wahoo-rytter                                                                              |
| 9   | Prøvekørsel i testmiljøet med en lånt ELEMNT; så registrering af afsendelser med ret og slet; ADR                                                                                                                                          | M + M     | begge  | 8                                                                                                 |
| 10  | Windows-udgave af send-rides.sh (PowerShell)                                                                                                                                                                                               | M         | Claude | 1 og hjem med Windows og en almindelig Edge                                                       |
| 11  | Connect IQ-app til pas ud: plan, ADR, licens, læsenøgle                                                                                                                                                                                    | L         | begge  | 2, udviklerkonto, udviklingsværktøj, en Edge, Connect IQ stabilt på 540-generationen i produktion |

Punkt 3 og 4 kan bygges på en gren med det samme; de kræver ingen af svarene.

### Det, du gør selv

Spørg holdet og lån enheder. Beskeden til holdet kan sendes, som den står:

> Hej alle. Jeg skal bruge seks svar fra hver rytter, så vinterens Kadence passer til jeres udstyr. Svar gerne i én besked.
>
> 1. Edge-model (fx Edge 530 eller 840), eller ingen Edge.
> 2. Softwareversion på Edge'en (står under Indstillinger → System → Om).
> 3. Telefon (model).
> 4. Computer derhjemme (Mac, Windows eller ingen).
> 5. Wahoo (model), eller ingen.
> 6. Indendørs app (Zwift, MyWhoosh, Rouvy, TrainingPeaks Virtual eller ingen).

Afklar de åbne spørgsmål med Tredict (afsnit 4). Svar på A-07's tre akser og ret P2-01, hvis prompt siger, at du allerede har sagt ja, mens A-07 står som "ikke startet" [bekræftet]. Har holdet en Wahoo-rytter: send A-04 og log ind i Wahoos udviklerportal. Til Connect IQ: en Garmin-udviklerkonto i eget navn, udviklingsværktøjet, en Edge, et valg af licens og en privatlivspolitik. Et brev til Garmin efter dataforordningen giver kun mening med en frivillig rytter og forælder og som et langt skud; ingen har vundet en løbende datastrøm fra en træningsenhed ad den vej [fra noter].

### Hvad det koster

| Vej                                | Rytter eller hold                                                                                                                                                                                                                             | Pr. tur (skøn, ikke afprøvet)                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Kabel, upload, deling, uploadnøgle | Ingenting. Familien skal have Edge'ens kabel og, for en MTP-Edge, en Windows-pc.                                                                                                                                                              | Almindelig Edge ca. 3 klik; MTP-Edge en kopi i Stifinder; kun iPhone ca. 8 tryk. |
| Tredict (ikke bygget)              | To gratis måneder, derefter 399 kr. pr. rytter pr. 12 måneder, eller trænertildelte tre-måneders enheder. Regneeksempel med ti ryttere november til marts: omkring 150 euro (se afsnit 4), eller ingenting, hvis den gratis liste bærer ugen. | 0, når adapteren er bygget. Et login på tredict.com hver 14. dag.                |
| Wahoo Cloud API                    | Intet gebyr læst [ubekræftet]. En BOLT 3 kostede 2.048 kr. (29. september 2026) [fra noter].                                                                                                                                                  | 0. Wahoo-appen uden nøgle: 3 til 5 tryk.                                         |
| Connect IQ (ikke bygget)           | Udviklingsværktøjet koster efter alt at dømme intet [ubekræftet]; butiksgebyrer ubekræftede.                                                                                                                                                  | 2 til 5 tryk på Edge'en pr. pas.                                                 |

### Risici, og hvad der ville ændre rådet

- **Holdets udstyr.** Har alle en 530 eller 830 og en familiecomputer, er kablet vinteren, og Tredict er valgfri. Har de fleste en MTP-Edge og en iPhone, kommer Tredict lige efter hjælpeteksterne. Er der ingen Wahoo-rytter, er A-04 næste års brev. Kører de MyWhoosh eller TrainingPeaks Virtual indendørs, når Tredict ingen af dem; mappevejen gør.
- **Tredict.** Kræver de udvidede tal betaling, er det filen først, 399 kr. pr. rytter, og indlæsningen af tal venter. Giver Tredict en klientforbindelse pr. installation, skal Kadences kode læse levetidsfeltet; den sovende tilstand kan kun udelades, hvis Tredict bekræfter, at klientnøgler er undtaget [ubekræftet]. Garmins partneraftale forbyder at sende data videre til apps uden Garmins skriftlige godkendelse (§5.2(o)) [bekræftet]. Om Tredicts aftale dækker videregivelse til Kadence, ved vi ikke; intervals.icu's API-vilkår viser, at Garmin tillader det på betingelser (kildeangivelse) [fra noter]. Det er et af de åbne spørgsmål til Tredict (afsnit 4).
- **Garmin.** En app i butikken kan fjernes "af enhver grund". Viser enhedsugen, at Connect IQ-apps går ned på en opdateret 540 eller 840, er appen uden mening for den generation, indtil Garmin retter det. Åbner partnerprogrammet, gavner det kun installationer med egen godkendt nøgle, og en ansøgning, der kun hjælper kadence.haij.dk, kræver en ADR mod dogme to. Kablet bliver gulvet uanset.
- **Wahoo.** Godkendelse er Wahoos skøn. Indtil Wahoo har svaret på spørgsmålet om forældrekonti, er skyen kun for ryttere på 18 år og derover, og de under 18 bruger den manuelle vej. Et nej gør det til vinterens ordning.
- **Grænserne.** De tælles i hukommelsen pr. proces og nulstilles ved genstart; 300 ture over kabel er fem tryk med en times mellemrum, indtil punkt 4 er bygget [bekræftet]. Gemmer rytteren en Rulle-tur i samme time, som 60 ture er hentet fra enheden, afvises Rulle-turen (samme spand); den må lægges ind igen en time senere [bekræftet]. Indendørssæsonen er netop der, hvor begge dele sker.

## 9. Det gør vi ikke, og hvorfor

- **Det uofficielle Garmin-login, nogensinde.** I nogen form: server, familiecomputer, telefon. Det bryder Garmins vilkår, er ustabilt, giver adgang til hele kontoen, og det strider mod dogmerne og ADR 0029.
- **En Garmin-partneransøgning i rytternes navn.** Programmet er sat på pause og er kun for virksomheder; en nøgle ville kun gavne én installation.
- **En Bluetooth-forbindelse fra Edge'en til browseren, og en Gadgetbridge-efterligning.** Kræver 2.000 til 3.000 linjer, ét parret telefon ad gangen, og det er aldrig set virke med en 530 eller 830 [fra noter]. Tidligst næste vinter.
- **Connect IQ til ture ind.** Appen kan ikke læse FIT-filer; højst et sammendrag af tal, og det efter indlæsningen af tal og appen til pas ud.
- **Dropbox og en e-mail-dør.** Dropbox er 18 år fra 2027 med opbevaring i USA; en e-mail-dør ville være Kadences første e-mail-databehandler.
- **Aggregatorer.** I størrelsesordenen 300 til 500 dollar om måneden pr. installation [fra noter]; Terra tager 499 dollar om måneden, 399 ved årlig betaling, uden gratis niveau [bekræftet 2026-10-11].
- **En rullende synkronisering af pas 7 til 15 dage frem som de andres.** Databehandlerlisten lover et tryk. Det kræver en ADR, før det overvejes.
- **At vise noget frem, før det har kørt vinteren.** Dogme syv.

## Bilag A: Teknisk oversigt

Alt læst 11. oktober 2026 på main (acc23a7). Ingen af adapterne har svaret på en rigtig forespørgsel.

**Adaptere og moduler (src/modules/devices/).** wahoo.ts (login med PKCE, bruger-id, besked fra skyen, filhentning, afsendelse af plan og pas; af beskeden gemmes kun id, filens adresse og navnet), wahoo-plan.ts (passet som Wahoos plan.json: watt som brøk af tærskel med tærsklen i hovedet, puls som absolutte slag, gentagelser som antal minus én), garmin.ts og garmin-workout.ts (Garmins offentlige PKCE-specifikation, ping-beskeder uden signatur, filhentning med rytterens nøgle, afsendelse til trænings-API'et; bruger-id og ping-form fra 2019-specifikationen, trænings-API'et fra partneres beskrivelser), polar.ts, providers.ts (PROVIDER_IDS = wahoo, garmin, polar; configuredProviders viser kun tjenester med nøgler), connect.ts (forseglet tilstandscookie i 10 minutter, kun en rytter kan forbinde), oauth.ts (læser kun expires_in; Tredicts expires_at læses ikke), links.ts (forseglede nøgler, fornyelse ved brug med 10 minutters margen; to samtidige fornyelser er ikke serialiseret), webhooks.ts (svarer 200 før arbejdet, 600 kald pr. minut pr. adresse, 256 KB, 50 hændelser; "trukket tilbage" sættes kun ved en afmeldingshændelse, som Wahoo aldrig sender), push.ts (kun rytter eller træner, kun cykelpas med trin, kun forbundet link; gemmer intet; ingen ret eller slet), import.ts (importFitIn kræver bytes, hasher, afkoder, skriver altid en række i activity_files, dublet efter hash og efter startsekund for kilderne fit, wahoo, garmin, polar), ingest.ts og ingest-request.ts (uploadnøgledøren), upload-keys.ts (nøgle "kad_" plus 43 tegn, kun hash gemmes, højst 5 pr. rytter, 10 oprettet i timen), share.ts (delingsdøren, kun rytter, samme oprindelse eller "none"), archive.ts (Strava-arkiv).

**Filer og eksport.** src/modules/files/device-folder.ts (beholder ture fra en mappe ved navn activities eller activity, uanset store og små bogstaver, ellers hele det valgte drev; skjulte filer springes over, dybde 4, 1.000 filer), src/components/activities/read-device-folder.ts (showDirectoryPicker eller webkitdirectory, SHA-256 i browseren, /api/activities/known i bundter af 500; svarer /known ikke, sendes alle, og serveren fanger dubletter), fit-upload.tsx (60 pr. tryk fra enheden, 20 ved håndplukning uden besked, 3 pr. kald), src/components/session/send-to-device.ts (vælger med readwrite og id "kadence-device", finder eller opretter Garmin/NewFiles, skriver kun Kadence-navngivne .fit, sletter intet), src/modules/workouts/export/fit-workout.ts (felter og koder stemmer med Garmins FIT-profil: workout 4/5/6/8/11/17, workout_step 0 til 8 og 19 til 22, filtype 5, producent 255, varighed 0/5/6, mål 1 til 4, intensitet 0 til 3, forskydninger 100 slag og 1.000 watt; serienummer FNV-1a pr. version), names.ts (dag først), scripts/send-rides.sh (POSIX sh og curl, nøgle fra ~/.kadence-key via curl-konfiguration på stdin, kun https, kun activities-mappen, nyeste først, .sent-hukommelse, stop ved 401, vent ved 429 op til tre gange og højst 900 sekunder).

**Ruter i Kadence.** POST /api/activities/upload (3 filer, 25 MB hver), POST /api/activities/known, POST /api/share, POST /api/ingest (Bearer kad_…; GET svarer 200 eller 401), POST /api/activities/archive, POST /api/rulle/ride (5 MB), GET /api/sessions/[id]/export?format=fit|zwo|erg|mrc (300 i timen pr. person), /api/devices/[provider]/connect, /callback og /webhook.

**Leverandørernes adresser.** Wahoo: api.wahooligan.com/oauth/authorize og /oauth/token, GET /v1/user, POST /v1/plans, POST /v1/workouts, DELETE /v1/permissions; filer antages på cdn.wahooligan.com (kun bekræftet for plan- og rutefiler). Garmin: connect.garmin.com/oauth2Confirm, diauth.garmin.com/di-oauth2-service/oauth/token, apis.garmin.com/wellness-api/rest/activityFile, training-api/workout og training-api/schedule. Tredict (ikke bygget): GET /api/oauth/v2/activityList og GET /api/oauth/v2/activity/file/{id} [bekræftet 2026-10-11, tredict.com/blog/oauth_docs/]; personlige nøgler som bearer mod den almindelige API [bekræftet, Tredicts FAQ]; dokumentationens grænser: upload 8, download 10 og token 20 kald i sekundet [bekræftet]; Tredict foreslår højst 2 filer i sekundet [bekræftet af Tredict].

**Tabeller.** device_links (RLS, unik på provider og external_user_id, forseglede nøgler; SECURITY DEFINER device_link_owner til beskeder udefra), upload_keys (upload_key_owner som eneste definer, svarer intet for en arkiveret rytter), activities (kildetjek: fit, wahoo, garmin, polar, manual; ingen "summary" eller "tredict"), activity_files. En Tredict-adapter ville kræve en ny definer til forfaldne links på RLS-listen og bruge ti-minutters-timeren i src/modules/push/timer.ts (ADR 0060) som planlægger.

**Mapper på enhederne.** Garmin: Garmin/Activities (ture), Garmin/NewFiles (pas ind), Workouts; en Edge holder 200 pas [fra noter]. Wahoo ELEMNT: exports (ture), plans (pas), routes.

**Grænser (pr. proces, i hukommelsen).** 60 filer gemt i timen pr. person på tværs af upload, deling, uploadnøgle og Rulle; en Rulle-tur tæller i samme spand og tjekkes før dublettjekket, så en Rulle-tur i en fuld time afvises med 429; 30 kald i timen på den fælles spand for upload, deling og Rulle; 120 filer læst og 600 kald i timen pr. person på uploadnøgledøren, 2 i gang ad gangen, 600 kald pr. 10 minutter og 20 ukendte nøgler pr. adresse; 60 kald i timen på /known; 300 eksporter i timen; dagsbudget kun på Strava-arkivet (500 gemt, 1.000 læst, 1.000 kald om dagen). Wahoo testmiljø 25/100/250, produktion 200/1.000/5.000; højst 10 ikke-tilbagekaldte adgangsnøgler pr. bruger fra 1. januar 2026 [bekræftet]; adgangsnøgler udløber efter 2 timer [fra kodens kommentar] og slettes efter 60 dage [bekræftet]. Tredict: personlig nøgle sover efter 14 dage uden web-login; klientnøgle gyldig i 2 dage, fornyelsesnøgle udløber ikke (roteres under PKCE).

**Åbne tekniske spørgsmål.** Wahoos filserver; PKCE mod fortrolig klient (også ved fornyelse); formular mod adresse; om Chromes mappevælger ser en MTP-Edge på Windows eller Chromebook; hvilken Sec-Fetch-Site en rigtig Android-deling sender; NewFiles-indtag, 15-tegnsregel, note og kadence-mål på en Edge; om et pausetrin (skrevet som rest, kode 1) vises bedre på en Edge med Garmins kode recovery (4), et valg, ikke en uoverensstemmelse; om Kadences afkoder læser Garmins filtrerede fil; om samme tur i hånden og via Tredict dubletafvises korrekt.

## Bilag B: Kilder

Alle hjemmesider læst 11. oktober 2026, medmindre andet er nævnt.

**Garmin.**

- Programmets spørgsmål og svar: https://developer.garmin.com/gc-developer-program/program-faq/
- Ansøgningsside: https://www.garmin.com/en-US/forms/GarminConnectDeveloperAccess/ (sidens data: vedligeholdelsesblok oprettet 2026-03-25, opdateret 2026-05-08; ingen formular den 2026-10-11)
- Trænings-API: https://developer.garmin.com/gc-developer-program/training-api/
- Partneraftale FRM-0952 Rev. B: https://www8.garmin.com/en-US/GARMINCONNECTDEVELOPERPROGRAMAGREEMENT/GARMINCONNECTDEVELOPERPROGRAMAGREEMENT_EN.pdf
- Forum, pause pr. e-mail: https://forums.garmin.com/developer/connect-iq/f/discussion/434798/cannot-access-developer-program-application-form-under-construction (OP 2026-04-15 "Under Construction", indlæg 2026-05-22) og tråd 441607 (2026-08-10, svar 2026-09-30 og 10-01)
- Vilkår, gældende 2026-04-01: https://www.garmin.com/en-GB/legal/terms-of-use/
- Privatlivspolitik, sidst opdateret 2026-01-09: https://www.garmin.com/en-GB/privacy/global/policy/ og https://www.garmin.com/en-GB/privacy/connect/policy/; 2022-udgaven via web.archive.org (2022-08-14 og 2022-05-25)
- Eksport-vejledning (Wayback 2026-09-19): https://support.garmin.com/en-US/?faq=W1TvTPW8JZ6LfJSfK512Q8; forumtråde 356839 (2024-01-09) og 397597 (2024-12-10)
- Udviklerblog om manuelt uploadede filer (kun set i søgeuddrag, siden svarede 403): developerportal.garmin.com/blog/activity-file-endpoint-provides-manually-uploaded-activities
- Opkøb af TrainingPeaks, 2026-07-22: https://www.garmin.com/en-US/newsroom/press-release/corporate/garmin-acquires-trainingpeaks-and-trainheroic-leading-endurance-and-strength-training-platforms-for-athletes-and-coaches/
- Manualer (USB-tilstand): www8.garmin.com/manuals/webhelp/ for edge130, edge530, edge830, edge1030, 130 Plus, 1030 Plus, 540 (aug. 2026), 840 (aug. 2026), 1040 (maj 2026), 1050 (sep. 2026), 550 og 850 (sep. 2026), MTB, Explore 2 (juli 2025)
- MTP via software: forums.garmin.com tråde 396826 og 396827 (version 25.24), 391947 (Explore 2 beta 25.19), 397019 (Explore 2 på 25.24), 380734 (Edge 1050 og Pixel), 399697 (Edge 1040 og telefon), 417692; gpsradler.de/ratgeber/garmin-edge-mtp-update/ (2024-11-05, telefonen viser mapper uden filer)
- FIT-profil: https://raw.githubusercontent.com/garmin/fit-javascript-sdk/main/src/profile.js
- Connect IQ: https://developer.garmin.com/connect-iq/api-docs/Toybox/Communications.html, …/Toybox/PersistedContent/Workout.html, …/Toybox/WatchUi/DataField.html, https://developer.garmin.com/connect-iq/sdk/ (udvikleraftale 2024-08-06; version 9.2.0, 2026-10-06), https://developer.garmin.com/connect-iq/articles/core-topics/Publishing_to_the_Store.html (72 timer), https://developer.garmin.com/connect-iq/articles/app-review-guidelines/Overview.html, forum 4697 (ingen adgang til FIT-filer)
- Fejlmelding på beta 31.61 (én bruger, 2026-09-18, intet svar fra Garmin): https://forums.garmin.com/beta-program/edge-540-840-1040/public-beta-bug-reports/i/edge-540-840-1040---31-xx-bug-reports; betaudgivelser 444237, 444684, 445142, 445618; produktionstråd 438299 (lignende symptom på 31.30)
- Garmin videresender ikke tredjepartsture: https://forums.garmin.com/developer/fit-sdk/f/discussion/357008
- Garmins offentlige PKCE-beskrivelse: https://developerportal.garmin.com/sites/default/files/OAuth2PKCE_1.pdf
- MyWhoosh2Garmin: https://github.com/JayQueue/MyWhoosh2Garmin (README)
- python-garminconnect, afslag: https://github.com/cyberjunky/python-garminconnect/issues/362 (2026-05-07)

**Wahoo.**

- Sky-grænseflade: https://cloud-api.wahooligan.com/ (sidst ændret 2025-10-06)
- Udviklerportal: https://developers.wahooligan.com/cloud
- API-aftale: https://eu.wahoofitness.com/wahoo-api-agreement
- Vilkår for EU, gældende 2023-12-05: https://eu.wahoofitness.com/terms-of-service
- Privatlivspolitik, gældende 2024-03-28: https://eu.wahoofitness.com/privacy-policy
- Hjælpesider (Zendesk-API): 12868989297426 (barnekonto, 2024-07-19), 4406008443026 (én konto pr. bruger, 2025-05-01), 4402745988754 (download af .fit, 2026-09-08), 28544587410450 (USB på ACE/BOLT 3/ROAM 3, 2026-07-15), 28969293656082 (ELEMNT/BOLT 1/ROAM 1, 2025-08-23), 22710510686098 (Wi-Fi-synkronisering, 2026-08-11), 14467471126802 (godkendte apps, 2026-06-03), 204280874 (2026-09-08)
- Plan-format: https://cloud-api.wahooligan.com/docs/plan-json-format.pdf (2024-03-26)
- Puls under 16, ubekræftet: https://forum.intervals.icu/t/130367 (2026-06-11)

**Tredict.**

- Vilkår, gældende 2026-09-25: https://www.tredict.com/termsofuse/
- Pris: https://www.tredict.com/price/
- Trænerpakker: https://www.tredict.com/blog/coaching_athletes_with_tredict/ (2026-08-25)
- Personlig nøgle: https://www.tredict.com/faq/personal-api---connect-your-own-scripts-or-personal-applications/
- Klientforbindelse: https://www.tredict.com/blog/oauth_docs/
- Privatliv og servere: https://www.tredict.com/privacy/
- Kilder og ændringer: https://www.tredict.com/faq/which-recording-devices-and-services-are-supported/ (Wahoo som kilde: fra noter), https://www.tredict.com/changelog (Zwift 2026-07-14, Rouvy 2026-10-07), https://www.tredict.com/llms-full.txt
- Bekræftet af Tredict, ud over dokumentationen: det, der er mærket sådan i afsnit 4 og bilag A

**Andre.**

- TrainingPeaks hjælp: 204070854 (2026-09-07), 204070844 (2026-08-24), 115001167492 (2026-09-07), 360046373152 (2026-08-24), 115001076908
- intervals.icu: forum 2353 (2020-12-30), 1521 (2020-08-19), 65949 (2024-05-02), 124287 (2026-03-12, filtreret fil); API-vilkår gældende 2025-10-23 (kildeangivelse til Garmin) [fra noter, læst 2026-09-29]
- JOIN hjælp: 46209433565969 (2026-09-30), 4573793651217 (2026-09-05), 24484847420177 (2026-09-03); vilkår https://join.cc/terms-and-conditions (2026-10-09)
- Athletica: support 34081044761499 (2025-02-15); https://athletica.ai/privacy-policy (maj 2026)
- Dropbox: https://www.dropbox.com/terms (16 år nu: fra noter), https://www.dropbox.com/terms2026 (gældende 2027-01-01), https://help.dropbox.com/security/physical-location-data-storage (2026-08-31)
- Aggregatorer: https://tryterra.co/pricing
- Cycling Analytics: https://www.cyclinganalytics.com/legal, /faq, /blog (2026-10-01)
- Chrome 132: https://developer.chrome.com/release-notes/132; caniuse native-filesystem-api og input-file-directory
- Garmin-bro, filtrering: https://github.com/futureweb/garmin-intervals-bridge (README)
- TrainAsONE Connect IQ: https://github.com/TrainAsONE/trainasone-connectiq

**I Kadence (main, acc23a7).**

- docs/research/rides-in-options.md (2026-10-10), docs/research/garmin-without-partner-access.md (2026-09-29), docs/research/workouts-to-devices.md (2026-09-29), docs/research/trainingpeaks-analyse.md
- docs/upload-keys.md, docs/devices-setup.md, docs/subprocessors.md, docs/backlog.md (A-04, A-07, P2-01, P1-06), TECH-DEBT.md, docs/rulle-proevetur.md
- docs/adr/0018, 0019, 0020, 0022, 0027, 0029, 0030, 0031, 0033, 0057, 0060, 0079
- src/modules/devices/_.ts, src/modules/files/device-folder.ts, src/modules/workouts/export/_, src/modules/fit/profile.ts, src/modules/load/activity-load.ts, src/components/session/send-to-device*.ts*, src/components/activities/_, src/components/today/checklist-steps.ts, src/core/rate-limit.ts, src/core/db/schema/devices.ts og training.ts, src/app/api/rulle/ride/route.ts, messages/da.json (help.howTo._, load.fitness/fatigue/form, sendToDevice.mtp, tjeklistens tekst), scripts/send-rides.sh, tests/devices/_, tests/files/_, tests/workouts/*

## Bilag C: Ordliste

- **Pas**: et planlagt træningspas i kalenderen, med eller uden trin.
- **Tur**: en kørt tur, optaget af en cykelcomputer, en telefon eller Rulle.
- **Cykelcomputer**: enheden på styret, der optager turen: Garmin Edge, Wahoo ELEMNT.
- **FIT-fil**: det filformat, cykelcomputere gemmer ture og pas i. Kadence har sin egen læser og skriver.
- **Almindeligt USB-drev**: en Edge, der viser sig som et drev på enhver computer (130, 130 Plus, 530, 830, 1030, 1030 Plus).
- **MTP**: en overførselsmåde for USB, som Windows forstår, en Mac ikke forstår uden hjælpeprogram, og som telefoner ikke får filer ud af (Edge 540, 550, 840, 850, 1040, 1050, Explore 2, MTB; ELEMNT ACE, BOLT 3, ROAM 3, ELEMNT, BOLT 1 og ROAM 1 ifølge Wahoos vejledninger, BOLT 2 og ROAM 2 fra noter).
- **Garmin/NewFiles**: mappen på en Edge, hvor nye pas lægges; Edge'en skal tage dem ind, når kablet tages ud (Garmins vejledning; ikke afprøvet).
- **"Hent fra enheden"**: Kadences knap, der læser cykelcomputeren som en mappe i browseren og sender de ture, Kadence ikke har.
- **Uploadnøgle**: en nøgle pr. rytter, der kun kan lægge ture ind og intet læse. Bruges af scriptet send-rides.sh.
- **Deling**: på Android kan en fil deles til den installerede Kadence-app.
- **Mellemstation**: en tjeneste (Tredict), der henter ture fra Garmin og lader Kadence hente dem videre. Ikke bygget i Kadence.
- **Adgangsnøgle (token)**: det, et program får i stedet for en adgangskode, og som giver adgang til netop det, rytteren har tilladt.
- **Klientforbindelse (OAuth)**: "forbind din konto"-login, hvor rytteren logger ind hos tjenesten og siger ja til Kadence; Kadence ser aldrig adgangskoden.
- **PKCE**: en sikrere udgave af klientforbindelsen, som Kadence bruger.
- **Besked fra skyen (webhook)**: en automatisk besked fra Wahoos eller Garmins sky til Kadence, når en tur er klar.
- **Testmiljø (sandbox)**: Wahoos prøvemiljø med lave grænser, før produktion godkendes.
- **Partnerprogram**: Garmins ordning for virksomheder, der giver adgang til ture ind og pas ud via Garmins sky. Sat på pause.
- **Connect IQ**: Garmins butik og værktøj til små apps på Edge og ure.
- **Rulle**: Kadences egen afspiller af et pas på en hometrainer, i browseren over Bluetooth.
- **Kondition, træthed og friskhed**: Kadences tre kurver for, hvad træningen har bygget op, hvad den har kostet, og hvor frisk rytteren er lige nu.
- **Opmærksomhedspunkter**: de tolv forhold, Kadence markerer for træneren, når en uge går ud over rammerne.
- **Indlæsning af tal**: en endnu ikke bygget vej, hvor en tur kan lægges ind som tal alene (dato, tid, afstand, puls, watt) uden filen.
- **Dagsbudget**: en grænse pr. dag i stedet for pr. time, så en hel sæsons ture kan lægges ind på én gang.
- **ADR**: en skriftlig beslutning i docs/adr/ med den afvejning, der blev taget.
- **A-04, A-07, P2-01, P1-06**: numre i backloggen: Wahoo-ansøgningen, beslutningen om Tredict og Connect IQ, Tredict-adapteren, Rulle på en rigtig hometrainer.
