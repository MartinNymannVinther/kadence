# Styrke og træning uden for cyklen: evidens, dosering og skoler

Researchnotat, november 2026 (kilderne er hentet og læst 9. november 2026).

**Spørgsmålet.** Hvad gør styrketræning og anden træning uden for cyklen
for landevejsryttere, hvordan skal den doseres og periodiseres gennem
sæsonen, hvordan afhænger den af alder og køn, og hvad betyder det for en
AI, der sammensætter programmer og uger i Kadence.

**Baseline.** Notatet bygger videre på tre noter, som ikke gentages her:

- `docs/research/dcu-traeningsanbefalinger.md` afsnit 6 (DCU/Team
  Danmarks styrkeprogrammer for U17, U19 og U23);
- `docs/research/traeningsparadigmer.md` afsnit 5 (DCU, NCF, SCF, BDR og
  Lloyd 2014 er uenige om, hvornår tung styrke begynder; Valenzuela 2023);
- `docs/research/motionist-pas-og-programmer.md` afsnit 4 (Rønnestad
  2010a/b, Vikmoen 2016/2017, Nichols 2003/2011, Olmedillas 2012, Hinton
  2015, WHO 2020, AHA 2023 og Kadences to styrkeprogrammer).

**Metode og mærker.** Videnskabelige artikler er slået op i Europe PMC og
PubMed; hvor det er markeret, er den fulde tekst læst. Forbundsdokumenter
er hentet som PDF.

- **[læst]**: hentet og læst i fuld tekst (for lange artikler: de første
  100.000 tegn, hvilket dækker resultater og diskussion).
- **[abstract]**: kun abstractet er læst, og tallene stammer derfra.
- **[sekundær]**: oplysningen kommer fra en anden kilde end originalen.
- **[søgning]**: kun set i et søgeresultat. Ikke verificeret og må ikke
  bruges i kode.
- **(beregnet)**: vores egen regning ud fra kildens tal.

Effektstørrelser er standardiserede middelforskelle (SMD/Hedges' g),
medmindre andet står. Tommelfingerregel: 0,2 lille, 0,5 moderat, 0,8
stor.

---

## 0. Kort svar

1. **Tung styrke (4-10 RM, 2-3 sæt, 2 pas om ugen i 8-12+ uger) gør
   veltrænede ryttere bedre.** Den seneste meta-analyse i cykelryttere
   (Llanos-Lagos 2025, 17 studier, 262 ryttere) finder en moderat effekt
   på præstation (g = 0,46), på anaerob effekt (0,56) og på økonomi
   (0,35) og ingen effekt på VO2max. Evidensens sikkerhed er **lav**
   (små studier, sjældent randomiseret). Rønnestads studier viser, at
   gevinsten er størst sent i lange ture og i spurten efter dem.
2. **Eksplosiv styrke med let belastning og korte programmer (≤6 uger,
   lav volumen) giver ikke den gevinst** i cykling. Rønnestad & Mujika
   2014 anbefaler tung styrke med maksimal hastighed i den koncentriske
   fase, ikke eksplosiv træning.
3. **Interferens er lille.** Udholdenhed oven i styrke dæmper hverken
   maksimal styrke eller muskelvækst nævneværdigt (Schumann 2022); kun
   eksplosiv styrke dæmpes (SMD −0,28), mest når begge dele ligger i
   samme pas. Læg styrke først på dagen og mindst 3 timer før cyklingen.
   Mænd ser ud til at tabe mere benstyrke end kvinder (Huiberts 2024).
4. **Vedligehold er afgørende:** ét tungt pas om ugen (lav volumen, høj
   intensitet) holder gevinsten i sæsonen (Rønnestad 2010b); hver 14.
   dag er for lidt (Rønnestad 2011, fodbold), og 8 uger uden styrke
   fjerner det meste af forspringet (Rønnestad 2016).
5. **Unge:** styrketræning er sikker og gavnlig under kyndig vejledning
   (Lloyd 2014, Faigenbaum 2009, Malina 2006). Teknik før belastning.
   Før og omkring vækstspurten virker hop og hurtige bevægelser med lav
   belastning bedst; efter vækstspurten kræver fremgang tunge
   belastninger (≥80 % 1RM) (Moran 2017, Peitz 2018, McQuilliam 2020).
   Skolerne er uenige om _hvornår_: DCU fra U17, NCF fra 18 år,
   Olympiatoppen "mindste effektive dosis".
6. **Knoglerne er cykelsportens svage punkt, også hos unge.** 27 % af
   mandlige ryttere under 20 år på eliteniveau har lav knogletæthed i
   lænden, og det stiger til 64 % midt i karrieren (Hilkens 2023).
   Tidligere stødsport beskytter. Det eneste lodtrækningsforsøg i
   ryttere (Hilkens 2024) viser, at 5 minutters hop fem gange om ugen
   bevarer lårbenshalsen. Tung styrke alene ser **ikke** ud til at være
   nok (Klomsten Andersen 2018).
7. **Masters:** styrke og især _power_ bør prioriteres med alderen. Høj
   hastighed i løftet giver tre gange så stor power-gevinst som
   traditionel styrke (Straight 2016). Tre ugers styrke fjernede
   aldersforskellen i økonomi mellem 51-årige og 25-årige (Louis 2012).
8. **Core, smidighed og udstrækning har svag evidens for præstation.**
   Styrketræning forebygger skader (RR 0,32, Lauersen 2014); udstrækning
   gør ikke (RR 0,96). Core kan give en mere stabil position, men i det
   eneste direkte sammenligningsforsøg i landevejsryttere slog
   almindelig styrke core på alle mål (Sitko 2023, preprint).
9. **Køn:** kvinder og mænd får samme relative styrke- og
   muskelgevinst (Roberts 2020); kvinder svarer lige så godt på tung
   styrke i cykling (Vikmoen 2016). Menstruationscyklus påvirker ikke
   styrketilpasningen målbart (McNulty 2020, Colenso-Semple 2023).
10. **For Kadence:** DCU's ramme (2-3 pas november-marts, 1 pas i
    sæsonen, 48 timer imellem) stemmer med evidensen. Det, der mangler,
    er hop for knoglerne hele året, power for masters, og regler for,
    hvor styrke ligger i ugen. Se afsnit 11.

---

## 1. Effekten på cykelpræstation

### Konklusion

Tung styrke forbedrer præstationen i 20-45 minutters tests og
spurtevnen efter lange ture hos veltrænede og eliteryttere, uden at øge
kropsvægten eller sænke VO2max. Effekten på økonomi målt traditionelt
(5 min submaksimalt) er tvetydig; den viser sig først efter ~2 timers
cykling. Alle meta-analyser bedømmer evidensen som lav til moderat.

### Fund

**Oversigter og meta-analyser**

- **Rønnestad & Mujika 2014** (Scand J Med Sci Sports 24:603-612)
  [læst]: "heavy strength training is recommended for improving cycling
  economy" og der er "most compelling evidence of an additive effect on
  cycling performance when heavy strength training is used". Tabel 1
  (s. 607): evidens for forbedret økonomi, anaerob kapacitet,
  laktattærskel, udskudt træthed, maksimal styrke, RFD og
  udholdenhedspræstation: **ja**; forbedret VO2max: **nej**; øget
  kropsvægt, nedsat kapillarisering eller oxidativ enzymaktivitet:
  **nej**. De studier, der ikke fandt effekt i cykling, brugte "explosive
  strength training with low external load (Bastiaans et al., 2001), low
  volume of heavy strength training (Bishop et al., 1999), or lasted for
  a short duration (Levin et al., 2009)". De fleste interventioner varede
  kun 8-12 uger; forfatterne maner til forsigtighed om langtidseffekter.
- **Llanos-Lagos, Ramirez-Campillo & Sáez de Villarreal 2025** (Eur J
  Appl Physiol 126:193-222, PMID 40632222) [læst]: 17 studier, 262
  deltagere (60 kvinder), tung styrke defineret som ≥80 % 1RM, 5-25 uger
  (gns. 13,6), 1-3 pas/uge (gns. 2,2), 15-48 pas i alt (gns. 27,7).
  Hedges' g mod kontrol: **cykeløkonomi 0,353** (p = 0,012; artiklen
  angiver et konfidensinterval med forkert fortegn), **anaerob effekt
  0,560** (0,097-1,023), **præstation (TT + tid til udmattelse) 0,463**
  (0,109-0,817), VO2max −0,041 (n.s.), pVO2max 0,164 (n.s.), MMSS 0,069
  (n.s.), anaerob kapacitet 0,235 (n.s.). Ingen moderatorer var
  signifikante (køn, niveau, varighed, frekvens, antal pas; alle p ≥
  0,17). GRADE: **lav** sikkerhed for alle udfald (PEDro gns. 5,53).
  Praktisk: "effective strength training interventions may require 8
  weeks and/or 2 training sessions per week". De fleste studier
  erstattede cykeltræning med styrke i stedet for at lægge oveni.
- **Berryman m.fl. 2018** (Int J Sports Physiol Perform 13:57-63, PMID 28459360) [abstract]: 28 studier i mellem- og langdistance (løb,
  cykling, ski). Netto SMD **0,52** (0,33-0,70) for præstation;
  energiomkostning 0,65; maksimal kraft 0,99; maksimal power 0,50.
  Træning for maksimal kraft gav større gevinst end andre intensiteter,
  og effekten var ens på tværs af niveau.
- **Lum & Barbosa 2019** (IJSPP 14:1318-1330, PMID 31672926) [abstract]:
  28 RCT'er i olympiske tidsidrætter. Samlet ES **0,59**; tung styrke
  0,30; veltrænede atleter 0,62. Alder og varighed var ikke signifikante
  moderatorer.
- **Beattie m.fl. 2014** (Sports Med 44:845-865, PMID 24532151)
  [abstract]: 26 studier i veltrænede udholdenhedsatleter (≥6 t/uge
  eller VO2max ≥50). Styrke forbedrede tidskørsel, økonomi, VO2max og
  vMART. Anbefaler programmer over >6 måneder.
- **Aagaard & Andersen 2010** (Scand J Med Sci Sports 20 Suppl 2:39-47,
  PMID 20840561) [abstract]: styrke kan forbedre både lang (>30 min) og
  kort (<15 min) udholdenhedskapacitet, især med høj volumen og tung
  modstand; mekanismer: flere type IIA-fibre, højere maksimal styrke og
  RFD.
- **Yamamoto m.fl. 2010** (J Strength Cond Res 24:560-566) [søgning]: 5
  studier i højt trænede landevejsryttere; at _erstatte_ en del af
  cykeltræningen med styrke forbedrer sandsynligvis tidskørsel og
  maksimal effekt; de to studier uden effekt lagde styrke _oveni_.

**Enkeltstudier i cykelryttere (kronologisk)**

- **Bastiaans m.fl. 2001** (Eur J Appl Physiol 86:79-84, PMID 11820327)
  [abstract]: 14 ryttere, 9 uger, 37 % af træningen erstattet med
  eksplosiv styrke, matchet volumen (8,8 vs 8,9 t/uge). Ingen
  gruppeforskel i tidskørsel eller Wmax efter 9 uger; eksplosiv styrke
  forhindrede et fald i kortvarig effekt (STP), som kontrolgruppen fik.
- **Paton & Hopkins 2005** (JSCR 19:826-830, PMID 16287351) [abstract]:
  18 ryttere, 4-5 uger, 12 pas à 30 min med eksplosive etbens hop (3 ×
  20 pr. ben) vekslende med tunge cykelspurter (5 × 30 s ved 60-70 rpm).
  Relativt til kontrol: 1 km-effekt +8,7 % (±2,5), 4 km +8,1 % (±4,1),
  spidseffekt +6,8 % (±3,6), laktatprofil-effekt +3,7 % (±4,8),
  iltomkostning −3,0 % (±2,6). Spurteffekten i træningen fladede ud efter
  8-12 pas. Bemærk: "eksplosiv" her er hop _plus_ tunge spurter på
  cyklen, ikke løft.
- **Jackson, Hickey & Reiser 2007** (JSCR 21:289-295, PMID 17313261)
  [abstract]: 23 klubryttere, 10 uger, tung/få gentagelser mod let/mange
  gentagelser mod kun cykling. Begge styrkegrupper blev stærkere (tung
  mest i benpres), men hverken laktat eller økonomi ændrede sig mod
  kontrol.
- **Levin, McGuigan & Laursen 2009** (JSCR 23:2280-2286, PMID 19826297)
  [abstract]: 14 veltrænede mænd, 6 uger, 3 pas/uge undulerende styrke.
  1RM squat steg; 30 km-tidskørsel ændrede sig ikke mod kontrol; den
  afsluttende 1 km-spurt blev **dårligere** (−5 % mod +11 %). Rønnestad &
  Mujika tolker det som for kort og for meget (3 pas/uge).
- **Sunde m.fl. 2010** (JSCR 24:2157-2165, PMID 19855311) [abstract]: 13
  gennemførte (10 mænd, 3 kvinder), halv squat 4 × 4RM, 3 pas/uge i 8
  uger oveni cykling. 1RM +14,2 %, RFD +16,7 %, cykeløkonomi +4,8 %,
  arbejdseffektivitet +4,7 %, tid til udmattelse ved maksimal aerob
  effekt +17,2 %; VO2max, kadence og kropsvægt uændret. Kontrol +1,4 % i
  effektivitet.
- **Rønnestad, Hansen & Raastad 2010a** (EJAP 108:965-975, PMID 19960350) [abstract]: 20 veltrænede, 12 uger, 3 × 4-10RM i fire
  benøvelser 2 pas/uge. Større lårtværsnit, isometrisk kraft og
  Wingate-spidseffekt end kontrol; effekt ved 2 mmol laktat og 40 min
  gennemsnitseffekt steg i E+S (kontrol: tendens, p = 0,057); VO2max steg
  ens; ingen vægtøgning.
- **Rønnestad, Hansen & Raastad 2010b** (EJAP 110:1269-1282, PMID 20799042) [abstract]: se afsnit 3 (vedligehold).
- **Rønnestad m.fl. 2011** (Scand J Med Sci Sports 21:250-259, PMID 19903319) [abstract]: 20 veltrænede (11 E+S inkl. 2 kvinder, 9 E), 12
  uger som 2010a. I den sidste time af 185 min ved 44 % af maksimal aerob
  effekt faldt iltoptag, puls, laktat og RPE mere i E+S; 5 min all-out
  efterfølgende steg fra 371 ± 9 til 400 ± 13 W (p < 0,05), ca. +8 %
  (beregnet), ingen ændring i E.
- **Aagaard m.fl. 2011** (Scand J Med Sci Sports 21:e298-e307, PMID 21362056) [abstract]: 14 unge mandlige eliteryttere (U23-landshold), 16
  uger. MVC og RFD +12-20 % kun med styrke; VO2max uændret; 5 min
  +3-4 % i begge grupper; **45 min +8 % kun med styrke**; type IIA ↑ og
  IIX ↓ kun med styrke; fiberareal og kapillarisering uændret. Dette er
  det eneste studie i den aldersgruppe, Kadence sigter på (U23).
- **Rønnestad m.fl. 2015** (Scand J Med Sci Sports 25:e89-e98, PMID 24862305) [abstract]: 16 eliteryttere, 25 uger. E+S forbedrede
  isometrisk halv squat, mager benmasse, Wingate, Wmax, effekt ved 4
  mmol og 40 min-effekt; Wmax og 40 min bedre end E. Spidsmomentet i
  pedalomgangen kom **tidligere**, og det korrelerede med 40 min-gevinsten
  (r = 0,66). Hverken VO2max eller økonomi ændrede sig.
- **Rønnestad m.fl. 2016** (IJSPP 11:727-735, PMID 26641569) [abstract]:
  se afsnit 3 (ophør).
- **Rønnestad m.fl. 2017** (J Sports Sci 35:1435-1441, PMID 27486014)
  [søgning]: 12 mod 8 eliteryttere, 10 uger, 2 pas/uge fra 10RM til 4RM,
  ~12 t/uge cykling. Større gevinst i isometrisk styrke og
  Wingate-middeleffekt; 40 min 4 ± 6 % mod −1 ± 6 % (p = 0,13).
- **Vikmoen m.fl. 2016** (Scand J Med Sci Sports 26:384-396, PMID 25892654) [abstract]: 19 kvindelige ryttere, 11 uger. E+S forbedrede
  1RM etbens benpres, quadriceps-tværsnit, 40 min-effekt, udnyttelse af
  VO2max og økonomi; IIAX-IIX ↓, IIA ↑. Præstationsændring korrelerede
  med tværsnitsændring (r = 0,73) og fiberskift (r = −0,63).
- **Mujika, Rønnestad & Martin 2016** (IJSPP 11:283-289, PMID 27068517)
  [abstract]: oversigt; kvindelige ryttere med mere mager benmasse havde
  4-9 % højere maksimal effekt pr. kg mager masse fra 1 s til 10 min.
  "Strength maintenance is essential during the competition season."

**Mekanismer** (Rønnestad & Mujika 2014, s. 605-606) [læst]: udskudt
aktivering af de mindre økonomiske type II-fibre, fordi type I-fibrene
bliver stærkere (forklarer, hvorfor økonomien først forbedres efter ~2
timer); lavere relativ kraft pr. pedaltråd (lavere EMG hos stærkere
ryttere, Bieuzen 2007); IIX → IIA (Aagaard 2011); bedre glykogenøkonomi
(Goreham 1999: højere PCr og glykogen og lavere laktat efter 30 min ved
72 % VO2max); højere RFD og måske bedre blodgennemstrømning.

### Slutninger

- Det, der virker i cykling, er **tung styrke for benene, flere øvelser,
  2 pas om ugen, mindst 8-12 uger**, med maksimal indsats i den
  koncentriske fase. Det er præcis DCU's og Kadences nuværende skabelon.
- Gevinsten viser sig i det, et løb afgøres på: effekten efter 3 timer,
  spurten, og 40 minutters tærskelarbejde. Den viser sig sjældent i en
  5-minutters økonomitest, så Kadence skal ikke love "bedre økonomi" som
  det primære.
- Korte programmer (≤6 uger) og 3 tunge pas om ugen oveni fuld
  cykeltræning (Levin 2009) kan gøre spurten dårligere. Det taler for
  DCU's "mindst 30 pas pr. vinter, ellers lad være".

### Huller

- Ingen meta-analyse i **juniorer**; Aagaard 2011 er U23 og 14 personer.
- Ingen studier af styrke i ryttere over 25 uger; langtidseffekten (år)
  er ukendt (Rønnestad & Mujika; Rønnestad 2022-caserapport, [søgning]).
- Bishop 1999 (kvinder, 12 uger, ingen effekt) kunne ikke slås op i
  Europe PMC og er kun kendt gennem Rønnestad & Mujika.

---

## 2. Samtidig træning: interferens og rækkefølge

### Konklusion

Interferensen, Hickson beskrev i 1980 i utrænede, er lille hos trænede,
rammer eksplosiv styrke mere end maksimal styrke og muskelvækst, og
forstærkes, når styrke og udholdenhed ligger i samme pas. Styrke først
på dagen med mindst 3 timers mellemrum er det bedst underbyggede råd.

### Fund

- **Hickson 1980** (Eur J Appl Physiol Occup Physiol 45:255-263, PMID 7193134) [abstract]: tre grupper i 10 uger: styrke (30-40 min, 5
  dage/uge), udholdenhed (40 min, 6 dage/uge) og begge. VO2max steg ~25 %
  (cykel) og ~20 % (løb) i E og S+E. Styrkegevinsten i S+E fulgte S i 7
  uger, fladede så ud og **faldt i uge 9-10**. Det er det oprindelige
  "interferensfænomen", i utrænede og med en samlet belastning (11
  pas/uge), ingen rytter ville bruge.
- **Wilson m.fl. 2012** (JSCR 26:2293-2307, PMID 22002517) [abstract]:
  21 studier, 422 effektstørrelser. Hypertrofi: styrke alene 1,23,
  samtidig 0,85; styrke: 1,76 mod 1,44; power: 0,91 mod 0,55. **Løb, men
  ikke cykling,** som udholdenhedsform gav signifikant tab af hypertrofi
  og styrke. Frekvens (r = −0,26 til −0,35) og varighed (r = −0,29 til
  −0,75) af udholdenhedstræningen korrelerede negativt med gevinsterne.
- **Schumann m.fl. 2022** (Sports Med 52:601-612, PMID 34757594)
  [abstract; fuld tekst hentet, afsnittene om rækkefølge læst]: 43
  studier. Maksimal styrke SMD −0,06 (−0,20 til 0,09; p = 0,45),
  **eksplosiv styrke −0,28 (−0,48 til −0,08; p = 0,007)**, hypertrofi
  −0,01 (n.s.). Dæmpningen af eksplosiv styrke var tydeligere i samme pas
  (≤20 min imellem, p = 0,043) end med ≥3 timers adskillelse (p > 0,05).
  Udholdenhedsform, frekvens (>5 vs <5 pas/uge), træningsstatus og alder
  (<40 vs >40) var ikke signifikante moderatorer. Der var "no evidence
  for an order-dependent" effekt inden for samme pas.
- **Lundberg m.fl. 2022** (Sports Med 52:2391-2403, PMID 35476184)
  [abstract]: fibertværsnit, 15 studier. Samlet −0,23 (−0,46 til 0,00; p
  = 0,050); type I −0,34 (n.s.); type II −0,13 (n.s.). Type I ved **løb**
  −0,81 (−1,26 til −0,36); ingen effekt ved cykling.
- **Huiberts, Wüst & van der Zwaard 2024** (Sports Med 54:485-503, PMID 37847373) [læst]: 59 studier, 1.346 deltagere. Benstyrke (samtidig mod
  styrke alene): **mænd −0,43 (−0,64 til −0,22), kvinder 0,08 (−0,34 til
  0,49)**, forskel p = 0,03. Power: mænd −0,27, kvinder −0,52 (forskel
  n.s.), samlet −0,35. VO2max (samtidig mod udholdenhed alene):
  utrænede **−0,35** (−0,70 til −0,01), trænede 0,18, højt trænede 0,01
  (p = 0,04 mellem grupper). Kun 2 studier (5 %) havde højt trænede
  udholdenhedsatleter; kun 4 hypertrofistudier, alle i mænd. Råd: "Male
  athletes should be extra cautious when aiming to improve lower-body
  strength."
- **Eddens, van Someren & Howatson 2018** (Sports Med 48:177-188, PMID 28917030) [abstract]: 10 studier ≥5 uger, samme pas. **Styrke før
  udholdenhed** gav 6,91 procentpoint mere dynamisk benstyrke (1,96-11,87;
  p = 0,006); ingen forskel i hypertrofi, statisk styrke, VO2max eller
  fedtprocent.
- **Murlasits, Kneffel & Thalib 2018** (J Sports Sci 36:1212-1219, PMID 28783467) [abstract]: styrke først gav 3,96 kg mere i 1RM for benene
  (0,81-7,10); ingen effekt af rækkefølge på VO2max (0,39 ml/kg/min, −1,03
  til 1,81).
- **Rønnestad & Mujika 2014** (s. 607) [læst]: "it is common to get
  'heavy' and 'sore' legs in the first days after the strength training
  session. Therefore, it is important to commence at low level with the
  concurrent endurance training during the first 2–3 weeks". Bedst at
  begynde lige efter sæsonens slutning, "when endurance training has a
  lower priority".
- **DCU** (baseline-note, afsnit 6.1): styrke så tidligt på dagen som
  muligt, cykling så sent som muligt, gerne 5-6 timer imellem, min. 48
  timer mellem styrkepas.

### Slutninger

- Det meste af cyklingen er lavintensiv og koncentrisk, hvilket er den
  skånsomste udholdenhedsform for styrkegevinsten (Wilson 2012, Lundberg
  2022). Interferens er et mindre problem for ryttere end for løbere.
- Regel for Kadence: styrke på en dag med let cykling eller som første
  pas, aldrig i samme pas som intervaller, og ≥3 timer (DCU: 5-6 timer)
  før cyklingen. De første 2-3 uger af et styrkeforløb skal
  cykelbelastningen ned, hvilket passer med DCU's november-start.
- Da mænd ser ud til at tabe mere benstyrke ved samtidig træning, er der
  ingen grund til at give kvinder et "lettere" program; snarere omvendt.

### Huller

- Ingen studier af rækkefølge _inden for en uge_ (styrke dagen før eller
  efter intervaller) i ryttere; rådet om 48 timer er praksis, ikke
  forsøg.
- Højt trænede udholdenhedsatleter er næsten fraværende i
  interferenslitteraturen (2 af 59 studier).

---

## 3. Dosis gennem sæsonen: opbygning, vedligehold, ophør

### Konklusion

Opbygning: 2 pas/uge, 2-3 sæt af 4-10 RM i 3-4 benøvelser, 2-3 min
pause, 10-12 uger (gerne længere), undulerende (en tung og en lettere
dag). Vedligehold: 1 pas/uge med lav volumen og høj intensitet holder
gevinsten hele sæsonen; hver 14. dag gør ikke; nul pas i 8 uger giver
tab. Norske landstrænere og Olympiatoppen praktiserer præcis det.

### Fund

- **Rønnestad & Mujika 2014**, "Practical recommendations" (s. 607)
  [læst]: øvelser skal ligne pedaltrådet og bruge de samme muskler;
  _intenderet_ hastighed afgør tilpasningen, så "focus on performing the
  concentric phase of the lift as quick as possible" (Heggelund 2013:
  bedre styrke, RFD og økonomi efter 8 uger med maksimal koncentrisk
  hastighed end moderat). "Two strength training sessions per week,
  designed as a 'daily undulating periodized program' is typically enough
  to achieve a sufficient increase in strength during a 12-week period.
  Athletes are advised to perform between 4 RM and 10 RM and 2–3 sets
  with approximately 2–3 min of rest between sets." Teknik med lette
  vægte først. I sæsonen: "approximately one strength training session
  per week (low volume) with high intensity seems to maintain the
  previous strength training adaptations".
- **Rønnestad, Hansen & Raastad 2010b** (PMID 20799042) [abstract]: 6
  mod 6 veltrænede. 12 ugers opbygning (2 pas/uge), derefter **1 pas/uge
  i de første 13 uger af sæsonen**. Lårtværsnit og 1RM blev bevaret;
  Wingate-spidseffekt, effekt ved 2 mmol, maksimal aerob effekt og 40
  min-effekt steg fra start til uge 13 i sæsonen, de to sidste mere end
  i E.
- **Rønnestad, Nymark & Raastad 2011** (JSCR 25:2653-2660, PMID 21873897) [abstract], **fodbold**: efter 10 ugers opbygning (2
  pas/uge) holdt én gang om ugen styrke og 40 m-sprint i 12 uger, mens
  **hver anden uge tabte begge dele** (p < 0,05). Analogi, ikke ryttere.
- **Rønnestad m.fl. 2016** (PMID 26641569) [abstract], eliteryttere
  (VO2max 77 ± 6): 25 ugers E+S (3 × 4-10RM, 1-2 pas/uge) gav forspring
  på ES 0,46-0,74; **8 uger uden styrke i sæsonen** gav fald i squat
  jump, Wmax og Wingate-middeleffekt mod kontrol (ES 0,49-0,84).
- **NCF/Rønnestad m.fl.**, "Treningsanbefalinger for å bedre sentrale
  fysiologiske faktorer i sykkelprestasjon" (Høgskolen i Lillehammer og
  Olympiatoppen Innlandet; udateret PDF uploadet til sykling.no 2020)
  [læst], afsnit 3.4.1 (s. 23-25): "To styrkeøkter i uken er
  tilstrekkelig for å oppnå en god økning i styrke over en 10 ukers
  periode. For beinøvelser anbefales det å trene to til tre serier med
  en motstand som er så tung at du maksimalt klarer mellem 4 og 12
  repetisjoner (4-12 RM) og 2-3 minutters pause mellom seriene." Øvelser:
  knebøj, etbens knebøj, etbens benpres, etbens hoftefleksion ("imiterer
  opptrekket"), tåhæv; bevægeudslag i knæet fra 90° til næsten fuld
  strækning; start med den største øvelse; afslut med mave og ryg; et pas
  "under én time". **Tabel 2** (programmet, der gav +20-30 % benstyrke i
  veltrænede): uge 1-3: 3 × 10RM (pas 1) og 3 × 6RM (pas 2); uge 4-6: 3 ×
  8RM og 3 × 5RM; uge 7-12: 3 × 6RM og 3 × 4RM; **vedligeholdspas: 2 × 5
  ved 80-85 % af 1RM** i alle fire øvelser. Tunge, ømme ben i de første
  2-3 uger er normalt. Landstrænernes kommentar (s. 25): tung styrke
  (4-10 reps) fra sæsonafslutning "frem til jul med to styrkeøkter i
  uken", derefter "omtrent én økt i uken". S. 30: i et forsøg blev styrke
  vedligeholdt med 1 pas hver 7.-10. dag til april; fra april til juni
  ingen styrke, og i juni var styrke og sprint "nesten akkurat samme nivå
  som i oktober" (Rønnestad 2014e).
- **Olympiatoppen, "Råd fra fagavdelingen for styrke"** (udateret PDF;
  litteraturlisten går til 2024) [læst]: "I sesong kan for eksempel 45
  minutter styrketrening én gang i uken være tilstrekkelig for å
  vedlikeholde styrke over tid, forutsatt at innsatsen og mobiliseringen
  er høy (Rønnestad et al., 2010)." Model: hypertrofi → maksimalstyrke →
  power → spænst/kast → modificeret idrætsudøvelse. "Det kan derfor være
  gunstig å legge perioder med tung styrketrening lenger unna viktige
  konkurranser, for eksempel utenfor sesong." Belastningsstyring med
  **repetitioner i reserve (RIR)**: "å trene med 1-2 RIR kan gi like god
  styrkeutvikling som å trene til utmattelse (Robinson et al., 2024)";
  muskelvækst kræver nærmere udmattelse (0-1 RIR). Autoregulering af
  antal sæt efter dagsform anbefales. Restitutionstiden efter et nyt pas
  "nær halveres når den er gjennomført 3 ganger (fra 48 til 24 timer)".
- **Robinson m.fl. 2024** (Sports Med 54:2209-2231, PMID 38970765)
  [abstract]: meta-regression; nærhed til udmattelse påvirker ikke
  styrkegevinsten målbart, men muskelvækst stiger, jo tættere på
  udmattelse.
- **Lesinski, Prieske & Granacher 2016** (Br J Sports Med 50:781-795,
  PMID 26851290) [abstract], unge atleter: størst styrkeeffekt (SMD
  2,09-3,40) ved **>23 ugers varighed, 5 sæt pr. øvelse, 6-8 gentagelser,
  80-89 % 1RM og 3-4 min pause**. Se afsnit 4.
- **Langrend som analogi** [abstract]: Hoff, Gran & Helgerud 2002 (Scand
  J Med Sci Sports 12:288-295, PMID 12383074): 3 × 6 ved 85 % 1RM, 3
  pas/uge i 8 uger; tid til udmattelse i stavtag 6,49 → 10,18 min,
  arbejdsøkonomi 1,02 → 0,74 ml/kg^0,67/min. Østerås, Helgerud & Hoff
  2002 (EJAP 88:255-263, PMID 12458369): 3 × 5 ved 85 %, 3 × 15 min/uge i
  9 uger, bedre økonomi og tid til udmattelse. Losnegard m.fl. 2011
  (Scand J Med Sci Sports 21:389-401, PMID 20136751): eliteløbere, 2
  pas/uge i 12 uger; 1RM +19 % (træk) og +12 % (halv squat); VO2max på
  rulleski +7 %; stavtagspræstation bedre end kontrol. Norsk langrend
  bruger altså samme skabelon som Rønnestads cykelstudier.
- **Hastighedsbaseret træning (VBT)**: Weakley m.fl. 2021 ("Velocity-based
  training: from theory to application", Strength Cond J; Australian
  Catholic University m.fl.) [læst]: %1RM-styring rammer forbi, fordi
  dagsformen svinger; en hastighedstab-grænse holder hastighed og power
  oppe gennem sættene, og "with each incremental increase in velocity
  loss (e.g., 10, 20, and 30% velocity loss), linear reductions in
  function occur". Kræver måleudstyr (lineær encoder eller
  accelerometer). Pareja-Blanco m.fl. 2017 (Scand J Med Sci Sports
  27:724-735, PMID 27038416) [abstract]: 20 % mod 40 % hastighedstab i
  squat i 8 uger: samme styrkegevinst, CMJ +9,5 % mod +3,5 % med **40 %
  færre gentagelser**, og IIX-fibre bevaret ved 20 %. Held m.fl. 2021
  (IJSPP 16:1185-1193, PMID 33547265) [abstract], **roere** (VO2max 64,9):
  2 pas/uge ved 80 % 1RM, stop ved 10 % hastighedstab mod til udmattelse:
  1RM +18 % mod +8 % og bedre restitution efter 24 og 48 timer. Held
  m.fl. 2022 (Front Physiol, PMID 36035476) [abstract]: netværksmeta
  (14 studier): lavt hastighedstab rangerer højest for både styrke og
  spring.

### Slutninger

- Evidensen og de nordiske forbund siger det samme: **to pas om ugen i
  10-12+ uger efter sæsonen, ét pas om ugen fra forår til sæsonslut**.
  DCU's "medio marts" som overgang til vedligehold passer, men NCF's
  trænere stopper opbygningen allerede til jul og vedligeholder derfra.
  Det er to gyldige valg, Kadence kan udstille.
- "Hver anden uge" og "pause i sæsonen" er dokumenteret som for lidt.
  Kadence bør advare, når en rytter har 14 dage uden styrke i sæsonen.
- RIR 1-2 (Olympiatoppen) og hastighedstab 10-20 % (VBT) peger samme vej:
  ryttere, der også cykler 10-20 timer om ugen, skal **ikke** løfte til
  udmattelse. Det er en konkret ændring fra DCU's kompendium ("altid til
  udmattelse"), som Kadences note allerede har registreret som
  uoverensstemmelse. VBT kræver udstyr og er ikke testet i ryttere; RIR
  kræver intet og kan stå i Kadences passkabelon.

### Huller

- Ingen rytterstudier sammenligner 1 pas/uge med 1 pas hver 10. dag; "hver
  7.-10. dag" (NCF) og "én om ugen" (Rønnestad 2010b) er grænserne.
- VBT er kun undersøgt i roere, fodbold og styrkeatleter.
- Olympiatoppens to rådsdokumenter er udaterede.

---

## 4. Unge: hvornår, hvordan, og knoglerne

### Konklusion

Styrketræning for unge er sikker og gavnlig med kyndig vejledning, og
der er ingen nedre aldersgrænse ud over at kunne følge instruktion.
Teknik før belastning er fælles for alle skoler. Før og under
vækstspurten (PHV) virker hop og lette, hurtige bevægelser bedst, efter
PHV kræver fremgang tung belastning. De praktiske skoler er uenige om,
_hvornår_ tung styrke skal fylde: DCU fra U17 (6-8 RM efter tilvænning),
NCF fra 18 år (prioritering, ikke sikkerhed), Olympiatoppen "mindste
effektive dosis" i 13-19 år. Knogletæthed er et selvstændigt argument
for stød og hop i U17-U19, hvor knoglemassen toppes.

### Fund

**Positionspapirer**

- **Lloyd m.fl. 2014**, "Position statement on youth resistance
  training: the 2014 International Consensus" (Br J Sports Med 48:498-505,
  PMID 24055781) [abstract; fuld tekst bag betalingsmur]: 20 forfattere
  (Lloyd, Faigenbaum, Stone, Oliver, Jeffreys, Moody, Brewer, Pierce,
  McCambridge, Howard, Herrington, Hainline, Micheli, Jaques, Kraemer,
  McBride, Best, Chu, Alvar, Myer), tilpasset fra UKSCA's positionspapir
  og godkendt af organisationer inden for sportsmedicin, idrætsfysiologi
  og pædiatri. Indholdet kendes her gennem McQuilliam 2020 og
  Olympiatoppen: styrketræning for unge er sikker og effektiv under
  kvalificeret supervision; parathed afgøres af evnen til at følge
  instruktion, ikke af alder.
- **Faigenbaum m.fl. 2009**, "Youth resistance training: updated
  position statement paper from the NSCA" (JSCR 23 Suppl 5:S60-S79, PMID 19620931) [abstract]: børn = før puberteten (piger til ~11, drenge til
  ~13), unge = piger 12-18, drenge 14-18. Opdaterer 1996-rådene om
  risici, gevinster og programdesign. De konkrete tal (1-3 sæt, 6-15
  gentagelser, 2-3 dage/uge) kunne **ikke** verificeres i abstractet;
  Granacher 2016 citerer Behm 2008 for "one or two sets of 8–15
  repetitions with a light to moderate load (30–60% 1 RM)", 8-12 øvelser,
  "at least two non-consecutive days per week" [læst].
- **Stricker, Faigenbaum & McCambridge 2020** (AAP, Pediatrics
  145:e20201011, PMID 32457216) [abstract]: revision af AAP's 2008-udsagn;
  fuld tekst kunne ikke hentes.
- **Faigenbaum & Myer 2010** (Br J Sports Med 44:56-63, PMID 19945973)
  [abstract]: skader hos unge løftere var overvejende ulykker; dårlig
  teknik og forkert belastning uden kvalificeret instruktion forklarer en
  del. Sikker og effektiv med kvalificeret supervision; et flersidet
  program før sæsonen kan sænke skadesrisikoen i idrætten.
- **Malina 2006** (Clin J Sport Med 16:478-487, PMID 17119361)
  [abstract]: 22 forsøg i børn før og tidligt i puberteten, typisk 2-3
  pas/uge i 8-12 uger; signifikante styrkegevinster, tabt ved ophør;
  **ingen effekt på højde- eller vægtudvikling**; kun 10 studier
  registrerede skader: 3 skader, 0,176, 0,053 og 0,055 pr. 100
  deltagertimer. Superviserede programmer med lav trænerratio "do not
  negatively affect growth or maturation".
- **Lloyd m.fl. 2016**, NSCA's positionspapir om langsigtet
  atletudvikling (JSCR 30:1491-1509, PMID 26933920) [abstract]: ti
  søjler; alle unge behandles som atleter, individuelt og helhedsorienteret.

**Modning og dosis**

- **Moran m.fl. 2017** (J Sports Sci 35:1041-1051, PMID 27454545)
  [abstract]: meta-analyse, 19 studier, drenge 10-18 år, 4-16 uger.
  Styrkeeffekt samlet 0,98; **før PHV 0,50** (−0,06 til 1,07), **under PHV
  1,11** (0,67-1,54), **efter PHV 1,01** (0,56-1,46).
- **Peitz, Behringer & Granacher 2018** (PLoS One 13:e0205525, PMID 30304033) [abstract]: 75 sammenlignende studier, 5.138 deltagere.
  **Plyometrisk træning gav størst tilpasning før PHV, styrketræning
  omkring og efter PHV.**
- **Lesinski 2016** (ovenfor) [abstract]: 43 studier, 6-18 år; styrke og
  spring SMD 0,8-1,09; sprint, agility og idrætsspecifik præstation
  0,58-0,75. Dosis-respons for styrke: >23 uger, 5 sæt, 6-8 reps, 80-89 %
  1RM, 3-4 min pause. "Coaches should favor programs with fewer
  repetitions and higher intensities."
- **Granacher m.fl. 2016** (Front Physiol 7:164, PMID 27242538) [læst]:
  styrke ES 1,09 (frie vægte 2,97), power 0,80 (kompleks træning 1,66),
  præstation 0,75. Model pr. udviklingstrin: sen barndom: hop som leg,
  core, frie vægte med fokus på teknik; **ungdom ("Training to train"):
  drop jumps fra lav højde, frie vægte med let til moderat belastning,
  tung styrke for hypertrofi, excentrisk træning, idrætsspecifik
  træning**; voksen: moderat til tung belastning, tung træning for neural
  aktivering og hypertrofi. Balance som forberedende element på alle
  trin. Myterne om skade på børn "has been refuted".
- **McQuilliam m.fl. 2020** (Sports Med 50:1567-1580, PMID 32578028)
  [læst]: "There are no minimum age guidelines for youth participation in
  RT." Grundmønstre (squat, hoftebøjning) først uanset alder. Før PHV
  skyldes gevinst neural tilpasning; "low-load, high-velocity training
  may be more beneficial for younger than for more mature athletes", og
  plyometri slår styrke på spring og sprint før PHV. Efter PHV: "the
  incorporation of high-intensity strength training is likely required";
  "Technically able physically mature athletes should undertake
  high-intensity resistance training (≥ 80% 1RM)"; "mature athletes
  require greater relative training loads to maximise adaptations". Lav
  volumen ved høj intensitet kan matche høj volumen ved lav (8 sæt/uge
  ved 80-90 % mod 42 sæt ved 70-90 %), hvilket passer unge med lidt tid
  ved siden af idrætten. Vægtløftningsvarianter kan give power med
  "minimal injury risk when appropriately supervised".

**De nordiske forbund**

- **Olympiatoppen, fagavdelingen for styrke** [læst], "Sammendrag av
  anbefalinger rundt styrketrening for ungdom (13-19 år)": lær
  grundteknik; "Styrketrening har ikke vist seg å føre til flere skader
  hos ungdom, enn andre former for trening"; styr belastningen efter
  "forutsetninger og modningsgrad"; idrætten er hovedprioriteten, styrke
  et supplement; styrke behøver ikke være vægte ("Sprint- og
  spenst-øvelser er også en form for styrketrening"); "vi bør være mer
  opptatt av minste effektive dose enn den optimale dosen"; trænere skal
  have kompetence. Praktisk for nybegyndere: "2–3 økter (med noen dager
  mellomrom) á 20–30 min i uken"; 6-10 øvelser, 1-3 sæt af 8-15
  gentagelser, "Hver serie bør avsluttes 2–3 repetisjoner før
  muskulaturen utmattes"; flerledsøvelser først; eksplosive løft først
  for erfarne, ≤6 reps, 3-6 sæt, 2-3 min pause.
- **NCF/Rønnestad** [læst], s. 23: "Vi anbefaler systematisk basistrening
  med fokus på mage og ryggmuskulatur fra 10-årsalderen. Dette er først
  og fremst i skadeforebyggende øyemed. På generelt grunnlag anbefaler vi
  å vente med fokus på tung styrketrening til 18-årsalderen. Dette er
  ikke fordi det er farlig å gjennomføre tung styrketrening tidligere,
  men fordi vi mener fokuset først og fremst bør være på å utvikle aerobe
  egenskaper."
- **Olympiatoppen, fagavdeling for utholdenhet** (udateret PDF) [læst]:
  i junioralderen "brukes minst 80 % av treningstiden på aerob
  utholdenhetstrening"; volumen øges "med rundt 30-50 timer per år";
  variation i træningsformer (udholdenhed, styrke, hurtighed) og
  bevægelsesmønstre (løb, cykel, ski); "det finnes ikke faglig grunnlag
  for at selve sammensetningen av utholdenhetstreningen bør være
  forskjellig mellom kjønnene".
- **DCU** (baseline-note): U17 2-3 pas/uge fra november, 6 pas 3 × 16 → 6
  pas 3 × 12 → 4 × 6-8 RM; "ikke skadesfremkaldende", "går ikke ud over
  knogler, led eller vækst".

**Knoglerne hos unge ryttere**

- **Olmedillas m.fl. 2011** (PLoS One 6:e24841, PMC3184100; GENUD,
  Universidad de Zaragoza) [læst]: 22 landevejsryttere 16,9 ± 1,9 år (2-7
  års træning, ~10 t/uge) mod 22 kontroller. Justeret for højde og mager
  masse: bækken 1,042 mod 1,200 g/cm² (p = 0,001), trochanter 0,760 mod
  0,860 (p = 0,001), total hofte 0,976 mod 1,045 (p = 0,015), ben 1,199
  mod 1,287 (p = 0,002). I gruppen ≥17 år: bækken −24,5 %, hofte −10,5 %,
  trochanter −16,2 %, lårbenshals −15,8 %, ben −14,3 %; lårbenshalsens
  vBMD −17,1 %. "Cycling performed throughout adolescence may negatively
  affect bone health." Tværsnit, ikke forsøg.
- **Hilkens m.fl. 2023** (Med Sci Sports Exerc 55:957-965, PMID 36595659;
  Maastricht University) [læst]: 93 eliteryttere: tidlig karriere (11
  mænd, 20 kvinder, ~18-19 år), midt (22 + 20), efter (10 + 10). Lav BMD
  (Z < −1) i lænden: **mænd 27 % tidligt, 64 % midt, 50 % efter**; kvinder
  45 %, 45 %, 20 %. Blandt midtkarriere-mænd med lav BMD havde 46 %
  osteoporotiske værdier (Z ≤ −2) i lænd og helkrop. Prædiktorer: BMI,
  brud, **knoglespecifik fysisk aktivitet tidligere i livet** (fodbold,
  gymnastik gav højere Z-scorer) og T3 (lav-normal <1,2 nmol/l kan være
  et signal). Anbefaling: "osteogenic activities should be an integral
  part of the training regimen"; styrketræning "needs to be performed at
  a relative high intensity" (ca. 80-85 % 1RM) for at løfte BMD; korte,
  hyppige hoppepas foreslås.
- **Hilkens m.fl. 2024** (Int J Sport Nutr Exerc Metab 34:38-47, PMID 37883634) [abstract]: åbent randomiseret forsøg, 36 unge eliteryttere
  (21 ± 3 år; 8 mænd, 28 kvinder), 18 ugers off-season, **5 × 5 min hop
  om ugen** med 15 g kollagen før hvert pas. Lårbenshals-BMD faldt i
  kontrol (0,789 → 0,774 g/cm²) og blev bevaret i interventionen (0,803 →
  0,809; p < 0,01). Ingen forskel i hofte, lænd eller helkrop. Hop og
  kollagen kan ikke adskilles i designet; efterlevelse ~77 %.
- **Hilkens m.fl. 2023** (Bone 170:116705, PMID 36804484) [abstract]:
  daglige 5 min stød i 3 dage øgede fastende P1NP (knogledannelse) ~8 %
  (p < 0,01); kollagen og to daglige pas gav intet ekstra.
- **Hilkens m.fl. 2025** (Med Sci Sports Exerc 57:1755-1762, PMID 40176280) [abstract]: 20 kvindelige eliteryttere 21 ± 2 år: lav aBMD i
  hofte 20 %, lårbenshals 25 %, lænd 35 %; lav volumetrisk BMD i skinneben
  40 %, kortikal tykkelse lav hos 60 %. Mikroarkitekturen er svækket, ikke
  kun tætheden.
- **Klomsten Andersen m.fl. 2018** (BMJ Open Sport Exerc Med 4:e000449,
  PMID 30687513) [abstract]: 19 norske eliteryttere mod 21 løbere.
  Ryttere lavere BMD alle steder; **53 % havde lav BMD "despite heavy
  lower-limb resistance training"**. Lav BMD var stedspecifik (lænd og
  lårbenshals) og fandtes hos begge køn.
- **Keay m.fl. 2019** (BMJ Open Sport Exerc Med 5:e000523, PMID 31191973)
  [abstract]: 50 konkurrenceryttere (mænd), 6 måneders RCT med
  undervisning i ernæring og "skeletal loading". Positive adfærdsændringer
  gav +2,0 % lænde-BMD, negative −2,7 %; ændringerne hang også sammen med
  ±95 British Cycling-point. Rytterne frygtede, at ændringer ville skade
  præstationen.
- **Saffioti m.fl. 2026** (IJSNEM 36:324-334, PMID 41468224; UCI Sports
  Nutrition Project) [abstract]: cykling som "perfect storm" for knogler:
  ikke-vægtbærende, øget resorption efter lange ture, lav
  energitilgængelighed, lav kropsvægt. Anbefaler energi, protein,
  kalcium, D-vitamin, **korte stødbelastninger**, søvn og screening.

### Slutninger

- Uenigheden mellem DCU (tung styrke fra U17) og NCF (fra 18) er en
  prioritering af tid, ikke sikkerhed. Begge er forenelige med Lloyd 2014. Kadences paradigmevalg (baseline-note) står ved magt.
- For U17 taler modningsevidensen for, at _hop, sprint og teknik_ skal
  fylde mere end tunge sæt, indtil rytteren er forbi vækstspurten, og at
  tunge sæt derefter kan komme hurtigt. Kadence kender ikke PHV, men
  kender klasse og fødselsår; træneren kender rytteren.
- Knoglerne er det stærkeste argument for off-bike i U17-U19, stærkere
  end præstationen: 27 % lav BMD før 20 år, og tidligere stødsport er det,
  der beskytter. Hop er billigt, 5 minutter, og kan ligge i opvarmningen
  til styrke eller som eget mikro-pas. Tung styrke alene er ikke nok.
- Lav energitilgængelighed (RED-S) er den anden halvdel af
  knogleproblemet og ligger uden for det, en AI må rådgive om; det er en
  træner-/lægesag. Kadence kan dog vise, at kombinationen af lav
  kropsvægt og stor volumen er et kendt risikomønster.

### Huller

- Ingen interventionsstudier af styrke eller hop i **juniorryttere
  (15-18)**; Hilkens 2024 er 21 ± 3 år.
- Lloyd 2014's egne formuleringer (parathed, 1RM-test, belastningsnormer)
  kunne ikke læses i fuld tekst. UKSCA's originale positionspapir heller
  ikke.
- Et studie af osteopeni hos 16-årige mandlige ryttere (50 %, 73 % og 50 %
  ved tre tidspunkter) sås kun i et søgeresultat uden forfattere
  [søgning] og kunne ikke hentes.

---

## 5. Masters: styrke og power med alderen

### Konklusion

Fra 50 år er muskelpower det, der tabes hurtigst, og det, der betyder
mest for funktion og cykelpræstation. Styrke 2-3 gange om ugen ved
70-85 % 1RM og powerarbejde ved 40-60 % 1RM med høj hastighed er
standardrådet (NSCA 2019). Det eneste cykelspecifikke forsøg viser, at
3 ugers styrke fjerner aldersforskellen i økonomi.

### Fund

- **Fragala m.fl. 2019**, "Resistance training for older adults:
  position statement from the NSCA" (JSCR 33:2019-2052, PMID 31343601)
  [abstract; programtal via Len Kravitz' (University of New Mexico)
  sammendrag, sekundær]: 11 udsagn i fire dele (programdesign,
  fysiologi, funktion, skrøbelighed/sarkopeni). Raske ældre: 8-10
  øvelser, **2-3 sæt, 2-3 dage/uge**, belastning fra let (<51 % 1RM) over
  moderat (51-69 %) til høj (70-85 %) for nogle; 10-15 gentagelser for
  begyndere, 6-12 for styrke; ~2 min pause; træning til udmattelse giver
  ikke mere; **power ved 40-60 % 1RM med eksplosiv koncentrisk fase**;
  individuel, periodiseret progression; maskiner til begyndere og
  skrøbelige, frie vægte til velfungerende. Sikkerhed: ingen styrke ved
  ukontrolleret blodtryk, screen for hjerterisiko, skulder, knæ, hofte og
  ryg er de udsatte led.
- **Peterson m.fl. 2010** (Ageing Res Rev 9:226-237, PMID 20385254)
  [abstract]: 47 studier, 1.079 ældre; benpres +29 ± 2 %, knæstræk +33 ±
  3 %, brystpres +24 %, lat pull +25 %; **højere intensitet gav større
  fremgang**.
- **Peterson, Sen & Gordon 2011** (Med Sci Sports Exerc 43:249-258, PMID 20543750) [abstract]: 49 studier, 1.328 deltagere; +1,1 kg mager masse
  (0,9-1,2); højere volumen → mere; højere alder → mindre (β = −0,03).
- **Reid & Fielding 2012** (Exerc Sport Sci Rev 40:4-12, PMID 22016147)
  [abstract]: power falder tidligere og stejlere end styrke og forudsiger
  funktionstab bedre.
- **Straight m.fl. 2016** (Sports Med 46:353-364, PMID 26545362)
  [abstract]: 12 RCT'er, ≥50 år; power d = 0,34 (0,25-0,43), ~55 W;
  **højhastighedstræning d = 0,62 mod traditionel 0,20**; volumen
  modererede effekten.
- **Louis m.fl. 2012** (Eur J Appl Physiol, PMID 21638070) [abstract]: 9
  masters (51,5 ± 5,5 år) og 8 unge (25,6 år) udholdenhedsatleter, **3
  uger** med 3 × (10 × 10 knæstræk ved 70 % 1RM, 3 min pause) om ugen.
  MVC +17,8 % hos masters mod +5,9 % hos unge; cykeleffektiviteten steg
  signifikant hos masters og "alleviated all the age-related differences
  in strength and efficiency"; r = 0,79 mellem MVC og delta-effektivitet.
- **Del Vecchio m.fl. 2019** (JSCR 33:66-79, PMID 28557858) [abstract]:
  25 masters-landevejsryttere (49-57 år), 12 uger; kombineret styrke +
  sprint øgede totalt arbejde i 30 s mod kontrol, mager benmasse og
  flyvende 200 m; spørgsmålet om aerob kapacitet står åbent.
- Knogler og sikkerhed hos masters: Nichols 2003/2011, Olmedillas 2012,
  Hinton 2015, WHO 2020 og AHA 2023 er dækket i baseline-noten (afsnit
  4.2-4.4) og gentages ikke.

### Slutninger

- Kadences Motionist/Supermotionist-programmer har tung styrke og
  småhop, men **ingen power-del**. Et par sæt hurtige squat/step-ups ved
  40-60 % af det, man kan løfte, eller hurtige etbens-pres, ville følge
  NSCA og Straight 2016 og koster få minutter.
- Masters svarer hurtigt (3 uger, Louis 2012), og effekten er størst hos
  dem, der er svagest. Det taler for at holde styrke året rundt hos
  masters, ikke kun om vinteren, i tråd med "2-3 dage/uge" i NSCA.
- Alt om blodtryk, hjerte og medicin er lægens; Kadences tekst skal blive
  ved de generelle råd (AHA 2023 i baseline-noten).

### Huller

- Fragalas 11 udsagn kunne ikke læses i original.
- Ingen fundet evidens om **sener** hos ældre udholdenhedsatleter;
  Olympiatoppen nævner "senefjærstivhet" som mål, men uden tal.
- Kun to interventionsstudier i masters-ryttere (Louis 2012, Del Vecchio
  2019), begge små.

---

## 6. Anden træning uden for cyklen

### Konklusion

Styrketræning forebygger skader, udstrækning gør ikke. Core giver en
mere stabil position, men ingen målbar præstationsgevinst over almindelig
styrke. Smidighed som selvstændigt mål har svag evidens. Krydstræning
(løb, langrend, MTB, cross) overfører noget VO2max, aldrig mere end
specifik træning, men bruges af norske landstrænere i overgangsperioden
og anbefales af Olympiatoppen som variation for unge.

### Fund

**Core og bålstabilitet**

- **Abt m.fl. 2007** (JSCR 21:1300-1304) [søgning]: 15 konkurrenceryttere;
  træthed i core ændrede pedalmekanikken (knæet udsat for mere stress)
  uden at ændre pedalkræfterne. Et træthedsstudie, ikke et træningsforsøg.
- **Sitko, López-Laval & Cirer-Sastre 2023** (preprint,
  doi:10.20944/preprints202312.2177.v1; indgår som "Sitko 2024" i
  Llanos-Lagos' meta-analyse) [abstract]: 36 trænede landevejsryttere, 12
  uger, tre grupper à 12: ingen styrke, almindelig styrke, core.
  **Almindelig styrke slog både core og ingen styrke på effekt ved 5 s,
  1 min, 5 min og 20 min**; core forbedrede kun 5 s-effekten mod ingen
  styrke. Preprint, ikke fagfællebedømt i den hentede version.
- **Blechschmied, Strahler & Granacher 2026** (Sports Med Open 12:26,
  PMID 41801641) [abstract]: 24 kvindelige MTB-ryttere 14-22 år, 8 uger
  off-season, 3 × 30 min/uge, bålstyrke mod kun ben. Bålstyrke: fleksion
  d = 1,1, ekstension d = 1,7, sideudholdenhed d = 0,74; **sidelæns
  udsving af cyklen faldt (d = 0,8)**; fysiologisk økonomi ikke forskellig.
- **NCF/Rønnestad** [læst]: mave og ryg "fra 10-årsalderen" af hensyn til
  skader, og afslut styrkepas med mave/ryg "for å redusere risikoen for å
  få problemer med ryggen". DCU's programmer har mave og ryg 3 × 15-20 i
  alle klasser (baseline-note).
- **Clarsen, Krosshaug & Bahr 2010** (Am J Sports Med 38:2494-2501, PMID 20847225) [abstract]: 109 af 116 professionelle; **lænderygsmerter hos
  58 %** (41 % søgte behandling), forreste knæsmerter hos 36 % (19 %); 45 %
  af skaderne i lænden, 23 % i knæet; af 23 tidstabsskader var 57 % knæ.

**Smidighed og udstrækning**

- **Lauersen, Bertelsen & Andersen 2014** (Br J Sports Med 48:871-877,
  PMID 24100287) [abstract]: 25 RCT'er, 26.610 deltagere. **Udstrækning
  RR 0,963 (0,846-1,095): ingen effekt**; proprioception 0,55;
  **styrketræning 0,315 (0,207-0,480)**; akutte skader 0,647,
  overbelastning 0,527.
- **Lauersen, Andersen & Andersen 2018** (Br J Sports Med 52:1557-1563,
  PMID 30131332) [abstract]: styrketræning RR 0,338 (0,238-0,480), høj
  evidensstyrke; **hver 10 % mere styrkevolumen gav >4 procentpoint lavere
  skadesrisiko**.
- **Behm m.fl. 2016** (Appl Physiol Nutr Metab 41:1-11, PMID 26642915)
  [abstract]: statisk udstrækning akut −3,7 % præstation (≥60 s pr.
  muskelgruppe −4,6 %), dynamisk +1,3 %; ingen klar skadesforebyggende
  effekt; anbefales kun som del af en opvarmning med dynamisk aktivitet
  bagefter.
- **Nuzzo 2020** (Sports Med 50:853-870, PMID 31845202) [abstract]:
  smidighed har ringe prædiktiv værdi for sundhed og præstation og bør
  nedprioriteres til fordel for styrketræning.
- **Bini, Hume & Croft 2011** (Sports Med 41:463-476, PMID 21615188)
  [abstract]: knæsmerter rammer ~50 % af ryttere; 5 % ændring i
  sadelhøjde ændrer knækinematikken ~35 % og momenterne ~16 %; anbefaler
  **25-30° knæfleksion i bunden** for at mindske knærisiko og iltoptag.
  Bike fit er altså en skadesforebyggende faktor på linje med styrke.
- **Thorborg m.fl. 2017** (Br J Sports Med 51:562-571, PMID 28087568)
  [abstract], FIFA 11+ som analogi: IRR 0,61 (0,48-0,77), ~39 % færre
  skader i fodbold. Ingen tilsvarende program er testet i cykling.

**Plyometri**

- Paton & Hopkins 2005 (afsnit 1) er det eneste rytterstudie med hop som
  hovedelement, og det blandede hop med tunge cykelspurter. Peitz 2018:
  hop virker bedst før PHV. Hilkens 2024: hop for knoglerne. Schumann
  2022: det er netop eksplosiv styrke, der dæmpes af samtidig
  udholdenhed, så hop bør ligge frisk, ikke efter en lang tur.

**Krydstræning og vinter**

- **Tanaka 1994** (Sports Med 18:330-339, PMID 7871294) [abstract]: noget
  VO2max-effekt overføres mellem cykling, løb og svømning; løb giver
  tydeligere uspecifik effekt end svømning; "cross-training never exceeds
  sport-specific training effects"; nyttigt til generel form,
  genoptræning og ved overtræning.
- **Foster m.fl. 1995** (EJAP 70:367-372, PMID 7649149) [abstract]: 30
  trænede, 8 uger; ekstra løb forbedrede 3,2 km med 26,4 s, ekstra
  svømning 13,2 s, kontrol 5,4 s.
- **Losnegard 2011** [abstract]: VO2max på rulleski steg 7 % efter
  styrke, løbe-VO2max ikke: tilpasningen er specifik.
- **NCF/Rønnestad** [læst], landstrænerne om overgangsperioden: "man må
  ha noe mental avkopling og at man i denne perioden også kan bruke
  alternative bevegelsesformer som for eksempel løping, fjellturer,
  langrenn"; i zone 5 kan intervaller "også gjøres via motbakkeløping for
  å få maksimal sirkulatorisk og ventilatorisk belastning".
- **Rønnestad, Askestad & Hansen 2014** (EJAP 114:1831-1839, PMID 24878691) [abstract]: ét HIT-pas hver 7.-10. dag i 8 ugers
  overgangsperiode holdt effekten ved 4 mmol (+10,6 %) og 40 min (+12,4 %)
  mod lavintensiv overgang, og forspringet holdt til efter
  forberedelsesperioden.
- **Olympiatoppen, utholdenhet** [læst]: variation i "bevegelsesmønster
  (løping, sykkel, ski)" og uorganiseret aktivitet (topture, boldspil,
  "skileik") anbefales for unge.
- **DCU** (baseline-note, afsnit 7): løb, svømning, gymnastik, ski og
  boldspil "tæller ikke med" i timetallet; bane, MTB, spinning og ruller
  gør. Ingen anbefaling for eller imod.
- **Hilkens 2023** [læst]: tidligere fodbold og gymnastik beskyttede
  knoglerne; det er det stærkeste argument for stødsport i U17.

### Slutninger

- Core hører til som skadesforebyggelse (ryg hos 58 % af
  professionelle) og som afslutning på styrkepasset, ikke som erstatning
  for tung styrke. Kadence kan sige det ærligt: "giver en mere stabil
  position; beviset for mere watt mangler".
- Udstrækning skal ud af "skadesforebyggelse" i Kadences tekster; en
  dynamisk opvarmning kan blive.
- Krydstræning om vinteren (løb, langrend, cross, MTB) kan Kadence tælle
  som udholdenhedstid med lavere specificitet; sammen med DCU's regel om,
  at den ikke tæller i cykeltimerne, bliver det et valg for paradigmet.
  Løb er det, der stresser knoglerne mest, og det, der interfererer mest
  med styrke (Wilson, Lundberg), så det skal ikke ligge samme dag som
  tunge sæt.

### Huller

- Ingen RCT af core alene mod ingen træning i landevejsryttere med
  præstation som udfald ud over Sitko-preprintet.
- Ingen studier af langrend eller cross som vintertræning _for ryttere_;
  kun analogier og trænerpraksis.
- Ingen skadesforebyggende program med evidens _i cykling_ (FIFA 11+
  findes kun i fodbold).

---

## 7. Køn

### Konklusion

Kvinder og mænd får samme relative gevinst i muskelmasse og benstyrke
af samme program; kvinder får relativt mere i overkroppen. Interferens
rammer mænds benstyrke, ikke kvinders. Menstruationscyklus påvirker
ikke styrketilpasningen målbart. Kvindelige ryttere er underrepræsenteret
i cykelstudierne (60 af 262 i meta-analysen), men Vikmoen 2016 viser
samme svar som hos mænd. Kvindelige eliteryttere har svækket
knoglemikroarkitektur allerede ved 21 år.

### Fund

- **Roberts, Nuckols & Krieger 2020** (JSCR 34:1448-1460, PMID 32218059)
  [abstract]: hypertrofi ES 0,07 (n.s.); **overkropsstyrke −0,60 til
  fordel for kvinder (p = 0,002)**; benstyrke −0,21 (n.s.). Samme relative
  svar i ben og muskelmasse.
- **Huiberts 2024** (afsnit 2) [læst]: interferens i benstyrke hos mænd
  (−0,43), ikke hos kvinder (0,08).
- **Hunter 2016** (Med Sci Sports Exerc 48:2247-2256, PMID 27015385; Exp
  Physiol 101:250-255, PMID 26440505) [abstract]: kvinder er mindre
  trætbare end mænd ved isometriske og langsomme dynamiske kontraktioner;
  forskellen afhænger af opgaven; ingen forskel i central træthed.
- **Nuzzo 2023** (JSCR 37:494-536, PMID 36696264) [abstract]: mænd bliver
  tydeligt stærkere end kvinder "around age 15"; forskellen er størst i
  overkroppen og skyldes muskelmasse og type II-fiberareal, ikke
  aktivering; kvinder får afhængigt af alder og muskelgruppe større
  relativ fremgang.
- **McNulty m.fl. 2020** (Sports Med 50:1813-1827, PMID 32661839)
  [abstract]: 78 studier; tidlig follikulær fase −0,06 (−0,16 til 0,04),
  trivielt; evidenskvalitet lav; "general guidelines cannot be formed",
  individuel tilgang.
- **Colenso-Semple m.fl. 2023** (Front Sports Act Living 5:1054542, PMID 37033884) [abstract]: paraplyoversigt; "premature" at sige, at
  hormonsvingninger påvirker akut styrke eller langtidstilpasning.
  **Colenso-Semple m.fl. 2025** (J Physiol 603:1109-1121, PMID 39630025)
  [abstract]: muskelproteinsyntese efter styrke ens i follikulær og luteal
  fase (12 kvinder).
- **Vikmoen 2016** (afsnit 1) [abstract]: kvinder forbedrede 40 min,
  udnyttelse og økonomi; baseline-noten har +6,4 % (kvinder) mod +6,0 %
  (mænd) fra Vikmoen & Rønnestad 2021.
- **Vikmoen m.fl. 2016, løb** (PLoS One 11:e0150799, PMID 26953893)
  [abstract]: samme program i kvindelige løbere gav 1RM +40 %, type II
  CSA +31 %, men **ingen** ændring i løbeøkonomi eller 40 min-distance.
  Effekten er altså idrætsafhængig, ikke kønsafhængig.
- **Hilkens 2025** (afsnit 4) [abstract]: 35 % lav lænde-BMD og 60 % lav
  kortikal tykkelse hos 21-årige kvindelige eliteryttere.
- **Olympiatoppen, utholdenhet** [læst]: ingen fagligt grundlag for
  kønsforskellig sammensætning af træningen.

### Slutninger

- Kadence skal ikke have et "kvindeprogram". Samme RM-progression; evt.
  lidt mere overkrop, som kvinder svarer stærkt på og som hjælper
  positionen.
- Cyklusbaseret periodisering af styrke er ikke underbygget og skal ikke
  foreslås af AI'en; en rytter kan selv notere symptomer i check-in.
- Hos kvindelige U19/U23-ryttere er knoglerne (45 % lav lænde-BMD i
  tidlig karriere) og energitilgængelighed en træner- og lægesag, som
  Kadence kun kan pege på.

### Huller

- Ingen studie af interferens eller styrkedosis specifikt i kvindelige
  juniorryttere.
- Hunter's og Huiberts' mekanismer (fibertype, restitution) er hypoteser.

---

## 8. Skolerne: hvem mener hvad

| Skole / person                                                                                                                                                                  | Står for                                                                                                                                       | Hvornår og hvor meget                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Bent R. Rønnestad** (Høgskolen i Innlandet, Lillehammer) og **Iñigo Mujika** (Universidad del País Vasco)                                                                     | Tung styrke 4-10 RM med maksimal koncentrisk hastighed, 2 pas/uge i 12 uger, 1 pas/uge i sæsonen; eksplosiv træning anbefales _ikke_ i cykling | Rønnestad & Mujika 2014; Rønnestad 2010a/b, 2011, 2015, 2016, 2017       |
| **Per Aagaard** (Syddansk Universitet) og **Jesper L. Andersen** (Bispebjerg)                                                                                                   | Styrke i unge eliteryttere: 45 min +8 %, IIX → IIA, RFD                                                                                        | Aagaard 2011; Aagaard & Andersen 2010                                    |
| **Jan Hoff** og **Jan Helgerud** (NTNU/Hokksund)                                                                                                                                | "Maksimal styrketræning" 4 × 4RM med høj hastighed, 3 pas/uge i 8 uger, for økonomi                                                            | Sunde 2010; Hoff 2002; Østerås 2002                                      |
| **Carl Paton & Will Hopkins** (New Zealand)                                                                                                                                     | Eksplosive hop + tunge spurter på cyklen i korte blokke                                                                                        | Paton & Hopkins 2005                                                     |
| **Moritz Schumann** (Köln/Chemnitz), **Tommy R. Lundberg** (Karolinska), **Huiberts/van der Zwaard** (Amsterdam)                                                                | Interferens er lille, mest eksplosiv styrke, mest i samme pas; køn og træningsstatus moderer                                                   | Schumann 2022; Lundberg 2022; Huiberts 2024                              |
| **Rhodri S. Lloyd** (Cardiff Met), **Avery D. Faigenbaum** (College of New Jersey), **Gregory D. Myer**                                                                         | Ungdomsstyrke er sikker og gavnlig; teknik før belastning; parathed er ikke alder; langsigtet atletudvikling                                   | Lloyd 2014; Faigenbaum 2009; Faigenbaum & Myer 2010; Lloyd 2016          |
| **Urs Granacher** (Potsdam/Freiburg), **Melanie Lesinski**, **Jason Moran** (Essex)                                                                                             | Dosis-respons og modning: hop før PHV, tung styrke efter; >23 uger, 6-8 reps, 80-89 %                                                          | Lesinski 2016; Granacher 2016; Moran 2017; Peitz 2018                    |
| **Olympiatoppen** (fagavdelingene for styrke og utholdenhet)                                                                                                                    | Mindste effektive dosis for 13-19 år; RIR 1-2; hypertrofi → maks → power; 45 min 1×/uge i sæsonen                                              | Rådsdokumenter, udaterede                                                |
| **NCF / Rønnestad m.fl.**                                                                                                                                                       | Core fra 10 år, tung styrke fra 18 år af prioriteringshensyn; 2 pas til jul, derefter 1                                                        | "Treningsanbefalinger …", sykling.no                                     |
| **DCU / Team Danmark**                                                                                                                                                          | Tung styrke fra U17 efter tilvænning, 2-3 pas vinter, 1 pas sæson, 48 timer imellem                                                            | Baseline-note                                                            |
| **Luuk Hilkens** og **Jan-Willem van Dijk** (Maastricht/HAN), **Nicky Keay** (Durham)                                                                                           | Knogler: lav BMD fra tidlig karriere, hop og energi som modtræk                                                                                | Hilkens 2023, 2024, 2025; Keay 2019                                      |
| **Maren S. Fragala m.fl.** (NSCA-positionspapiret), **Mark D. Peterson**, **Kieran F. Reid & Roger A. Fielding** (Tufts), **Chad R. Straight**                                  | Masters: intensitet for styrke, hastighed for power                                                                                            | Fragala 2019; Peterson 2010/2011; Reid & Fielding 2012; Straight 2016    |
| **Jonathon Weakley** (ACU) og **Fernando Pareja-Blanco** (Sevilla)                                                                                                              | Hastighedsbaseret træning, 10-20 % hastighedstab                                                                                               | Weakley 2021; Pareja-Blanco 2017                                         |
| **Brandon Roberts/Greg Nuckols/James Krieger**, **Sandra K. Hunter** (Marquette), **James L. Nuzzo**, **Kelly McNulty**, **Lauren Colenso-Semple & Stuart Phillips** (McMaster) | Køn: samme relative gevinst; ingen cykluseffekt                                                                                                | Roberts 2020; Hunter 2016; Nuzzo 2023; McNulty 2020; Colenso-Semple 2023 |
| **Jeppe Bo Lauersen** (København), **Kristian Thorborg** (Hvidovre)                                                                                                             | Styrke forebygger skader, udstrækning ikke; FIFA 11+                                                                                           | Lauersen 2014, 2018; Thorborg 2017                                       |

**Det omstridte, kort:**

- Økonomi målt klassisk: Sunde ja, Rønnestad/Aagaard nej, meta-analyse
  "lille effekt, lav sikkerhed".
- Eksplosiv styrke i cykling: Paton & Hopkins ja (med tunge spurter),
  Bastiaans nej, Rønnestad & Mujika fraråder.
- Tung styrke fra 15 eller 18 år: DCU mod NCF; evidensen er for
  "efter PHV", som ofte er 15-16 år for drenge og tidligere for piger,
  men ingen rytterstudier under 19 år.
- Core: biomekanisk plausibelt, præstationsmæssigt ubevist.
- Hop for knoglerne hos ryttere: ét lille åbent forsøg med kollagen
  blandet ind.
- VBT og RIR: lovende, ikke testet i ryttere.
- Interferens hos højt trænede: 2 studier af 59.

---

## 9. Hvad der ikke kunne efterprøves

- **British Cycling / Team Sky**: britishcycling.org.uk afviste
  hentning (403), og ingen publikation om deres styrkepraksis blev
  fundet. Hul.
- **Lloyd 2014** og **Fragala 2019** i fuld tekst (betalingsmur).
  Fragalas tal stammer fra Kravitz' sammendrag [sekundær].
- **Stricker 2020 (AAP)**: kun abstract.
- **Hilkens m.fl. 2021**, "Fragile bones of elite cyclists: to treat or
  not to treat?" (J Appl Physiol 131:26-28, PMID 33703944): kun titel;
  Jeukendrups gengivelse [søgning] siger, at der ikke er evidens for
  flere brud hos pensionerede ryttere.
- Olympiatoppens dokumenter er udaterede; indholdet refererer til
  litteratur fra 2024.
- Websøgningen blev lukket midt i arbejdet (budgetgrænse); de sidste
  opslag er gjort direkte i Europe PMC's databaseindeks og i fuldtekster.
  Søgninger, der ikke blev til noget: Faigenbaum 2009's konkrete
  tabelværdier, Reid & Fielding i fuld tekst, et core-RCT i ryttere ud
  over Sitko, en skadesforebyggende pakke for cykling.

---

## 10. Personer og kilder

Forbundsdokumenter:

- Olympiatoppen, "Råd fra fagavdelingen for styrke" (udateret):
  https://olympiatoppen.no/siteassets/fagomrader/talentutvikling/rad-fra-fagavdelingen-for-styrke.pdf [læst]
- Olympiatoppen, "Råd fra fagavdeling for utholdenhet" (udateret):
  https://olympiatoppen.no/siteassets/fagomrader/talentutvikling/rad-fra-fagavdeling-for-utholdenhet-1.pdf [læst]
- Rønnestad BR, Knutsen E, Lexberg K, Kristiansen S, Falk H (NCF /
  Høgskolen i Lillehammer / Olympiatoppen Innlandet), "Treningsanbefalinger
  for å bedre sentrale fysiologiske faktorer i sykkelprestasjon – Teori og
  praksis": https://sykling.no/wp-content/uploads/2020/11/UTHOLDENHETSTRENING2_6.pdf [læst]
- Kravitz L (University of New Mexico), sammendrag af NSCA's
  positionspapir 2019: https://www.unm.edu/~lkravitz/Article%20folder/NSCApositionstand.html [sekundær]

Videnskabelige artikler (alfabetisk):

- Aagaard P, Andersen JL 2010, Scand J Med Sci Sports 20 Suppl 2:39-47: https://doi.org/10.1111/j.1600-0838.2010.01197.x [abstract]
- Aagaard P m.fl. 2011, Scand J Med Sci Sports 21(6):e298-e307: https://doi.org/10.1111/j.1600-0838.2010.01283.x [abstract]
- Abt JP m.fl. 2007, J Strength Cond Res 21(4):1300-1304: https://doi.org/10.1519/R-21846.1 [søgning]
- Bastiaans JJ m.fl. 2001, Eur J Appl Physiol 86(1):79-84: https://doi.org/10.1007/s004210100507 [abstract]
- Beattie K m.fl. 2014, Sports Med 44(6):845-865: https://doi.org/10.1007/s40279-014-0157-y [abstract]
- Behm DG m.fl. 2016, Appl Physiol Nutr Metab 41(1):1-11: https://doi.org/10.1139/apnm-2015-0235 [abstract]
- Berryman N m.fl. 2018, Int J Sports Physiol Perform 13(1):57-63: https://doi.org/10.1123/ijspp.2017-0032 [abstract]
- Bini R, Hume PA, Croft JL 2011, Sports Med 41(6):463-476: https://doi.org/10.2165/11588740-000000000-00000 [abstract]
- Blechschmied R, Strahler J, Granacher U 2026, Sports Med Open 12(1):26: https://doi.org/10.1186/s40798-026-00996-0 [abstract]
- Clarsen B, Krosshaug T, Bahr R 2010, Am J Sports Med 38(12):2494-2501: https://doi.org/10.1177/0363546510376816 [abstract]
- Colenso-Semple LM m.fl. 2023, Front Sports Act Living 5:1054542: https://doi.org/10.3389/fspor.2023.1054542 [abstract]
- Colenso-Semple LM m.fl. 2025, J Physiol 603(5):1109-1121: https://doi.org/10.1113/jp287342 [abstract]
- Del Vecchio L m.fl. 2019, J Strength Cond Res 33(1):66-79: https://doi.org/10.1519/jsc.0000000000001960 [abstract]
- Eddens L, van Someren K, Howatson G 2018, Sports Med 48(1):177-188: https://doi.org/10.1007/s40279-017-0784-1 [abstract]
- Faigenbaum AD m.fl. 2009, J Strength Cond Res 23(5 Suppl):S60-S79: https://doi.org/10.1519/jsc.0b013e31819df407 [abstract]
- Faigenbaum AD, Myer GD 2010, Br J Sports Med 44(1):56-63: https://doi.org/10.1136/bjsm.2009.068098 [abstract]
- Foster C m.fl. 1995, Eur J Appl Physiol Occup Physiol 70(4):367-372: https://doi.org/10.1007/bf00865035 [abstract]
- Fragala MS m.fl. 2019, J Strength Cond Res 33(8):2019-2052: https://doi.org/10.1519/JSC.0000000000003230 [abstract]
- Granacher U m.fl. 2016, Front Physiol 7:164: https://doi.org/10.3389/fphys.2016.00164 [læst]
- Held S m.fl. 2021, Int J Sports Physiol Perform 16(8):1185-1193: https://doi.org/10.1123/ijspp.2020-0451 [abstract]
- Held S m.fl. 2022, Front Physiol 13:926972: https://doi.org/10.3389/fphys.2022.926972 [abstract]
- Hickson RC 1980, Eur J Appl Physiol Occup Physiol 45(2-3):255-263: https://doi.org/10.1007/bf00421333 [abstract]
- Hilkens L m.fl. 2021, J Appl Physiol 131(1):26-28: https://doi.org/10.1152/japplphysiol.01034.2020 [søgning]
- Hilkens L m.fl. 2023, Med Sci Sports Exerc 55(5):957-965: https://doi.org/10.1249/mss.0000000000003113 (PMC10090358) [læst]
- Hilkens L m.fl. 2023, Bone 170:116705: https://doi.org/10.1016/j.bone.2023.116705 [abstract]
- Hilkens L m.fl. 2024, Int J Sport Nutr Exerc Metab 34(1):38-47: https://doi.org/10.1123/ijsnem.2023-0080 [abstract]
- Hilkens L m.fl. 2025, Med Sci Sports Exerc 57(8):1755-1762: https://doi.org/10.1249/mss.0000000000003718 [abstract]
- Hoff J, Gran A, Helgerud J 2002, Scand J Med Sci Sports 12(5):288-295: https://doi.org/10.1034/j.1600-0838.2002.01140.x [abstract]
- Huiberts RO, Wüst RCI, van der Zwaard S 2024, Sports Med 54(2):485-503: https://doi.org/10.1007/s40279-023-01943-9 (PMC10933151) [læst]
- Hunter SK 2016, Med Sci Sports Exerc 48(11):2247-2256: https://doi.org/10.1249/mss.0000000000000928 [abstract]
- Hunter SK 2016, Exp Physiol 101(2):250-255: https://doi.org/10.1113/ep085370 [abstract]
- Jackson NP, Hickey MS, Reiser RF 2007, J Strength Cond Res 21(1):289-295: https://doi.org/10.1519/R-18465.1 [abstract]
- Keay N m.fl. 2019, BMJ Open Sport Exerc Med 5(1):e000523: https://doi.org/10.1136/bmjsem-2019-000523 [abstract]
- Klomsten Andersen O m.fl. 2018, BMJ Open Sport Exerc Med 4(1):e000449: https://doi.org/10.1136/bmjsem-2018-000449 [abstract]
- Lauersen JB, Bertelsen DM, Andersen LB 2014, Br J Sports Med 48(11):871-877: https://doi.org/10.1136/bjsports-2013-092538 [abstract]
- Lauersen JB, Andersen TE, Andersen LB 2018, Br J Sports Med 52(24):1557-1563: https://doi.org/10.1136/bjsports-2018-099078 [abstract]
- Lesinski M, Prieske O, Granacher U 2016, Br J Sports Med 50(13):781-795: https://doi.org/10.1136/bjsports-2015-095497 [abstract]
- Levin GT, McGuigan MR, Laursen PB 2009, J Strength Cond Res 23(8):2280-2286: https://doi.org/10.1519/JSC.0b013e3181b990c2 [abstract]
- Llanos-Lagos C, Ramirez-Campillo R, Sáez de Villarreal E 2025, Eur J Appl Physiol 126(1):193-222: https://doi.org/10.1007/s00421-025-05883-2 (PMC12881108) [læst]
- Lloyd RS m.fl. 2014, Br J Sports Med 48(7):498-505: https://doi.org/10.1136/bjsports-2013-092952 [abstract]
- Lloyd RS m.fl. 2016, J Strength Cond Res 30(6):1491-1509: https://doi.org/10.1519/JSC.0000000000001387 [abstract]
- Losnegard T m.fl. 2011, Scand J Med Sci Sports 21(3):389-401: https://doi.org/10.1111/j.1600-0838.2009.01074.x [abstract]
- Louis J m.fl. 2012, Eur J Appl Physiol: https://doi.org/10.1007/s00421-011-2013-1 [abstract]
- Lum D, Barbosa TM 2019, Int J Sports Physiol Perform 14(10):1318-1330: https://doi.org/10.1123/ijspp.2019-0329 [abstract]
- Lundberg TR m.fl. 2022, Sports Med 52(10):2391-2403: https://doi.org/10.1007/s40279-022-01688-x [abstract]
- Malina RM 2006, Clin J Sport Med 16(6):478-487: https://doi.org/10.1097/01.jsm.0000248843.31874.be [abstract]
- McNulty KL m.fl. 2020, Sports Med 50(10):1813-1827: https://doi.org/10.1007/s40279-020-01319-3 [abstract]
- McQuilliam SJ m.fl. 2020, Sports Med 50(9):1567-1580: https://doi.org/10.1007/s40279-020-01307-7 (PMC7441088) [læst]
- Moran J m.fl. 2017, J Sports Sci 35(11):1041-1051: https://doi.org/10.1080/02640414.2016.1209306 [abstract]
- Mujika I, Rønnestad BR, Martin DT 2016, Int J Sports Physiol Perform 11(3):283-289: https://doi.org/10.1123/IJSPP.2015-0405 [abstract]
- Murlasits Z, Kneffel Z, Thalib L 2018, J Sports Sci 36(11):1212-1219: https://doi.org/10.1080/02640414.2017.1364405 [abstract]
- Nuzzo JL 2020, Sports Med 50(5):853-870: https://doi.org/10.1007/s40279-019-01248-w [abstract]
- Nuzzo JL 2023, J Strength Cond Res 37(2):494-536: https://doi.org/10.1519/jsc.0000000000004329 [abstract]
- Olmedillas H m.fl. 2011, PLoS One 6(9):e24841: https://doi.org/10.1371/journal.pone.0024841 (PMC3184100) [læst]
- Pareja-Blanco F m.fl. 2017, Scand J Med Sci Sports 27(7):724-735: https://doi.org/10.1111/sms.12678 [abstract]
- Paton CD, Hopkins WG 2005, J Strength Cond Res 19(4):826-830: https://doi.org/10.1519/R-16334.1 [abstract]
- Peitz M, Behringer M, Granacher U 2018, PLoS One 13(10):e0205525: https://doi.org/10.1371/journal.pone.0205525 [abstract]
- Peterson MD m.fl. 2010, Ageing Res Rev 9(3):226-237: https://doi.org/10.1016/j.arr.2010.03.004 [abstract]
- Peterson MD, Sen A, Gordon PM 2011, Med Sci Sports Exerc 43(2):249-258: https://doi.org/10.1249/mss.0b013e3181eb6265 [abstract]
- Reid KF, Fielding RA 2012, Exerc Sport Sci Rev 40(1):4-12: https://doi.org/10.1097/JES.0b013e31823b5f13 [abstract]
- Roberts BM, Nuckols G, Krieger JW 2020, J Strength Cond Res 34(5):1448-1460: https://doi.org/10.1519/jsc.0000000000003521 [abstract]
- Robinson ZP m.fl. 2024, Sports Med 54(9):2209-2231: https://doi.org/10.1007/s40279-024-02069-2 [abstract]
- Rønnestad BR, Hansen EA, Raastad T 2010a, Eur J Appl Physiol 108(5):965-975: https://doi.org/10.1007/s00421-009-1307-z [abstract]
- Rønnestad BR, Hansen EA, Raastad T 2010b, Eur J Appl Physiol 110(6):1269-1282: https://doi.org/10.1007/s00421-010-1622-4 [abstract]
- Rønnestad BR, Hansen EA, Raastad T 2011, Scand J Med Sci Sports 21(2):250-259: https://doi.org/10.1111/j.1600-0838.2009.01035.x [abstract]
- Rønnestad BR, Nymark BS, Raastad T 2011, J Strength Cond Res 25(10):2653-2660: https://doi.org/10.1519/jsc.0b013e31822dcd96 [abstract]
- Rønnestad BR, Mujika I 2014, Scand J Med Sci Sports 24(4):603-612: https://doi.org/10.1111/sms.12104 [læst]
- Rønnestad BR, Askestad A, Hansen J 2014, Eur J Appl Physiol 114(9):1831-1839: https://doi.org/10.1007/s00421-014-2919-5 [abstract]
- Rønnestad BR m.fl. 2015, Scand J Med Sci Sports 25(1):e89-e98: https://doi.org/10.1111/sms.12257 [abstract]
- Rønnestad BR m.fl. 2016, Int J Sports Physiol Perform 11(6):727-735: https://doi.org/10.1123/ijspp.2015-0372 [abstract]
- Rønnestad BR m.fl. 2017, J Sports Sci 35(14):1435-1441: https://doi.org/10.1080/02640414.2016.1215499 [søgning]
- Saffioti N m.fl. 2026, Int J Sport Nutr Exerc Metab 36(3):324-334: https://doi.org/10.1123/ijsnem.2025-0033 [abstract]
- Schumann M m.fl. 2022, Sports Med 52(3):601-612: https://doi.org/10.1007/s40279-021-01587-7 [abstract; fuld tekst hentet]
- Sitko S, López-Laval I, Cirer-Sastre R 2023, preprint: https://doi.org/10.20944/preprints202312.2177.v1 [abstract]
- Straight CR m.fl. 2016, Sports Med 46(3):353-364: https://doi.org/10.1007/s40279-015-0418-4 [abstract]
- Stricker PR, Faigenbaum AD, McCambridge TM 2020, Pediatrics 145(6):e20201011: https://doi.org/10.1542/peds.2020-1011 [abstract]
- Sunde A m.fl. 2010, J Strength Cond Res 24(8):2157-2165: https://doi.org/10.1519/jsc.0b013e3181aeb16a [abstract]
- Tanaka H 1994, Sports Med 18(5):330-339: https://doi.org/10.2165/00007256-199418050-00005 [abstract]
- Thorborg K m.fl. 2017, Br J Sports Med 51(7):562-571: https://doi.org/10.1136/bjsports-2016-097066 [abstract]
- Vikmoen O m.fl. 2016, Scand J Med Sci Sports 26(4):384-396: https://doi.org/10.1111/sms.12468 [abstract]
- Vikmoen O m.fl. 2016, PLoS One 11(3):e0150799: https://doi.org/10.1371/journal.pone.0150799 [abstract]
- Weakley J m.fl. 2021, Strength Cond J (online maj 2020): https://www.nsca.com/contentassets/7fc346ec744044b6871541e5a6ee5c63/velocity_based_training__from_theory_to.99257.pdf [læst]
- Wilson JM m.fl. 2012, J Strength Cond Res 26(8):2293-2307: https://doi.org/10.1519/jsc.0b013e31823a3e2d [abstract]
- Yamamoto LM m.fl. 2010, J Strength Cond Res 24(2):560-566 (DOI ikke efterprøvet) [søgning]
- Østerås H, Helgerud J, Hoff J 2002, Eur J Appl Physiol 88(3):255-263: https://doi.org/10.1007/s00421-002-0717-y [abstract]

---

## 11. Hvad det betyder for Kadence

### 11.1 Frekvens efter sæson og alder (forslag til modellen)

| Profil                           | Nov-dec                                                                                          | Jan-medio mar                                                                                                  | Medio mar-okt (sæson)                                                             | Hop for knoglerne                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------- |
| **U17**                          | 2 pas à 20-30 min: teknik, kropsvægt, elastik, hop og sprint; DCU's tilvænning (3 × 16 → 3 × 12) | 2 pas; DCU: 4 × 6-8 RM efter ≥12 pas tilvænning, **eller** NCF-vej: fortsat teknik, core og hop uden tunge sæt | 1 pas à 30-45 min (DCU: vedligehold)                                              | 2-3 × 5 min om ugen hele året           |
| **U19**                          | 2 pas; DCU 3 × 12 → 3 × 8 → 4 × 6 RM, eller NCF tabel 2 (10/6 → 8/5 → 6/4 RM)                    | 2 pas (DCU) **eller** 1 pas fra jul (NCF-trænere)                                                              | 1 pas à ≤45 min, 2-3 sæt, 4-6 RM eller 2 × 5 ved 80-85 %; aldrig >10 dage imellem | 2-3 × 5 min om ugen                     |
| **U23 / voksen**                 | 2 pas, 3 × 10/6 → 8/5 RM                                                                         | 2 pas, 6/4 RM                                                                                                  | som U19; ophold på 8 uger giver målbart tab                                       | 2 × 5 min om ugen                       |
| **Motionist**                    | 2 pas (baseline-note)                                                                            | 2 pas                                                                                                          | 1 pas                                                                             | 2 × 5 min; allerede småhop i programmet |
| **Supermotionist / masters 50+** | 2 pas tung + **power 2 × 5 hurtige ved 40-60 %**                                                 | 2 pas                                                                                                          | **2 pas** (NSCA: 2-3 dage/uge), det ene kort                                      | 2-3 × 5 min; forsigtig start            |

Det, der er nyt i forhold til DCU og de to Kadence-programmer: hop hele
året for alle klasser, power for masters, 2 pas i sæsonen for masters,
NCF's "stop opbygning til jul" som alternativ, og en grænse på 10 dage
mellem pas i sæsonen.

### 11.2 Hvor styrke ligger i ugen

1. Styrke **først på dagen**, cykling senest 3 timer efter (Schumann),
   DCU siger 5-6 timer. Aldrig i samme pas som intervaller.
2. Styrke på en **let cykeldag** eller en hviledag; ikke dagen før et
   løb eller før ugens hårdeste interval (ingen forsøg, men DCU's 48
   timer og "tunge ben" i 2-3 uger).
3. **Mindst 48 timer** mellem to styrkepas (DCU); Olympiatoppen: et nyt
   pas kræver ~48 timer, et indarbejdet ~24.
4. De første **2-3 uger** af et styrkeforløb: cykelbelastningen ned
   (Rønnestad & Mujika). Det passer med november.
5. Hop ligger **frisk**: i opvarmningen til styrke eller som eget
   5-minutters pas, ikke efter en lang tur (eksplosiv styrke er det, der
   dæmpes af træthed).
6. Løb som krydstræning: ikke samme dag som tunge sæt (Wilson, Lundberg).
7. Mave/ryg afslutter styrkepasset (NCF, DCU), 3 × 15-20.

### 11.3 Hvad AI'en må foreslå, og hvad der kræver træner eller fysioterapeut

AI'en **må foreslå**:

- placering af styrkepas i ugen efter reglerne i 11.2, og flytning af et
  pas, når det kolliderer med intervaller eller løb;
- at skifte fra opbygning til vedligehold (dato eller "efter 24 pas"),
  og at advare, når der er gået >10 dage uden styrke i sæsonen eller når
  et 8-ugers hul nærmer sig;
- progression **i RM-termer** ("du tog 3 × 8 sidst, prøv 3 × 6") og "stop
  2 gentagelser før udmattelse" (RIR 1-2), aldrig kg eller % 1RM uden en
  1RM, træneren har godkendt;
- hop som fast lille pas, med den ærlige begrundelse (knogler; ét lille
  forsøg i ryttere);
- power-sæt til Motionist/Supermotionist;
- at tilbyde paradigmevalget til træneren: DCU-tung fra U17 eller
  NCF-sen fra 18;
- krydstræning i overgangsperioden som udholdenhedstid, med lavere
  specificitet;
- tekst, der siger det, evidensen siger: "giver mere watt sent i lange
  ture og i spurten", ikke "forbedrer din økonomi".

AI'en **må ikke** foreslå, og Kadence skal sende til træner eller
fysioterapeut:

- styrke til en rytter, der har **knæ-, ryg- eller hoftesmerter** i
  check-in (58 % og 36 % af professionelle har dem); bike fit (Bini 2011) og undersøgelse først;
- tunge sæt til en U17-rytter uden trænerens kvittering for, at
  teknikken er lært (alle skoler: teknik før belastning);
- noget om **kropsvægt, energitilgængelighed, menstruation eller
  knogletæthed** ud over at vise, at Kadence kender risikomønstret (lav
  vægt + stor volumen + ingen stød) og henvise til træner/læge;
- cyklusbaseret periodisering af styrke (ikke underbygget);
- styrke til masters med hjerte-, blodtryks- eller ledsygdom uden lægens
  ord (AHA, NSCA);
- at "garantere" sikkerhed; teksten siger "ikke flere skader end anden
  træning under kyndig vejledning" (Olympiatoppen) og "skaderne sker ved
  dårlig teknik og uden supervision" (Faigenbaum & Myer).

### 11.4 Konkrete ændringer i tekst og data

- Fjern udstrækning fra alt, der hedder skadesforebyggelse; behold
  "dynamisk opvarmning".
- Core-øvelser får beskrivelsen "stabil position og ryggen; beviset for
  flere watt mangler".
- Rønnestad-programmet (NCF tabel 2) kan lægges i biblioteket som
  "Lillehammer-programmet" med vedligeholdspasset 2 × 5 ved 80-85 %.
- Tilføj "Hop 5 minutter" som eget pas i biblioteket for alle klasser,
  med varianter (hink, sidehop, sjipning, trappehop; 50-100 kontakter).
- Tilføj power-sæt i Supermotionist styrke.
- Guardrail: ≥48 timer mellem styrkepas; ≥3 timer før cykling samme
  dag; ingen styrke dagen før et løb; advarsel ved >10 dage uden styrke
  i sæsonen og ved løb samme dag som tunge sæt.
- Alle tal i denne note, der går i kode, skal cite kilden ved siden af
  sig (CLAUDE.md). De tal, der er [søgning] eller [sekundær], må ikke.
