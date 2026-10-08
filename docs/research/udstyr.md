# Udstyr til unge landevejsryttere: hvor er der mest fart for pengene?

_Researchnote til Kadence, afsnittet for forældre. Oktober 2026._
_Målgruppe: forældre til ryttere i U17, U19 og U23. Noten er grundlag for tekst i Kadence, ikke færdig brugerflade-tekst._

---

## Kort fortalt

- **I feltet er luftmodstanden langt mindre end alene.** En rytter midt i et tætpakket felt har ned til 5–10 % af den luftmodstand, en rytter alene har ved samme fart (Blocken m.fl. 2018). Aero-udstyr betyder derfor mest i enkeltstart, udbrud, sidevind og når rytteren selv trækker. Rullemodstand og kædefriktion betyder det samme i feltet som alene.
- **Det billigste er ofte det mest effektive.** En ren og smurt kæde, gode dæk med latexslanger, tætsiddende tøj og en lav position kan tilsammen give mere end en ny racercykel til 70.000–110.000 kr. – til en brøkdel af prisen.
- **Dæk og slanger er det bedste køb pr. krone** (efter det, der er gratis). Forskellen mellem et billigt og et hurtigt dæk er omkring 20 W for et par ved 40 km/t (beregnet ud fra laboratoriemålinger). Latexslanger giver yderligere 5–6 W for omkring 200 kr.
- **Dyrere gruppesæt, keramiske lejer og store pulleyhjul giver næsten intet målbart.** Forskellen mellem Shimano 105 og Dura-Ace er primært vægt (ca. 550 g) og pris (ca. 17.000 kr. i listepris).
- **Wattmåler og pulsbælte er træningsværktøjer, ikke fart.** To lodtrækningsstudier fandt samme fremgang, uanset om intervaller blev styret efter puls eller watt. Et pulsbælte til 350–700 kr. er det billigste sted at starte.
- **DCU's regler sætter rammerne.** U17 må fx ikke bruge enkeltstartscykel, triatlonstyr eller pladehjul. Hjul i linjeløb skal være UCI-godkendte (eller "traditionelle"), styret skal være mindst 40 cm bredt, og man skal køre i klubbens godkendte dragt.

---

## Metode

**Kilder.** Noten bygger på fire slags kilder, i denne rækkefølge af vægt:

1. Fagfællebedømt forskning (aerodynamik i felter, positioner, træningsstudier, hjelmsikkerhed).
2. Uafhængige laboratorie- og vindtunneltest med offentliggjort protokol og fejlmargin: Cyclingnews' test i Silverstone Sports Engineering Hubs vindtunnel (betalt til almindelig pris), bicyclerollingresistance.com's tromletest af dæk og slanger, og Friction Facts' målinger af kæder og krankleje.
3. Den danske regelsamling (DCU's Sportslige regler 2026) og Færdselsstyrelsen.
4. Producentpåstande. De er markeret som sådan og får lav sikkerhed.

**Fysikmodel.** Watt er omregnet til sekunder med standardmodellen for cykeleffekt (Martin m.fl. 1998), forenklet uden vind:

> P = (½ · ρ · CdA · v³ + Crr · m · g · v + m · g · v · sin(hældning)) / η

Egne antagelser for en typisk junior: rytter 65 kg + cykel 8 kg, CdA 0,32 m² (racercykel, hænder i bøjlen, almindeligt tøj), Crr 0,004 (godt dæk på god asfalt), luftdensitet 1,2 kg/m³, drivlinjevirkningsgrad 97,5 %. Med de tal kræver 40 km/t alene **ca. 303 W**, hvoraf ca. 270 W går til luftmodstand og ca. 33 W til rullemodstand. Alle sekunder i noten er beregnet ved konstant effekt på dette niveau. Antagelserne er rimelige, ikke målte; de faktiske tal afhænger af rytterens størrelse og position.

**Omregning af tromletest.** Bicyclerollingresistance.com måler ved 28,8 km/t og 42,5 kg pr. dæk på en ru ståltromle. Rullemodstand stiger proportionalt med fart og belastning, så tallene er ganget med 1,19 for at svare til 40 km/t og 36,5 kg pr. dæk (73 kg fordelt på to dæk). Tromlen er ikke en landevej; tallene er bedst til at sammenligne dæk, ikke til absolutte værdier.

**Valuta.** ECB's referencekurser 2. oktober 2026: 1 EUR = 7,47 kr., 1 GBP ≈ 8,79 kr., 1 USD ≈ 6,66 kr. Danske priser er fundet hos danske forhandlere og PriceRunner i oktober 2026 og svinger.

**Sikkerhed (konfidens)** i tabellerne:

- **Høj**: flere uafhængige kilder peger samme vej, og fysikken er velforstået.
- **Middel**: én god uafhængig test med fejlmargin, eller ældre laboratoriedata.
- **Lav**: producentpåstand, ekstrapolation, eller ingen uafhængig måling fundet.

**Begrænsninger.** Næsten alle vindtunneltest er lavet med voksne ryttere eller en voksen mannequin. Juniorer er typisk mindre, så den absolutte gevinst i watt er sandsynligvis lidt mindre, men rækkefølgen bør være den samme. Gevinster kan ikke uden videre lægges sammen.

---

## 1. Perspektivet: hvor går kræfterne hen?

Ved 40 km/t alene går omkring 90 % af kraften til at skubbe luft væk (egen beregning ovenfor). Derfor er aerodynamik det største enkelttema i enkeltstart.

I et felt ændrer billedet sig markant. Blocken m.fl. (2018) målte og simulerede felter med op til 121 rytter-modeller i vindtunnel og med CFD (computersimulering af luftstrømning):

| Placering               | Luftmodstand i forhold til en rytter alene | Beregnet samlet effekt ved 40 km/t* | En aero-gevinst på 10 W alene svarer her til ca. |
| ----------------------- | ------------------------------------------ | ----------------------------------- | ------------------------------------------------ |
| Alene                   | 100 %                                      | ca. 303 W                           | 10 W                                             |
| Nr. 2 på række          | ca. 60 %                                   | ca. 195 W                           | 6 W                                              |
| Nr. 4 på række          | ca. 46 %                                   | ca. 157 W                           | 4,6 W                                            |
| Midt/bagerst i tæt felt | 5–10 %                                     | ca. 46–60 W                         | 0,5–1 W                                          |

\*Egen beregning: kun luftmodstanden er skaleret, rullemodstanden er uændret. Den sidste kolonne antager, at gevinsten skalerer med luftmodstanden; det er en tilnærmelse.

Blockens tal gælder et idealiseret, tætpakket felt med jævn fart. Et juniorfelt er mindre og mere uroligt, med accelerationer, sving og positionskampe, så den reelle effekt i et løb er højere end tabellen viser. Men størrelsesordenen er klar:

- **I linjeløb betyder det mere at sidde godt placeret i feltet end noget stykke udstyr.** Det er en færdighed, der trænes, ikke noget man køber.
- **Aero-udstyr betaler sig mest i enkeltstart, udbrud, sidevind og når rytteren selv er i vinden.**
- **Rullemodstand og friktion i drivlinjen forsvinder ikke i feltet.** Derfor rykker dæk, slanger og en ren kæde relativt op i et linjeløb.

### Tommelfingerregel: watt til sekunder

Ved ca. 300 W og 40 km/t (egen beregning):

| Gevinst | 15 km enkeltstart (U17's maksimum) | 30 km enkeltstart (U19's maksimum) |
| ------- | ---------------------------------- | ---------------------------------- |
| 1 W     | ca. 1,7 s                          | ca. 3,3 s                          |
| 5 W     | ca. 8 s                            | ca. 17 s                           |
| 10 W    | ca. 17 s                           | ca. 33 s                           |
| 20 W    | ca. 34 s                           | ca. 67 s                           |

Distancerne er DCU's maksimum for enkeltstart: U17 15 km, U19D og U19P 30 km (DCU, Sportslige regler 2026, kap. 7 §1.6, §1.14 og §1.15).

**Vægt** betyder mindre, end mange tror, på danske ruter. 1 kg ekstra på en 1 km lang stigning på 5 % koster ca. 1,2 sekund ved 325 W (egen beregning). I accelerationer koster 1 kg ca. 43 J pr. fartskift fra 30 til 45 km/t; 100 sådanne accelerationer på en time svarer til ca. 1,2 W i gennemsnit (egen beregning). Vægt på fælge og dæk tæller cirka dobbelt i accelerationer, fordi hjulet også skal i rotation.

---

## 2. Position og bikefit

**Position er den største enkeltfaktor i luftmodstand, og den er gratis.** Rytteren står for størstedelen af luftmodstanden; cyklen for resten.

Barry m.fl. (2015) målte ni positioner i Monash Universitys vindtunnel ved 45 km/t (0° vind). Omregnet til andel af luftmodstanden:

| Position                               | Reduktion i forhold til hænder på bremsegrebene | Svarer ved 40 km/t til ca.* |
| -------------------------------------- | ----------------------------------------------- | --------------------------- |
| Hænder i bøjlen, traditionelt          | 3,0 %                                           | 8 W                         |
| Hænder i bøjlen, sammenkrøbet overkrop | 10,5 %                                          | 28 W                        |
| Hænder på grebene, vandrette underarme | 13,4 %                                          | 35 W                        |

\*Egen omregning med 263 W luftmodstand ved hjulet (modellen ovenfor). Tallene er fra én studie med voksne ryttere og svinger fra person til person.

Et bemærkelsesværdigt fund: at sænke hovedet yderligere i den sammenkrøbne bøjleposition **øgede** modstanden i forsøget (fra 385 til 403 W ved 45 km/t). Lavere er ikke altid hurtigere.

**Regler:** I linjeløb må rytteren kun have kontakt med cyklen med fødder, hænder og bagdel (DCU 2026, kap. 7 §9.5). Underarme hvilende på styret er altså ikke tilladt. For U11–U17 er triatlonstyr og enkeltstartscykler ikke tilladt i Danmark, bortset fra U17-ryttere, der kører DM eller distriktsmesterskab for U19 i enkeltstart og holdløb (DCU 2026, kap. 5 §1.3).

**Sikkerhed i feltet:** En lav "aero-position" på grebene giver mindre kontrol over bremser og styring. I et tæt felt er en sikker position vigtigere end nogle watt.

**Bikefit.** En systematisk oversigt (Bini & Priego-Quesada 2022, 41 studier) fandt stærk evidens for at indstille sadelhøjde ud fra knævinklen i bevægelse, men kun små eller trivielle effekter af ændringer under 4 % af benlængden og begrænset evidens for effekt på præstation og skader. Det taler for, at et bikefit primært handler om komfort, at kunne holde en lav position længe, og at fange grove fejl. For ryttere i vækst bør sadelhøjde og rækkevidde tjekkes, når de vokser.

Pris i Danmark: fra ca. 450 kr. (kort tjek) over 1.500–2.500 kr. (typisk fuldt fit) til ca. 3.900 kr. (forskellige udbydere, oktober 2026).

---

## 3. Tøj: skinsuit, løst tøj, skoovertræk og rygnumre

Cyclingnews testede tøj i Silverstone-vindtunnelen ved 40 km/t med samme rytter og cykel (april 2025). Fejlmargin ±2,55 W.

| Ændring                                                     | Gevinst ved 40 km/t                                       | Pris i testen      |
| ----------------------------------------------------------- | --------------------------------------------------------- | ------------------ |
| Billig trøje og bukser → bedre trøje og bukser              | 0,3 W (inden for fejlmargin)                              | £99 → £129         |
| Billig trøje og bukser → landevejs-skinsuit (Kalas "Brios") | **10,2 W**                                                | £239 (≈ 2.100 kr.) |
| Samme skinsuit + aero-undertrøje                            | 18,1 W                                                    | ca. £339           |
| Skinsuit → "superdragt" til £449                            | ca. 3,3 W ekstra (beregnet fra CdA; inden for fejlmargin) | £449 (≈ 3.950 kr.) |
| Almindelige sokker → aero-sokker                            | 3,4 W (inden for fejlmargin)                              | –                  |
| Almindelige sokker → aero-skoovertræk (Velotoze)            | **6,3 W**                                                 | £54,90 (≈ 480 kr.) |
| Vest/gilet åben og blafrende                                | **+10,2 W** (tab)                                         | –                  |

Pointer fra testen:

- Kun den løse budgettrøje kunne mærkes blafre. **Det, der blafrer, koster.** En åben vest kostede 10 W.
- Testerens egen, to år gamle enkeltstartsdragt var ikke hurtigere end billig trøje og bukser. Han peger på to mulige forklaringer: slid og vask ændrer pasformen, og dragten er designet til en anden position og fart.
- Kalas' repræsentant frarådede at købe en skinsuit en størrelse for lille: når stoffet strækkes for meget, virker aero-stoffet ikke som tænkt.

**Danske forhold:** Rytteren skal køre i klubbens DCU-godkendte dragt (DCU 2026, kap. 3 §1.13). En skinsuit giver derfor kun mening, hvis klubben har en i godkendt design. En korterærmet landevejs-skinsuit koster ca. 1.500–1.900 kr. (fx Kalas Passion Z6 1.890 kr. på kalaswear.dk).

**Skoovertræk:** Velotoze Aero koster ca. 420–450 kr. hos danske forhandlere. Billigere latexovertræk findes (ca. 170–200 kr.), men er ikke testet i vindtunnel her.

**Rygnumre:** DCU kræver to rygnumre og et rammenummer i linjeløb; numre må ikke foldes eller klippes, og nummerlommer må kun bruges i enkeltstart og holdtidskørsel (DCU 2026, kap. 5 §14). Vi har **ikke fundet en uafhængig, offentliggjort måling** af, hvad et slapt påsat nummer koster. Mekanismen er den samme som for løst tøj: sæt nummeret fladt og stramt, så det ikke blafrer.

---

## 4. Hjelm: aerodynamik og sikkerhed

**Sikkerhed først.** Hjelm er obligatorisk og skal være CE-godkendt med hård skal og hagerem. En almindelig landevejshjelm skal have mindst tre tydelige luftindtag, må ikke dække ørerne, og visir er ikke tilladt; tidskørselshjelme har andre krav (DCU 2026, kap. 5 §15).

Pris og sikkerhed hænger ikke sammen: I Virginia Techs laboratorietest var engrosprisen på cykelhjelme ikke signifikant forbundet med hjelmens beskyttelsesscore (Bland & Rowson 2021). Virginia Techs offentlige hjelmvurderinger kan bruges til at vælge en hjelm med god beskyttelse i alle prisklasser.

**Aerodynamik.** Cyclingnews testede 47 hjelme i Silverstone-vindtunnelen (juli 2025) på en mannequin med hænderne i bøjlen ved 40 km/t. Fejlmargin ±0,74 W.

| Sammenligning                                                                                         | Gevinst ved 40 km/t |
| ----------------------------------------------------------------------------------------------------- | ------------------- |
| Gennemsnitlig aero-hjelm vs. gennemsnitlig ventileret hjelm                                           | 4,5 W               |
| Tidskørselshjelm vs. gennemsnitlig aero-hjelm                                                         | yderligere 4,3 W    |
| Van Rysel RCR (ventileret, £80) → Van Rysel RCR-F (aero, £130)                                        | 4,8 W               |
| Hurtigste aero-landevejshjelm (Oakley Velo Mach) vs. testens udgangspunkt (ventileret Abus Powerdome) | 8,1 W               |

Pointer:

- Den billigste aero-hjelm i testen (Van Rysel RCR-F, ca. €120/£130, dvs. ca. 900–1.150 kr.; dansk pris ikke verificeret) sparede 6,1 W mod udgangspunktet og var kun ca. 2 W langsommere end den hurtigste aero-landevejshjelm.
- Der var stort overlap mellem kategorierne: den hurtigste ventilerede hjelm slog den langsomste aero-hjelm.
- Testen brugte en lav, aggressiv position. Testeren påpeger, at en mere oprejst rytter sandsynligvis får mindre ud af en aero-hjelm.

**Praktisk:** Skal hjelmen alligevel skiftes (efter et styrt eller fordi den er vokset fra), er merprisen for en aero-model lille i forhold til gevinsten. Tidskørselshjelm giver kun mening for ryttere, der kører enkeltstart med enkeltstartsudstyr; for U17 er enkeltstartscykler ikke tilladt i almindelige danske løb.

---

## 5. Dæk, slanger og tryk

Her er der mest at hente pr. krone, og gevinsten gælder også i feltet.

**Hurtige vs. billige dæk** (bicyclerollingresistance.com, begge 25 mm, samme butylslange, 5,5 bar):

| Dæk                          | Rullemodstand pr. dæk (tromle, 28,8 km/t) | Dansk pris pr. dæk                   |
| ---------------------------- | ----------------------------------------- | ------------------------------------ |
| Schwalbe Lugano II (billigt) | 21,1 W                                    | ca. 95–130 kr.                       |
| Continental Grand Prix 5000  | 12,1 W                                    | (GP5000 S TR 28 mm: ca. 406–469 kr.) |

Forskel: 9,0 W pr. dæk på tromlen, **omregnet ca. 21 W for et par ved 40 km/t** (egen omregning, se metode). Cyclingnews nåede uafhængigt frem til ca. 22 W mellem et hurtigt allround-dæk og et vinterdæk. Det svarer til ca. 34 sekunder på 15 km.

Afvejning: hurtige dæk har ofte tyndere slidbane. Bicyclerollingresistance.com fandt, at punkteringsmodstanden i slidbanen på GP5000 S TR var ca. 30 % lavere end forgængerens. Et træningsdæk med bedre punkteringsbeskyttelse og et hurtigt løbsdæk er derfor en almindelig løsning.

**Slanger og tubeless** (GP5000 S TR, 5,5 bar, tromle):

| Opsætning                                         | Rullemodstand pr. dæk |
| ------------------------------------------------- | --------------------- |
| Tubeless med 20 ml tætningsmiddel                 | 10,3 W                |
| Latexslange (Vredestein / Vittoria)               | 10,5 / 10,6 W         |
| Let TPU-slange (Revoloop Ultra / Tubolito S-Tubo) | 10,9 / 11,2 W         |
| Let butyl (Conti Race28 Light)                    | 11,8 W                |
| Standard butyl (Conti Race28, 102 g)              | 13,0 W                |

Latex i stedet for standard butyl: 2,4 W pr. dæk på tromlen, **omregnet ca. 5–6 W for et par ved 40 km/t**. Cyclingnews målte 5,4 W for et par. En Vittoria Competition latexslange koster ca. 95–99 kr. i Danmark. Latex er næsten lige så hurtigt som tubeless (bicyclerollingresistance.com, gennemsnit af tre dæk: tubeless 9,1 W, latex 9,4 W, butyl 11,6 W ved 5,5 bar). Latex mister luft hurtigere og skal pumpes før hver tur. Tubeless kan lukke små punkteringer selv, hvilket kan redde et løb, men kræver tubeless-kompatible fælge og mere arbejde.

**Dækbredde:** Når GP5000 i 23–32 mm blev pumpet til samme komfort, var rullemodstanden næsten ens (højst 0,2 W forskel). I Cyclingnews' hjultest var 30 mm dæk mere aerodynamiske end 28 mm på ni ud af 16 hjulsæt. Bredere dæk er altså ikke automatisk langsommere.

**Tryk:** Højere tryk ruller lettere på en glat tromle, men på en ru vej findes et "knækpunkt", hvor mere tryk gør cyklen langsommere, fordi vibrationer i cykel og rytter æder energi (Tom Anhalts målinger, beskrevet af SILCA). Jo ruere vej, jo lavere ligger knækpunktet. Vi har **ikke fundet en uafhængig måling** af, hvor mange watt forkert tryk koster for en junior på dansk asfalt. Brug en trykberegner (fx SILCA's), der tager højde for vægt, dækbredde og vejbelægning.

---

## 6. Hjul

Cyclingnews testede 16 hjulsæt i Silverstone-vindtunnelen ved 40 km/t (juli 2026), **uden rytter** og med samme dæk:

| Hjul                               | Fælghøjde | Vægt    | Pris                  | Sparet vs. lavt hjul ved 40 km/t |
| ---------------------------------- | --------- | ------- | --------------------- | -------------------------------- |
| Arcaris Pro 8848 (udgangspunkt)    | 27 mm     | 906 g   | £1.425                | –                                |
| Hurtigste: Hunt 5AM Limitless      | 55/58 mm  | 1.229 g | £1.999 (≈ 17.600 kr.) | 6,6 W                            |
| Langsomste aero-hjul: Pertual ACME | 45–62 mm  | 1.236 g | £1.500 (≈ 13.200 kr.) | 4,6 W (28 mm dæk)                |

Pointer:

- Dybe hjul sparer ca. **4,6–6,6 W** ved 40 km/t (ekstrapoleret til 50 km/t: op til 13 W). Det er ca. 8–11 sekunder på 15 km.
- Der var næsten ingen sammenhæng mellem pris og aerodynamik i testen.
- Testen er uden rytter. Med en rytter på kan forskellen være en anden; testen siger ikke hvor meget.
- Vi har **ikke fundet en ny, uafhængig test**, der sammenligner moderne dybe hjul med et typisk billigt aluminiumshjul med lav fælg. Cyclingnews' cykeltest (afsnit 7) indeholder sådan et hjul, men kun som en del af hele cyklen.
- Billigere direkte-salgsmærker findes, fx Elitewheels Drive 50D til $1.200/£990 (≈ 8.700 kr.) ifølge Cycling Weekly, men de var ikke med i vindtunneltesten.
- Det lave hjul i testen var 323 g lettere. På en 1 km stigning på 5 % svarer det til ca. 0,4 sekund (egen beregning); i accelerationer tæller fælgvægt cirka dobbelt.

**Regler, der betyder noget ved køb:**

- I linjeløb skal hjul være UCI-godkendte, medmindre de er "traditionelle": metalfælg under 25 mm, mindst 20 udskiftelige ståleger (DCU 2026, kap. 5 §9.10). Tjek UCI's liste over godkendte hjul, især ved billige kulfiberhjul.
- Maksimal fælghøjde er 65 mm fra 2026 (DCU 2026, kap. 5 §9.9, følger UCI). Ifølge UCI gælder grænsen massestartløb, ikke enkeltstart.
- U11–U17 må ikke bruge pladehjul eller hjul med færre end 12 eger i Danmark (DCU 2026, kap. 5 §1.3-3).

---

## 7. Stel, vægt og den nye cykel

Cyclingnews testede 11 topcykler (£8.000–12.500) mod en 2015-aluminiumscykel med lave fælge, fælgbremser, udvendige kabler og rundt styr (august 2024), med rytter på ved 40 km/t:

- Den hurtigste cykel sparede **16,7–32,3 W** (midtestimat 24,5 W) i forhold til den gamle cykel. Det svarer til ca. 28–55 sekunder på 15 km.
- Forskellen mellem topcyklerne indbyrdes kunne være alt fra 0 til ca. 14 W; testen kunne ikke kåre en sikker vinder.
- Besparelsen dækker hele cyklen, også hjul, styr og kabler. Den kan derfor ikke lægges oven i hjulgevinsten.
- Cyclingnews regnede selv med ca. £230–250 pr. sparet watt (≈ 2.000–2.200 kr./W), men ud fra målingen uden rytter (35–40 W). Med rytter på (16,7–32,3 W) og testens prisspænd bliver det ca. 2.200–6.600 kr./W (egen beregning).

**Minimumsvægt:** En cykel må ikke veje under 6,8 kg (DCU 2026, kap. 5 §10.1). En junior på en aluminiumscykel på 8–8,5 kg giver ikke meget væk på danske ruter: 1 kg koster ca. 1,2 sekund pr. km på 5 % stigning (egen beregning).

**Styrbredde:** Fra 2026 skal styret være mindst 40 cm bredt målt yderst, med mindst 28 cm mellem bremsegrebene indvendigt og højst 10° indadvinkling af grebene. Undtaget er cykler med 20", 24" og 26" hjul (DCU 2026, kap. 5 §12.1). Det er værd at kende ved køb af en lille, brugt cykel, der ofte har smallere styr.

---

## 8. Gruppesæt

| Gruppesæt (elektronisk, disk) | Vægt (ca.) | Listepris (ca.)       |
| ----------------------------- | ---------- | --------------------- |
| Shimano 105 Di2 R7100         | 2.992 g    | £1.700 (≈ 14.900 kr.) |
| Shimano Ultegra Di2 R8100     | 2.716 g    | £2.370 (≈ 20.800 kr.) |
| Shimano Dura-Ace Di2 R9200    | 2.438 g    | £3.632 (≈ 31.900 kr.) |

Kilder: vægt fra Cyclistshub (april 2026), pris fra Cyclist (februar/marts 2026). Mekanisk 105 R7100 vejer ca. 2.850 g.

- Forskellen fra 105 Di2 til Dura-Ace er **ca. 550 g og ca. 17.000 kr.** i listepris. På en 1 km stigning på 5 % er 550 g ca. 0,7 sekund (egen beregning).
- Gruppesæt har ingen kendt betydning for luftmodstanden. Vi har ikke fundet uafhængige målinger af forskellen i friktion mellem 105, Ultegra og Dura-Ace, og kan derfor ikke sætte tal på den.
- Om skiftekvalitet vurderer anmeldere, at de tre niveauer er på højde med hinanden i præcision og pålidelighed (Cyclistshub). Det er en anmeldervurdering, ikke en måling.

---

## 9. Kæde og drivlinje

**En ren, smurt kæde er en af de billigste gevinster, og den gælder i feltet.** Friction Facts målte på en kalibreret maskine ved 250 W (data fra 2012–2013, offentliggjort af CyclingTips 2020):

| Tilstand                    | Tab i kæden ved 250 W |
| --------------------------- | --------------------- |
| Ren og smurt                | ca. 5–7 W             |
| Efter regn                  | ca. 13 W              |
| Mudret og vådt              | ca. 14 W              |
| Mudret og tørret ind        | ca. 18 W              |
| Helt affedtet, uden smøring | ca. 20–26 W           |

Ifølge Friction Facts koster det **ca. 12 W at lade være med at rense kæden efter en mudret tur og ca. 6 W efter en tur i regn**; selv en tør tur på en time kan øge friktionen 0–4 W (Triathlete 2018). En kæde uden smøring er markant langsommere end en smurt.

Smøremiddel betyder noget for, hvor hurtigt kæden bliver beskidt. I en test med fint støv forblev tabet for et voksbaseret smøremiddel på 4 W, mens det for et tyndt oliebaseret steg fra 6 til 10 W (Friction Facts/CeramicSpeed, via CyclingTips 2020). Voksbaserede midler samler generelt mindre snavs, men oliebaserede kan også være effektive, hvis kæden holdes ren.

**Slid:** Adam Kerin (Zero Friction Cycling) fik målt slidte, rensede kæder (ca. 0,7–0,8 % slid) til 2,1–4,6 W mere tab end Friction Facts' tidligere tal for nye kæder med samme smøremiddel. Sammenligningen er på tværs af målinger og derfor usikker. En slidt kæde slider også kassetten. En kædelære koster lidt og fortæller, hvornår kæden skal skiftes.

**Pris:** Affedter og smøremiddel for ca. 100–300 kr. (fx Squirt kædevoks 120 ml ca. 100 kr.).

---

## 10. Kosmetik og marginale gevinster

| Ting                                        | Hvad vi ved                                                                                                                                                                                                                 | Vurdering                                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Keramisk krankleje                          | Friction Facts (35 krankleje, 2013): bedste stålleje 0,32 W, bedste keramiske 0,29 W, altså 0,03 W forskel. Tre ud af fem producenter havde lavere friktion i stål- end keramikversionen. Spændet for alle var 0,29–2,13 W. | Et velholdt stålleje er lige så godt. Pris for keramisk ca. €235–419 (≈ 1.750–3.100 kr.). |
| Store pulleyhjul (OSPW)                     | CeramicSpeed påstår mindst 2,4 W i forhold til standard Dura-Ace-pulleyhjul. Vi har ikke fundet en uafhængig laboratorietest. En test fra Brújula kaldte forskellen "praktisk talt umulig" at mærke.                        | Producentpåstand, lav sikkerhed. Pris €399–549 (≈ 3.000–4.100 kr.).                       |
| Aero-sokker                                 | 3,4 W mod almindelige sokker, inden for testens fejlmargin (Cyclingnews 2025).                                                                                                                                              | Usikker gevinst.                                                                          |
| "Superdragt" til £449 vs. skinsuit til £239 | ca. 3,3 W, inden for fejlmargin (Cyclingnews 2025).                                                                                                                                                                         | Den store gevinst ligger i skiftet fra løst tøj til skinsuit, ikke i den dyreste dragt.   |
| Farvematchet tøj, styrbånd, flaskeholdere   | Ingen fysisk mekanisme, ingen test.                                                                                                                                                                                         | Rent kosmetisk.                                                                           |
| Titaniumbolte, kulfiberflaskeholdere o.l.   | Vægt: 50 g svarer til ca. 0,06 sekund pr. km på 5 % stigning (egen beregning).                                                                                                                                              | Ubetydeligt.                                                                              |

Det er helt i orden at købe noget, fordi det er pænt eller giver glæde. Pointen er blot, at det ikke gør rytteren hurtigere.

---

## 11. Træningsværktøjer: wattmåler og pulsbælte

En wattmåler gør ikke cyklen hurtigere. Værdien ligger i træningen og i at fordele kræfterne i en enkeltstart.

**Evidens:** To lodtrækningsstudier sammenlignede intervaltræning styret efter watt og efter puls:

- Swart m.fl. (2009), 21 veltrænede mænd, 4 uger: begge grupper forbedrede 40 km enkeltstart (watt 2,3 %, puls 2,1 %) og maksimal effekt (watt 3,5 %, puls 5,0 %), uden signifikant forskel.
- Robinson m.fl. (2011), 20 motionister, 5 uger: begge grupper forbedrede effekten ved laktattærskel med ca. 17 W og 20 km enkeltstart med ca. 3,5 minutter, uden forskel mellem grupperne.

Studierne er små, korte og lavet på voksne, så de kan ikke uden videre overføres til unge. De viser dog, at en wattmåler ikke er en forudsætning for god træning.

**Hvornår giver en wattmåler mening?** Når træneren bruger watt til at styre træningen og følge belastningen, og til at lære at fordele kræfterne i enkeltstart. Har rytteren en smart-hometrainer, måler den allerede watt indendørs.

**Puls:** Et brystbælte er mere præcist end optisk pulsmåling ved håndleddet, især i korte, hårde intervaller (American College of Cardiology 2017; Cycling Weekly).

| Værktøj                                        | Pris i Danmark (oktober 2026) |
| ---------------------------------------------- | ----------------------------- |
| Pulsbælte (fx Polar H10)                       | ca. 356–699 kr.               |
| Wattmåler i én pedal (Favero Assioma Uno)      | ca. 2.358–3.599 kr.           |
| Wattmåler i begge pedaler (Favero Assioma Duo) | ca. 3.488–5.499 kr.           |

---

## 12. Sikkerhed og reservedele

- **Hjelm:** se afsnit 4. Producenterne anbefaler at skifte hjelmen efter et styrt, også når der ikke er synlige skader.
- **Lys til træning:** Cykellygter skal kunne ses på mindst 300 meters afstand forfra og bagfra (Færdselsstyrelsen), og de skal bruges i mørke. I et dansk lodtrækningsforsøg i Odense med 3.845 cyklister (2004–2005) havde cyklister med permanent kørelys 19 % færre selvrapporterede ulykker med personskade (Madsen m.fl. 2013). Forsøget var med almindelige cyklister, ikke ryttere, men mekanismen, at blive set, er den samme.
- **Kulfiber efter styrt:** se afsnit 14. Bemærk at en repareret kulfiberramme, -hjul eller -styr ifølge DCU ikke længere regnes for UCI-godkendt uden samtykke fra producenten (DCU 2026, kap. 5 §2.2).
- **Reservedele til træning:** slange (eller to), dækjern, minipumpe eller CO₂-patron, multiværktøj med kædeskiller og en ekstra kædesamler, telefon og nødkontakt. Kører rytteren tubeless, også et reparationssæt med propper. Vi har ikke prisundersøgt et samlet sæt.
- **Til løb:** spørg klubben, om der er servicevogn eller hjuldepot, før der investeres i reservehjul.

---

## 13. Udveksling (kort)

Udveksling behandles i en separat note. Kort: UCI afskaffede udvekslingsbegrænsningen for juniorer (U19) fra 2023. I Danmark gælder stadig maksimal udveksling for de yngre klasser: U17 7,33 m pr. pedalomdrejning og U15 6,68 m (DCU 2026, kap. 7 §1.15-4 og §1.16-5). Køber man brugt cykel eller nye dele til en U17-rytter, skal kassette og klinger kunne overholde grænsen.

---

## 14. Brugtmarkedet: hvad skal man tjekke?

Ryttere i vækst skifter ofte cykel, så brugt kan give mening. Tjek især:

**Størrelse og regler**

- Vælg rammestørrelse efter rytterens mål nu, ikke "til at vokse ind i". Sadelpind og frempind kan justere lidt, en for stor ramme kan ikke gøres mindre. Sammenlign stack og reach med rytterens nuværende cykel.
- Styret skal være mindst 40 cm bredt målt yderst (2026-regel, se afsnit 7).
- Hjul skal være UCI-godkendte eller traditionelle (afsnit 6). Maks. 65 mm fælghøjde i linjeløb.
- U17: ingen pladehjul eller hjul med under 12 eger, ingen triatlonstyr eller enkeltstartscykel.
- Udstyr til konkurrence skal være UCI-godkendt efter UCI's protokoller (DCU 2026, kap. 5 §2.2); DCU tolker reglerne lempeligere for ungdomsryttere (kap. 5 §1.2).

**Tegn på styrt**

- Nyt styrbånd eller nye kabler på en ellers ældre cykel kan betyde et styrt med fronten.
- Skrammer på styrender, bremsegreb, sadel og pedaler; bøjet gearhænger; hjul, der ikke sporer lige.
- Revner eller skader ved krankboks, styrfør, sadelrør og bagstivere.

**Kulfiber**

- "Mønttest": bank let med en mønt langs rørene. Sund kulfiber giver en klar lyd, delamineret kulfiber en død lyd. Testen afslører delaminering, men ikke fine revner langs fibrene.
- Har cyklen været i styrt, så få den inspiceret af et kulfiberværksted inden køb. Flere danske værksteder tilbyder inspektion og reparation.
- Husk DCU-reglen: en repareret kulfiberdel er ikke længere UCI-godkendt uden producentens samtykke.

**Slid**

- Kæde (kædelære), kassette, klinger, bremseklodser og -skiver, dæk, lejer i krank, styrfør og nav.
- Standard: 11- eller 12-gear, fælg- eller skivebremser, steckakser. Det afgør, hvilke reservedele og hjul der passer.

**Tyveri**

- Tjek stelnummeret hos politiet ("Tjek, om en cykel er efterlyst" på politi.dk eller i appen Politi). Registret dækker danske stelnumre på højst 19 tegn.

Vi har ikke fundet pålidelige tal for prisniveau eller værditab på brugte racercykler i Danmark og angiver derfor ingen.

---

## 15. Rangeret tabel: mest præstation pr. krone

Gevinster er angivet for en rytter alene ved 40 km/t (se metode). Sekunder er beregnet for en 15 km enkeltstart ved ca. 300 W. Kr./W er groft regnet ud fra prisspændet. "I feltet" angiver, hvor meget af gevinsten der er tilbage midt i et felt.

| #   | Tiltag                                                                | Ca. pris                                          | Gevinst ved 40 km/t alene                                             | ≈ sek. på 15 km              | ≈ kr./W                                          | I feltet                        | Sikkerhed                                  | Kilde                                                |
| --- | --------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------ | ------------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| 1   | Rens og smør kæden, især efter regn; kør aldrig med tør kæde          | 100–300 kr.                                       | 0–4 W efter tør tur; 6–12 W efter regn/mudder (målt ved 250 W)        | 0–7 / 10–20                  | under 50                                         | Hele gevinsten                  | Middel                                     | Friction Facts via CyclingTips 2020, Triathlete 2018 |
| 2   | Lavere og smallere position, når rytteren er i vinden                 | 0 kr. (bikefit 450–3.900 kr. valgfrit)            | 8–35 W (3–13 % af luftmodstanden)                                     | 13–60                        | 0                                                | Lille; stor alene               | Middel (retning høj, størrelse individuel) | Barry m.fl. 2015                                     |
| 3   | Tøj, der ikke blafrer (lynlås lukket, ingen løs vest)                 | 0 kr.                                             | ca. 10 W (blafrende vest)                                             | ca. 17                       | 0                                                | Lille til middel                | Middel                                     | Cyclingnews 2025                                     |
| 4   | Latexslanger i stedet for standard butyl                              | ca. 200 kr. pr. par                               | ca. 5–6 W pr. par                                                     | ca. 9                        | ca. 35–40                                        | Hele gevinsten                  | Høj                                        | bicyclerollingresistance.com, Cyclingnews 2025       |
| 5   | Hurtige dæk i stedet for billige                                      | ca. 800–950 kr. pr. par (merpris ca. 600–700 kr.) | ca. 20 W pr. par (tromle, omregnet)                                   | ca. 34                       | ca. 30–45                                        | Hele gevinsten                  | Middel-høj                                 | bicyclerollingresistance.com, Cyclingnews 2025       |
| 6   | Aero-skoovertræk                                                      | ca. 420–480 kr.                                   | ca. 6 W (±2,6 W)                                                      | ca. 10                       | ca. 65–75                                        | Lille                           | Middel                                     | Cyclingnews 2025                                     |
| 7   | Aero-landevejshjelm i stedet for ventileret                           | ca. 900–1.150 kr. (billigste aero i testen)       | ca. 4,5 W i snit (4,8 W i Van Rysel-eksemplet)                        | ca. 7–8                      | ca. 200–250 (ca. 90 som merpris ved udskiftning) | Lille                           | Middel-høj                                 | Cyclingnews 2025                                     |
| 8   | Skinsuit i stedet for løs trøje og bukser (klubbens godkendte design) | ca. 1.500–2.100 kr.                               | ca. 10 W (±2,6 W)                                                     | ca. 17                       | ca. 150–210                                      | Lille til middel                | Middel                                     | Cyclingnews 2025, DCU                                |
| 9   | Dybe kulfiberhjul (50–65 mm) i stedet for lave                        | ca. 8.700–17.600 kr.                              | ca. 4,6–6,6 W (målt uden rytter)                                      | ca. 8–11                     | ca. 1.300–3.800                                  | Lille                           | Middel                                     | Cyclingnews 2026                                     |
| 10  | Ny aero-racercykel i stedet for 10 år gammel aluminiumscykel          | ca. 70.000–110.000 kr. (testede modeller)         | ca. 17–32 W (med rytter, inkl. hjul m.m.)                             | ca. 28–55                    | ca. 2.200–6.600                                  | Lille                           | Middel                                     | Cyclingnews 2024                                     |
| 11  | Store pulleyhjul (OSPW)                                               | ca. 3.000–4.100 kr.                               | mindst 2,4 W ifølge producenten; ikke uafhængigt målt                 | ca. 4, hvis påstanden holder | mindst 1.250                                     | Hele gevinsten, hvis den findes | Lav                                        | CeramicSpeed via Brújula                             |
| 12  | Dyrere gruppesæt (105 Di2 → Dura-Ace Di2)                             | merpris ca. 17.000 kr. (listepris)                | ingen kendt watt-gevinst; ca. 550 g lettere (ca. 0,7 s pr. km på 5 %) | ca. 0 på fladen              | –                                                | –                               | Høj (lille effekt)                         | Cyclist 2026, Cyclistshub 2026, egen beregning       |
| 13  | Keramisk krankleje                                                    | ca. 1.750–3.100 kr.                               | ca. 0,03 W (bedste stål vs. bedste keramik)                           | 0                            | over 50.000                                      | –                               | Høj                                        | Friction Facts 2013 via BikeRadar                    |

**Gratis, men ikke kvantificeret:** dæktryk tilpasset vej og dækbredde, rygnummer sat fladt og stramt, og en skinsuit i rigtig størrelse (ikke for lille).

**Træningsværktøjer** (ingen fart i løb, ikke rangeret efter watt): pulsbælte ca. 356–699 kr.; wattmåler ca. 2.358–5.499 kr. Se afsnit 11.

**Samlet perspektiv:** Hurtige dæk, latexslanger, skinsuit og skoovertræk giver tilsammen godt 40 W alene ved 40 km/t for ca. 3.000–3.700 kr., mod 17–32 W for en ny topcykel til 70.000–110.000 kr. Gevinster kan ikke uden videre lægges sammen, så summen er en størrelsesorden, ikke et præcist tal. Cyclingnews vurderede, at netop skinsuit og fodtøj påvirker luftstrømmen så forskelligt, at deres gevinster rimeligt kan lægges sammen.

---

## 16. Hvad vi ikke kunne verificere

- Hvor meget et dårligt påsat rygnummer koster i watt.
- Hvor mange watt forkert dæktryk koster for en junior på dansk asfalt.
- Friktionsforskellen mellem Shimano 105, Ultegra og Dura-Ace.
- En uafhængig laboratoriemåling af store pulleyhjul.
- En ny, uafhængig vindtunnelsammenligning af billige aluminiumshjul og moderne dybe hjul med rytter på.
- Danske priser på Van Rysel RCR-F (kun britisk og fransk pris fundet) og et samlet sæt reservedele.
- Prisniveau og værditab på brugte racercykler i Danmark.
- Hvordan vindtunneltal for voksne præcist skalerer til mindre juniorryttere.

---

## Kilder

**Forskning**

- Blocken, B., van Druenen, T., Toparlar, Y. m.fl. (2018). Aerodynamic drag in cycling pelotons: new insights by CFD simulation and wind tunnel testing. _Journal of Wind Engineering and Industrial Aerodynamics_, 179, 319–337. https://doi.org/10.1016/j.jweia.2018.06.011 – åben version: https://pure.tue.nl/ws/files/101844924/1_s2.0_S0167610518303751_main.pdf
- Martin, J. C., Milliken, D. L., Cobb, J. E., McFadden, K. L., & Coggan, A. R. (1998). Validation of a mathematical model for road cycling power. _Journal of Applied Biomechanics_, 14(3), 276–291. https://doi.org/10.1123/jab.14.3.276
- Barry, N., Burton, D., Sheridan, J., Thompson, M., & Brown, N. A. T. (2015). Aerodynamic performance and riding posture in road cycling and triathlon. _Proceedings of the IMechE, Part P_, 229(1), 28–38. https://doi.org/10.1177/1754337114549876 – omtale med tal: https://road.cc/content/news/133598-want-ride-faster-hunker-down-hoods
- Bini, R., & Priego-Quesada, J. (2022). Methods to determine saddle height in cycling and implications of changes in saddle height in performance and injury risk: A systematic review. _Journal of Sports Sciences_, 40(4), 386–400. https://doi.org/10.1080/02640414.2021.1994727
- Swart, J., Lamberts, R. P., Derman, W., & Lambert, M. I. (2009). Effects of high-intensity training by heart rate or power in well-trained cyclists. _Journal of Strength and Conditioning Research_, 23(2), 619–625. https://pubmed.ncbi.nlm.nih.gov/19204572
- Robinson, M. E., Plasschaert, J., & Kisaalita, N. R. (2011). Effects of high intensity training by heart rate or power in recreational cyclists. _Journal of Sports Science & Medicine_, 10(3). https://pmc.ncbi.nlm.nih.gov/articles/PMC3737823/
- Bland, M. L., & Rowson, S. (2021). A price-performance analysis of the protective capabilities of wholesale bicycle helmets. _Traffic Injury Prevention_, 22(6), 478–482. https://doi.org/10.1080/15389588.2021.1929943 – omtale: https://helmets.org/virginia-techs-star-helmet-ratings/
- Madsen, J. C. O., Andersen, T., & Lahrmann, H. S. (2013). Safety effects of permanent running lights for bicycles: A controlled experiment. _Accident Analysis & Prevention_, 50, 820–829. https://vbn.aau.dk/en/publications/safety-effects-of-permanent-running-lights-for-bicycles-a-control/

**Uafhængige test**

- Cyclingnews (april 2025). Wind tunnel tested: This aero kit can save you more watts than a $14,500 bike for 3% of the price. https://www.cyclingnews.com/features/wind-tunnel-clothing-test-budget-vs-aero-jersey-skinsuit-vs-super-suit-socks-vs-no-socks-and-more/
- Cyclingnews (juli 2025). Wind tunnel tested: 47 helmets go head to head. https://www.cyclingnews.com/features/wind-tunnel-tested-the-worlds-biggest-aero-helmet-grouptest/
- Cyclingnews (august 2024). Wind tunnel tested: 11 superbikes go head to head. https://www.cyclingnews.com/features/wind-tunnel-tested-11-superbikes-go-head-to-head/
- Cyclingnews (juli 2026). What are the fastest UCI-legal road wheels? https://www.cyclingnews.com/cycling-tech-components/wheels-tyres/what-are-the-fastest-uci-legal-road-wheels-wind-tunnel-testing-the-big-name-brands-and-chinese-contenders/
- bicyclerollingresistance.com: Continental Grand Prix 5000. https://www.bicyclerollingresistance.com/road-bike-reviews/continental-grand-prix-5000-2018
- bicyclerollingresistance.com: Schwalbe Lugano II. https://www.bicyclerollingresistance.com/road-bike-reviews/schwalbe-lugano-2-2020
- bicyclerollingresistance.com: Continental Grand Prix 5000 S TR (inkl. punkteringsmodstand). https://www.bicyclerollingresistance.com/road-bike-reviews/continental-grand-prix-5000-s-tr
- bicyclerollingresistance.com: Grand Prix 5000 S TR tubeless vs. inner tubes. https://www.bicyclerollingresistance.com/specials/grand-prix-5000-s-tr-tubeless-vs-tubes
- bicyclerollingresistance.com: Top 3 fastest tubeless vs. latex (and butyl). https://www.bicyclerollingresistance.com/specials/top-3-fastest-tubeless-vs-tubes
- bicyclerollingresistance.com: Grand Prix 5000 23–32 mm comparison. https://www.bicyclerollingresistance.com/specials/grand-prix-5000-comparison
- SILCA: Rolling resistance and impedance (Tom Anhalts data). https://silca.cc/blogs/silca/part-4b-rolling-resistance-and-impedance
- CyclingTips (maj 2020). Lab testing confirms: Clean your damn chain (Friction Facts' data). https://web.archive.org/web/2021/https://cyclingtips.com/2020/05/how-many-watts-does-a-dirty-chain-steal/
- Triathlete (august 2018). Cleaning your chain is more important than you think. https://www.triathlete.com/gear/bike/cleaning-your-chain-is-more-important-than-you-think/
- BikeRadar (december 2013). Friction Facts: measuring bottom bracket drag. https://www.bikeradar.com/features/friction-facts-measuring-bottom-bracket-drag
- Brújula Bike: Oversized derailleur cages, CeramicSpeed vs. Kogel. https://en.brujulabike.com/oversized-derailleur-cages-ceramicspeed-vs-kogel-kolossos/
- American College of Cardiology (2017). Wrist-worn heart rate monitors less accurate than standard chest strap. https://www.acc.org/about-acc/press-releases/2017/03/08/14/02/wrist-worn-heart-rate-monitors-less-accurate-than-standard-chest-strap
- Cycling Weekly: Wrist-based versus chest strap heart sensors. https://www.cyclingweekly.com/fitness/wrist-based-versus-chest-strap-heart-sensors-which-are-best-can-you-trust-the-data

**Regler og myndigheder**

- Danmarks Cykle Union: Sportslige regler 2026 (endelig version 17.02.2026). https://www.cyklingdanmark.dk/fileadmin/files/PDFer/Sporstlige_regler_2026_-_Endelig_versin_-_17.02.2026.pdf
- UCI: List of approved wheels (version april 2026). https://assets.ctfassets.net/761l7gh5x5an/7dQ7IiFj3lhufROkpi1RpV/70401459d2f331c27e6caa81a96cf10d/Liste_des_roues_homologu%C3%83_es_depuis_01.01.2024_-_List_of_approved_wheels_since_01.01.2024_-_FRA-ENG_20260407.pdf
- BikeRadar: UCI tech rules 2026 (fælghøjde, styrbredde). https://www.bikeradar.com/news/uci-tech-rules-2026
- Cyclingnews: UCI scraps restricted gearing for junior racers. https://www.cyclingnews.com/news/uci-scraps-junior-gearing-restrictions-for-2023/
- Færdselsstyrelsen: Krav til cykler. https://www.fstyr.dk/privat/krav-til-koeretoejer/cykler
- Politiet: Tjek, om en cykel er efterlyst. https://politi.dk/service-og-tilladelser/cykler-og-koeretoejer/tjek-om-en-cykel-er-efterlyst
- Virginia Tech Helmet Lab: Bicycle helmet ratings. https://www.helmet.beam.vt.edu/bicycle-helmet-ratings.html

**Vægt og listepriser på gruppesæt**

- Cyclist (februar 2026, opdateret marts 2026): Shimano groupsets compared. https://www.cyclist.co.uk/buying-guides/buyers-guide-shimano-groupsets
- Cyclistshub (april 2026): Shimano 105 vs. Ultegra vs. Dura-Ace. https://www.cyclistshub.com/shimano-105-vs-ultegra-vs-dura-ace/

**Brugtkøb og kulfiber**

- My Next Bike: How to spot crash damage on a used bike. https://mynextbike.co.uk/blogs/articles/spot-crash-damage-used-bike
- Danske kulfiberværksteder (eksempler): https://carbon-rep.dk/reparation.html og https://bikepro.dk/jeg-tilbyder/cykel-carbon-reparation/

**Priser (oktober 2026)**

- ECB referencekurser 2. oktober 2026: https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html
- Continental GP5000 S TR 28 mm, PriceRunner: https://www.pricerunner.dk/pl/1416-3201140671/Cykeldele/Continental-Grand-Prix-5000-S-TR-700x28C-(28-622)-Sammenlign-Priser
- Schwalbe Lugano II 25 mm, PriceRunner: https://www.pricerunner.dk/pl/1416-3200142482/Cykeldele/Schwalbe-Lugano-II-K-Guard-700x25C-(25-622)-Sammenlign-Priser
- Vittoria Competition latexslange: https://cykelexperten.dk/vittoria-competition-latex-slange-700x25-28c-presta-48mm/
- Kalas skinsuits: https://www.kalaswear.dk/cykeldragter-til-m-nd-endurance-cykeldragter/
- Velotoze Aero skoovertræk: https://probikeshop.dk/products/velotoze-aero-skoovertraek-sort
- Van Rysel RCR-F MIPS (britisk pris): https://www.decathlon.co.uk/p/aero-road-cycling-helmet-rcr-f-mips-van-rysel-roubaix/343600/c4c24m8936552
- Elitewheels Drive 50D (Cycling Weekly): https://www.cyclingweekly.com/reviews/bike-components/elitewheels-50d-carbon-road-wheels-review-lighter-and-half-the-price-of-even-hunt-wheels
- CeramicSpeed krankleje: https://ceramicspeed.com/collections/bottom-brackets-road
- Favero Assioma Uno, PriceRunner: https://www.pricerunner.dk/pl/1416-5191704/Cykeldele/Favero-Assioma-UNO-Sammenlign-Priser
- Favero Assioma Duo: https://www.cykelpartner.dk/pedaler/favero-assioma-duo-pedaler-med-wattmaaler
- Polar H10, PriceRunner: https://www.pricerunner.dk/pl/1438-3865510/Wearables/Polar-H10-HR-Sammenlign-Priser
- Squirt kædevoks: https://www.thansen.dk/cykel/vaerktoj-og-plejemidler/pleje-og-vedligehold/squirt-voks-smoremiddel-til-kaede-120ml/n-233949317/pn-243446241
- Bikefit-priser (eksempler): https://www.fitbike.dk/, https://bike4fit-blog.com/2019/01/12/priser-aabningstider-bikefit/, https://velofit.dk/pages/bikefit, https://copenhagenbikefit.onlinebooq.dk/
