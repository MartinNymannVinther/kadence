# Coach material for Kadence: Danish sources beyond what Kadence already cites

Research note, 27 September 2026. The basis of the coach guide and the coach's tips (ADR 0021, `src/modules/coach`) and of DCU's race rules (`src/modules/dcu/races.ts`). The race numbers were checked again against the 2026 rules' text before they went into code.

**Baseline (already in Kadence, so not repeated here).** `docs/research/dcu-traeningsanbefalinger.md` (the six DCU PDFs: 2025 hours, U17/U19 compendia 2016, U17/U19/U23 strength programmes; the seven strength-material contradictions in section 6.5), `docs/research/foraeldre-og-talentudvikling.md` (Team Danmark's forældreguide and 9 tips, Talenthuset, ATK 2.0 on load, the ATK pain ladder, growth, dual career, sleep 8-10 h / 8-9 h, the Kolding wellbeing zones, DCU's "Vejen frem" 2025-2028), and `src/modules/dcu/*` (year wheel, interval sheet with heart-rate-reserve bands, `Sporstlige_regler_2025` for the age classes). Everything below is new unless it says otherwise.

**Method.** I downloaded and read the full text of every PDF marked "read" (the copies are not kept in the repository: most sources forbid or do not permit reproduction). Pages are PDF page numbers unless I say "printed p.". Items marked **[web page]** were read through a fetch tool that summarises. I checked their key quotes, but a human should look at the page again before a number goes into code. Items marked **[search only]** come from a search snippet and are **not verified**.

---

## 0. Summary of what is new and what matters most

1. **DCU's sporting rules 2026 exist** (final version 17 Feb 2026). Kadence cites the 2025 edition. For youth classes, gearing, distances and stage-race days, the 2026 text is identical to 2025 as far as I checked. The source should still be bumped.
2. **Race rules by class** (DCU rules 2025/2026, ch. 7), which Kadence does not have yet:
   - U17: road race max 80 km and TT max 15 km, gearing max 7.33 m per pedal revolution.
   - U19 men: road race 90-140 km, TT 25-30 km, no gear limit.
   - U19 women: road race 60-95 km, TT 20-30 km.
   - Stage races: youth and U19 at most 4 days, U23 at most 5.
3. **Gearing.** UCI dropped the junior (U19) limit of 7.93 m from 1 January 2023. DCU still limits U17 (7.33 m on the road, 7.04 m on the track) and U15 (6.68 m) in 2026.
4. **Safeguarding law.** A børneattest is compulsory for coaches with regular direct contact with children **under 15**. A U17 rider is 14 until their 15th birthday in their first U17 year, so every U17 coach is in scope. DIF's 2021 guide says "under 18". Straffeloven § 223 makes sex with a rider under 18 in the coach's charge a crime, and since 2021 such convictions show on børneattester.
5. **Weight.** Team Danmark recommends **not weighing athletes under 18** ("Som udgangspunkt …"), except for testing or fluid monitoring. Kadence's default is "no weight under 19". The two thresholds differ, which is fine because Kadence is stricter, but it should be noted.
6. **Low energy availability and eating disorders.** A Danish study for DIF (SDU, 2022) found symptoms in:
   - women: 23 % (elite) and 37 % (sub-elite);
   - men: 11 % (elite) and 23 % (sub-elite).
     Low energy availability risk was 53 % among elite women. Coaches' comments about weight were named as a trigger. Team Danmark's own REM-S note dates from 2015 and rests on the IOC's 2014 statement, which the IOC replaced in 2023.
7. **Concussion.**
   - UCI (from 2021): 24-48 h complete rest, and juniors return to racing no earlier than two weeks after their symptoms clear.
   - Danish guidance for children (DCFH 2024): light activity within 24-48 h even with symptoms; on average about 14 days to symptom-free and about 19 days to full sport.
     Riding in a group is a contact-risk activity and belongs to steps 4-6.
8. **Coach behaviour and dropout.** A KU cohort study for DIF (2024, 7,110 young people aged 12-20) found that coaching which supports autonomy and development predicts continuing next season. One-sided focus on results and controlling behaviour predict dropout, and this holds equally for elite and grassroots. Team Danmark's wellbeing survey 2024 (Idan) and DIF's trænerløfte add current Danish context.
9. **Anti-doping.**
   - Strict liability applies.
   - Buy only batch-tested supplements (Informed-Sport, Cologne List and others).
   - ATK: no supplements for youth except vitamin D (Oct-Apr) and no caffeinated energy drinks.
   - Asthma: salbutamol is allowed up to 1,600 µg/24 h, but Bricanyl (terbutaline) needs a TUE.
   - UCI has banned CO-rebreathing devices outside medical facilities since 10 Feb 2025.
10. **Not found despite searching:**

- any DCU heat guidance;
- any DCU "Ungdomsvejledning" or ungdomsrytter guide;
- DCU coach-course materials (only course descriptions are public);
- a cap on race days per season;
- "Ren Vinder" from Anti Doping Danmark (the name did not turn up; ADD's youth e-learning is "Unge, krop og trivsel");
- relevant youth-cycling material from Dansk Firmaidrætsforbund or Center for Holdspil og Sundhed.

---

## 1. Sources

Each entry gives the title, publisher, year and URL, then what it offers a coach of U17-U23, the reuse terms, and how reliable and current it is.

### A. Cycling Denmark (DCU)

**A1. "Danmarks Cykle Unions Sportslige regler 2026"**, DCU, final version 17.02.2026 (PDF metadata: created 2026-02-17, author Ulf Herold-Jensen, 128 pp.). The rules apply 1 March to 28 February.
URL: https://www.cyklingdanmark.dk/fileadmin/files/PDFer/Sporstlige_regler_2026_-_Endelig_versin_-_17.02.2026.pdf. Read in full text and compared with 2025 on every youth rule below.

- U19D §1.6 (PDF p. 35):
  - the class is for riders who turn 17 and 18;
  - one-day road race min 90 / max 140 km;
  - TT min 25 / max 30 km.
- U19P §1.14:
  - road race min 60 / max 95 km, TT 20-30 km;
  - rides with Dame A/B when at least 15 are entered, 10 of them Dame A; otherwise with U17 boys.
- U17D/U17P §1.15 (PDF p. 38; 2025: PDF p. 36, printed p. 35):
  - "Maksimumsdistancer: tidskørsler: 15 km, linjeløb: 80 km";
  - "Maksimumgearing er 7,33 meter/pedalomdrejning. Det er ikke tilladt at køre med låst gear";
  - U17 riders cannot be on U19 teams;
  - U17P girls can move up to U19P (2nd year from season start, 1st year from 1 June), with required returns for U17P DM and age-class stage races.
- U15 (13-14 years): road race 45 km, TT 15 km, gearing 6.68 m. U13 and U11: 6.18 m.
- Moving up and down, §3: only one move up per season; the application must come from the club coach or club chair; riders race DM in their own age class.
- Stage races §23.4 (2026 PDF p. 47; 2025 PDF p. 45, printed p. 44): "Børn/Unge Maksimum 4 dage; U19 - herre/dame Maksimum 4 dage; U23 Maksimum 5 dage".
- Stage distances (table 1):

  | Class     | Average per day | Max per day | Max TT | Max TTT |
  | --------- | --------------- | ----------- | ------ | ------- |
  | U19 men   | 100 km          | 120 km      | 30 km  | 40 km   |
  | U19 Cup   | 120 km          | 140 km      | –      | –       |
  | U23       | 150 km          | 180 km      | 40 km  | 50 km   |
  | U19 women | 60 km           | 80 km       | 15 km  | 20 km   |

  Half stages: at most 2 in a race under 6 days. A rest day is required from 11 race days.

- Track §16.13: U17 7.04 m, U15 6.33 m.
- BMX/other chapter: "Ingen gearbegrænsning i BU" (2025 line 9258). This applies to a different discipline; don't mix it up with the road rule.
- National championships:
  - U17D: TT 15 km and road race 80-85 km. U17P: road race 60-65 km.
  - Entry to the youth DM requires at least 3 licensed road races, and a rider must start the TT to start the road race.
  - U19D DM: road race max 140 km, TT about 25 km.
  - U23 DM: road race 160-180 km, TT 30-40 km.
- Helmets are compulsory (§15, CE-approved). Doping: DCU applies DIF's rules and Anti Doping Danmark's procedures (ch. 18).
- Licensing: an official public rulebook. No licence terms are stated. The numbers are facts. Cite, don't copy layout.
- Reliability: authoritative and current for 2026. **Internal inconsistency:** §5.10-1 says the U19D DM is for riders who "fylder 16-17 og 18 år", while §1.6-1 says 17 and 18.

**A2. "Danmarks Cykle Unions sportslige regler 2025"** (already `rules2025` in Kadence). The youth rules above are identical to 2026. Superseded, so bump the source.

**A3. The DCU web page "Træningsanbefalinger"** (https://www.cyklingdanmark.dk/uddannelse/traeningsanbefalinger) **[web page]**. New in it compared with Kadence:

- Two MTB strength programmes: `DCU_MTB_uerfarende.pdf` (Team Danmark, Jarl Pors Jakobsen, created 2013-11-12, same structure as the U19 programme) and `DCU_MTB_erfarende.pdf`.
- Three principles: "Træningsbelastning (produktet af træningsmængde og -intensitet)", "Træningsfrekvensen" and "Progression".
- **Discrepancy:** the page calls `Landevej_traeningsanbefalinger_2025.pdf` "Samlede træningsanbefalinger (damer, herrer, U17, U19, U23)", but the PDF has only the eight columns U17 1 to U23 4 (I checked the text). There are no separate women's numbers.

**A4. DCU coach education** (https://www.cyklingdanmark.dk/uddannelse/dcu-uddannelser; course PDFs `0920-DCU-*.pdf`, created 2020; catalogue `0920-DCU-Uddannelseskatalog-V2.pdf`, 30 pp.). Read.

- "B&U Basistræner": ATK, development of children and young people, training parameters by age, sports pedagogy, communication. One practical day plus 2-3 h of e-learning.
- "Træner 1": level 1 in DCU/DIF coach education, four modules (coach role, physiology, planning, differentiation, practice). The PDF's text layer is garbled; the structure comes from the web page.
- "Træner 2": modules on sports psychology, physiology, planning, discipline-specific capacity tests. Gives access to the "Diplomtræner".
- "Kaptajn Landevej": safe group rides, signals, handling crashes.
- **The course materials themselves are not public.** Kadence can link to the courses but cannot build on their content.
- DCU's own statement (uddannelse page): "Manglen på den rigtige træning til rette alder og niveau samt manglende træneruddannelse er en stor årsag til frafald."
- Current enough. The course PDFs date from 2020.

**A5. DCU "ATK-øvelser"** (https://www.cyklingdanmark.dk/uddannelse/atk-oevelser) **[web page]**. Skill drills (track stand, one-handed and no-handed riding, turns, narrow lane, drafting pull, picking things up, ride in the drops), aimed mostly at younger riders. Relevant to Kadence as warm-up or skill content for U17. Undated.

**A6. "Vejen frem – Talent- og elitestrategi 2025-2028"**, DCU (PDF created 2025-07-21, 25 pp.). Already summarised in the parents note. New points:

- Agents contact riders younger and younger, and riders face agent and contract decisions "allerede i U17 og U19". DCU offers independent advice.
- Women's talent concept (PDF around p. 14): U17 has 2 year groups, about 120 riders, 60 in the wider squad; U19 has 120, with 30 in the squad; U23 has 4 year groups, 120 riders, 14 in the squad. Monthly training reports with personal feedback.
- "Kost og ernæring i fokus": much more food is now eaten on the bike, and DCU wants to formalise nutrition education, especially for young women.
- "Etik og trivsel" (PDF p. 22): cycling is a "risikoidræt" where hard training and self-discipline can lead to a restrictive lifestyle. DCU also says frankly that elite sport is not always "healthy". This is a useful quote for why Kadence has guardrails.

**A7. DCU "Ny i cykelsporten"** (web page). Road cycling from age 8-9, licensed racing from 9, loan bikes. There is no youth guide. **I found no document called "Ungdomsvejledning" or similar.**

### B. Team Danmark

**B1. "ATK 2.0" digital edition** (Team Danmark; book 2016, digital foreword 2023, nutrition chapter pp. 168-225 **"udgivet i 2025"**; PDF created 2025-05-20, 366 pp.). https://tdatk2.in5.dk/assets/downloads/Team%20Danmark%20-%20ATK%202.0%20digital.pdf. Searched in full text. New beyond the parents note:

- **Licence (p. 2):** "Gengivelse af bogens indhold er ikke tilladt med mindre, Team Danmark har givet skriftlig tilladelse." This is stricter than the forældreguide. Paraphrase and link only.
- Growth (pp. 50-51):
  - PHV (peak height velocity) is 8-9 cm/year for girls and 10-15 cm/year for boys;
  - the later PHV comes, the lower it is;
  - average adult height at 16 (girls) and 18 (boys), but "ikke unormalt" for boys to finish at 20-22.
- Cycling as "Sen indgang til primær sport" (p. 32): in sports where physiology and body size decide, "som f.eks. i roning, cykling, triathlon og kajak", late entry is viable and objective talent identification "kan have værdi". Early specialisation raises the risk of injury and dropout.
- Strength training (pp. 56-57): not dangerous for children and young people, does not reduce growth or harm bones. Multi-joint free-weight lifts need technique time. This agrees with DCU's U17 claim.
- Growth-plate injuries (pp. 135-141): apophysitis (Osgood-Schlatter at the knee, Sever at the heel). A relevant flag for fast growers.
- Concussion signs (p. 152, after the 2013 consensus) and "hold øje i minimum 48 timer" (p. 154). Rehab follows the "stigeprincippet" ladder, with cycling as an early rung (p. 154).
- Nutrition 2025 (pp. 178-183):
  - vitamin D 10 µg/day, October to April (Sundhedsstyrelsen);
  - iron need rises from 13 to 15 mg/day at menarche; with fatigue, frequent infections or headache, check iron status with the GP;
  - vitamin and mineral supplements only for documented deficiency;
  - "Energidrikke indeholdende koffein anbefales ikke til børn og unge" (p. 182), with side effects listed up to cardiac arrest;
  - on camps and stage races where the same buffet is served at every meal, young people may eat less day by day. Aim to keep weight within ±1-2 kg (p. 182).
- Heat (p. 67): before puberty, be careful with aerobic work longer than 1-2 h ("dårligere varmeregulering"). Children need plenty to drink (p. 346). This mostly applies below U17.
- Reliability: high. Mostly 2016, with nutrition updated 2025.

**B2. "Anbefalinger til italesættelse af vægt og kropssammensætning"**, Team Danmark (one-page poster, PDF created 2023-09-07). https://www.teamdanmark.dk/media/3649/anbefalinger-til-italesaettelse-af-vaegt-og-kropskomposition.pdf. Read.

- Focus on: "Vægten må aldrig stå alene, der skal være et formål med enhver vejning og måling"; follow up and offer a conversation after measuring; tell athletes where to find help.
- Avoid:
  - comparing athletes' weight;
  - "Italesætte atletens vægt i andres påhør, og undgå at synliggøre den på skrift, hvor andre har mulighed for at se det";
  - humour, irony or sarcasm about weight;
  - focusing only on appearance;
  - commenting on food choices and portions.
- Team Danmark asks federations to write weighing procedures. **I found none from DCU.**
- Reuse: public poster, no stated licence. Paraphrase.

**B3. "Kropskomposition og vejning"** (https://www.teamdanmark.dk/til-atleter/sportsernaering/kropskomposition-og-vejning) **[web page, undated]**.

- "Som udgangspunkt er vores anbefaling, at man ikke skal veje atleter under 18 år. Der kan være undtagelser f.eks. ved testning og under slutrunder, hvor formålet er monitorering af væsketab."
- Weighing should be done only by people with health qualifications (ISAK-certified for body composition), with informed consent, confidential data, a private room and standardised conditions.
- "Data må ikke påtales i andres påhør."

**B4. "Relativ energi-mangel i sport" (REM-S note)**, Team Danmark, 2015 (PDF created 2015-03-20, 4 pp.). https://www.teamdanmark.dk/media/1681/rems-notatfinal.pdf. Read.

- Energy availability of about 45 kcal (190 kJ) per kg fat-free mass per day is adequate for adults; growing athletes should be **above** 45; the high-risk zone is below 30.
- Signs: reduced training response, frequent injuries, mood swings, lowered immunity, stress fractures, irregular periods. Weight loss is not required for REM-S to be present.
- Action: raise it with the athlete, refer to a sports dietitian, add 300-600 kcal/day over 3-6 months, consider DXA.
- **Dated:** based on IOC 2014. The IOC's **2023 REDs consensus** (Mountjoy et al., BJSM 57(17):1073-1097, doi:10.1136/bjsports-2023-106994) replaces it with the REDs CAT2 screening and risk tool and treats low energy availability as a spectrum from "adaptable" to "problematic". My reading of the 2023 statement is that it moves away from a single kcal cut-off. That reading was not verified against the full text.

**B5. "Kosttilskud" / "Anvendelse af kosttilskud"** (teamdanmark.dk) **[web page, undated]**.

- Optimise training, food and recovery first. Use only purity-tested products. Try a product in training, never first in a race. Avoid multi-ingredient products.
- The listed supplements (creatine, caffeine, beta-alanine, bicarbonate) are aimed at elite athletes.
- Youth policy lives in ATK (B1): nothing but vitamin D. Dansk Atletik's nutrition policy says no weight-loss advice and no supplements for athletes under 18 **[search only]**.

**B6. "Væske"** (teamdanmark.dk) **[web page, undated]**.

- Sweat loss up to 2 L/h.
- A loss of about 2 % of body weight generally does not impair performance noticeably.
- 30-90 g carbohydrate per hour in sessions longer than 60 min.
- The body absorbs at most 1,000-1,200 ml per hour.
- Rehydrate with 1.2-1.5 L per kg lost.
- Salt loss "op til 3-4 gram" in 1-2 h.
- Urine colour 5 or darker means drink more.
- Heat and low speed make dehydration worse.
- The only Team Danmark heat content I found. **There is no dedicated Team Danmark or DCU heat page.**

**B7. "Team Danmark trivselsundersøgelse 2024"**, Idrættens Analyseinstitut for Team Danmark, May 2025, ISBN 978-87-94468-52-7 (36 pp.). https://www.teamdanmark.dk/media/pzjbpuyg/team-danmark-trivselsundersoegelse-2024.pdf. Read.

- The respondents are Team Danmark-supported athletes, not youth club riders.
- Results:
  - 90 % felt safe in their daily training environment;
  - 82 % have a good relationship with their closest coach;
  - 14 % experienced boundary-crossing behaviour in the last year (22 % in 2021), mostly belittling comments, "kommentarer om krop og vægt" and aggressive behaviour;
  - 33 % had problematic conflicts;
  - 57 % considered quitting, mainly over money and motivation.
- Restates the four-level model of mental health (athlete, training environment, leadership, everyday life), each green, yellow or red. Problems arise when an athlete stays in yellow or red "gennem længere tid" (p. 10).
- **Licence (p. 4): "Gengivelse af denne rapport er tilladt med tydelig kildehenvisning."** This is the most reusable source in the set.

**B8. EliteSupport** (Anti Doping Danmark for Team Danmark, since June 2023) (https://www.antidoping.dk/elitesupport; https://www.teamdanmark.dk/ansvarlig-eliteidraet/elitesupport) **[search only for the details]**.

- A whistleblower channel for breaches of the ethical code in competitive sport.
- Scope is limited to Team Danmark elite environments, which covers national-team riders but probably not club riders.
- Anonymous SMS +45 52 51 30 20 and phone +45 72 240 240 (press 4). Verify before using.

**B9. "Sportslig godkendelse" and the federations' criteria** (https://www.teamdanmark.dk/til-atleter/uddannelse/gymnasial-ungdomsuddannelse **[web page]**; criteria PDF https://uu.teamdanmark.dk/organizationCriteria/pdf/file, generated on request, read).

- DCU's criterion: "U17-, U19- og U23-landsholdstrupperne på landevej, talenttruppen på bane eller MTB. Herudover individuel vurdering."
- Benefits: an extended upper-secondary programme, moved hand-ins and exams, supplementary teaching, flexibility for morning training.
- Deadline for 2027 entry: 11 January 2027 (answer by 2 February 2027).

**B10. "Talentklasser"** (teamdanmark.dk) **[web page]**. Grades 7-9 in Team Danmark's elite municipalities, 2-3 morning sessions a week, broad foundation. Mostly below U17; relevant only to first-year U17 riders still in 9th or 10th grade.

**B11. Kristoffer Henriksen, Carsten Hvid Larsen & Andreas Küttel, "Det mentalt sunde talentudviklingsmiljø"**, LET'S, Syddansk Universitet (PDF 2019, 3 pp., hosted by GymDanmark). https://gymdanmark.dk/wp-content/uploads/2020/11/kristoffer-henriksen-det-mentalt-sunde-talentudviklingsmiljoe-2.pdf. Read.

- Mental health is at risk with 50-hour weeks, shaming, "overdreven og offentlig vægtkontrol", too-early specialisation, and training on through injury without enough recovery.
- The healthy environment has eight marks: integrated efforts, suitable total load, clear values, patience, room for the whole person, psychological safety, an eye for mental health, and adversity met with support.
- A concrete recommendation that matches Kadence's transition feature: at the move to upper-secondary school, "Et par måneder med markant reduceret træningsmængde gør underværker".
- Based on the ISSP consensus statement (Henriksen et al. 2019, IJSEP). A researcher's opinion piece, labelled "et første bud".

### C. DIF (Danmarks Idrætsforbund) and Danish research

**C1. "Idræt for børn og unge"**, DIF, 3rd revised edition 2021, ISBN 87-90316-94-0 (60 pp.; © DIF 2021). https://www.dif.dk/media/i2wnl2yv/idr%C3%A6t-for-b%C3%B8rn-og-unge-h%C3%A6fte.pdf. Read. This is the DIF coach booklet for children and youth.

- Growth (pp. 29-30):
  - the growth spurt starts at about 10½-11 (girls) and 12½-13 (boys), for boys anywhere from 10½ to 16;
  - it lasts 2-2½ years: boys grow about 20 cm, girls about 16 cm;
  - peak velocity at about 14 (boys) and 12 (girls);
  - 98 % of adult height by 16½ (girls) and 17½ (boys);
  - weight gain peaks about half a year after height gain;
  - "Først omkring 20-årsalderen er skelettet færdigudviklet."
- Menstruation (p. 37):
  - average age at the first period is "ca. 12,5 år i Danmark", range 10-16;
  - with very hard training periods can become irregular or stop, usually from weight loss or pressure; see a doctor if they stay away;
  - coaches should be open about the subject.
- Dropout (p. 25): starts at 10-12 and is greatest among girls. DIF 2019 membership aged 13-18: 147,227 boys against 109,368 girls.
- Reuse: © DIF, no reuse clause found. Paraphrase.

**C2. "Guide til indhentning af børneattest"**, DIF (PDF 2021-01-14, 2 pp.), and the web pages https://www.dif.dk/raadgivning-og-stoette/trivsel-og-sundhed/seksuelle-kraenkelser/boerneattester, https://www.dif.dk/nyheder/2021/01/boerneattest-paakraevet-for-alle-boernetraenere-hent-guide and DGI's equivalent **[web pages]**.

- **The law** (Lov om indhentelse af børneattest, in force since 1 July 2005, extended 2012): associations must obtain a børneattest for paid and volunteer staff with direct and ongoing contact with, or who regularly spend time among, **children under 15**. The club can be fined for not complying (DIF, "Det uhørte overgreb", p. 4).
- DIF advises renewal every 2-3 years.
- Since 1 July 2022 the Udelukkelsesnævn (DIF/DGI/Firmaidræt) is told automatically about a børneattest with a record. Since April 2021 convictions under straffeloven § 223 for victims aged 15-17 appear on børneattester (Idan news item).
- **DIF's 2021 guide opens with "Der skal indhentes børneattest på alle, der træner børn og unge under 18 år"**, and says someone with a record cannot "som udgangspunkt" be hired to coach under-18s. That is DIF policy and practice, not the law. See the contradictions in section 2.

**C3. Straffeloven § 223** (https://danskelove.dk/straffeloven/223; Straffelovrådet's report 1534, ch. 14) **[search only for the wording]**.

- Sexual intercourse with a person under 18 who is "betroet til undervisning eller opdragelse" is punishable by up to 4 years in prison. Coaches are generally treated as covered.
- DIF's leaflet "Det uhørte overgreb" (DIF, PDF 2021, 8 pp.) sets its own lines on physical contact: groin and breasts never; "Smækkys på munden bør overlades til forældrene"; male coaches stay out of the girls' changing room; clubs should agree on norms. It also tells coaches to report concerns to the municipality.
- Laws are not copyright-protected in Denmark (ophavsretsloven § 9), so they can be quoted.

**C4. "Det motiverende idrætsmiljø for unge"**, DIF 2024 (research by Glen Nielsen, Johan M. Wikman, Peter Bentsen, Peter Elsborg; Institut for Idræt og Ernæring, Københavns Universitet, with Bispebjerg-Frederiksberg Hospital). PDF created 2024-07-08, 20 pp. https://www.dif.dk/media/mpjhxdwg/dif_det-motiverende-idraetsmiljoe_final-v20_2024.pdf. Read.

- Design: 7,110 young people aged 12-20 (24 % elite) in football, handball, basketball, badminton and gymnastics (**no cycling**), followed over two seasons.
- Findings:
  - intrinsic and identified motivation predict continuing next season;
  - introjected ("jeg bør") and external motivation predict dropout;
  - competence, belonging and autonomy each predict continuing;
  - "empowering coaching" (task and development focus, autonomy support, belonging) raises continuation;
  - "ensidigt resultatfokus og kontrollerende adfærd" raises dropout;
  - the effect is "i lige høj grad gældende for elite og bredde".
- Relevance to Kadence: evidence for the product principle "process before results" and for the design of the AI's Monday brief.
- The scientific report is at http://nexs.ku.dk/idr-miljo (not read).

**C5. "Den gode ungeidræt"** (DIF web page, for ages 13-25) **[web page]**. Five recommendations:

1. "Skab harmoni mellem livsfase og idræt"
2. "Bevar fascinationen af idrætten"
3. "Sørg for at have engagerede trænere"
4. "Lav en plan i foreningen"
5. "Indtænk forældreinvolvering for dem under 18 år"

The related folder "Det gode børne- og ungeliv i foreningsidrætten" (DIF 2018) allows "Gengivelse … med tydelig kildehenvisning".

**C6. DIF "Trænerløftet"** (DIF news, Oct 2024) **[web page]**.

- The pledge: "Som træner vil jeg igennem gode, sjove og inddragende oplevelser dygtiggøre mine udøvere og mig selv."
- Three commitments: a developing, motivating and respectful environment; curiosity about one's own development; training every athlete from where they are.
- A free 30-minute e-learning course. Target: 80,000 coaches by the end of 2027 (project "Fremtidens idræt for børn og unge").

**C7. "Spiseforstyrrelser og lav energitilgængelighed i dansk elite- og subeliteidræt"**, Mia Beck Lichtenstein (SDU) & Anna Melin (Linnaeus University), report for DIF, 16.11.2022 (75 pp.). https://www.dif.dk/media/jwunqsit/rapport-spiseforstyrrelser-i-elite-og-subelitesport-16-11-22.pdf. Read summary pp. 7-10 and results pp. 31-33.

- Design: 616 athletes (410 elite, 206 sub-elite), mean age about 20-21; cycling is one of the endurance sports in the sample.
- Screening results:

  | Measure                             | Elite | Sub-elite |
  | ----------------------------------- | ----- | --------- |
  | SCOFF, women                        | 23 %  | 37 %      |
  | SCOFF, men                          | 11 %  | 23 %      |
  | Low energy availability risk, women | 53 %  | 49 %      |
  | Low energy availability risk, men   | 18 %  | 13 %      |

- Triggers named in the interviews: a culture of body comparison and "Kommentarer om vægttab fra trænere eller træningskammerater".
- Recommends better coach education and clear routes to help.
- Caveat: the response rate was about 40 %.
- Reuse: not stated. Paraphrase with a citation.

**C8. Danish concussion guidance.** Dansk Center for Hjernerystelse, "Tilbage til sport efter hjernerystelse – Informationsark til sportstrænere og sportsundervisere", V1 25.06.24 (6 pp.). https://dcfh.dk/wp-content/uploads/2024/09/Informationsark_til_traenere_og_underviser_indenfor_sport_TILBAGE_TIL_SPORT_EFTER_HJERNERYSTELSE_2024_.pdf. Read.

- On average about 14 days to symptom-free and about 19 days to full sport.
- Light activity may start within 24-48 h, even with symptoms. A mild flare-up is acceptable if it lasts under an hour and rises at most 2 points on a 0-10 scale.
- Return to school fully before returning to sport fully.
- Six stages:
  1. symptom-limited activity;
  2. light aerobic: 2A about 55 % of max HR, 2B about 70 %, for example a stationary bike;
  3. individual sport-specific drills;
  4. training without contact, only once all symptoms are gone;
  5. full practice;
  6. competition.
- Also DIF "Vejen tilbage til skole og idræt efter hjernerystelse" (PDF 2018, 1 p.).

### D. Anti Doping Danmark (ADD)

**D1. "Kosttilskud"** (https://www.antidoping.dk/doping/kosttilskud) **[web page, undated]**.

- "Som idrætsudøver har du altid selv ansvaret for, hvad du indtager."
- Certification schemes: Informed-Sport, NSF Certified for Sport, BSCG, Cologne List, HASTA. What is tested is "det specifikke produkt med det specifikke batchnummer".
- Keep the certificate and receipt, keep a log of intake, and declare use in the last 7 days on the doping control form.
- Meat-contamination risk in China, Mexico, Guatemala, Peru and Colombia.
- ADD does not advise on supplement use itself; it refers to the federation, Team Danmark or a dietitian.
- A 10-15 % contamination risk figure is quoted by the search snippet **[search only]**.

**D2. "Har du astma?" and "Medicin"** (antidoping.dk) **[web pages]**.

- Inhaled salbutamol max 1,600 µg per 24 h (max 600 µg per 8 h), formoterol max 54 µg per 24 h, salmeterol max 200 µg per 24 h. Inhaled corticosteroids are allowed.
- "Bricanyl er udbredt til behandling af astma i Danmark, men står på Dopinglisten", so it needs a TUE.
- There is a medicine lookup on the site and in the "Anti Doping Danmark" app, covering all medicines approved by Lægemiddelstyrelsen.
- For minors in control: the right to contact parents or guardian is stated for fitness control. For elite sport, parents can withdraw consent to data processing (privacy policy) **[search only]**.

**D3. E-learning.** uddannelse.antidoping.dk, including "Unge, krop og trivsel" for coaches **[search only]**. **"Ren Vinder" was not found** under that name.

### E. International sources that bind Danish riders

**E1. UCI, junior gearing** (Cyclingnews and others; UCI regulation 2.2.023): the 7.93 m junior limit was abolished from 1 January 2023, citing "limited availability of equipment" and "medical evidence that no longer supports the current restrictions". DCU's national U17 and U15 limits remain (A1).

**E2. UCI concussion protocol**, 2021 season ("A new protocol specific for cycling to deal with concussion", uci.org) **[web page]**: "a period of complete rest of between 24 and 48 hours"; "not return to competition for at least a week after their symptoms have cleared up (two weeks in the case of juniors)". It is based on the Harrogate cycling consensus.

**E3. UCI High Temperature Protocol**, January 2024 **[web page and search]**.

- Risk is assessed from temperature and humidity (WBGT).
- Bands per secondary reporting **[search only]**:

  | Band   | WBGT            | Risk          |
  | ------ | --------------- | ------------- |
  | white  | under 15 °C     | very low      |
  | green  | 15-17.9 °C      | low           |
  | yellow | 18-22.9 °C      | moderate-low  |
  | orange | 23-27.9 °C      | moderate-high |
  | red    | 28 °C and above | high          |

- Measures: shaded start areas, ice, extra feeding, a moved start, a shortened course.

**E4. UCI CO-rebreathing ban**, in force 10 February 2025. Possessing CO-rebreathing systems outside a medical facility is prohibited for all licence-holders.

**E5. Færdselsloven § 49** (https://danskelove.dk/f%C3%A6rdselsloven/49) **[search only for the wording]**: two cyclists may ride side by side where there is room and it causes no danger or undue inconvenience. Not side by side when someone signals to overtake, unless traffic conditions allow or require it. Relevant to group rides.

---

## 2. Contradictions and tensions to flag

| #   | Topic                             | Source A                                                                                     | Source B                                                                 | Suggestion for Kadence                                                                                                                                                       |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Børneattest age                   | The law: contact with children **under 15** (DIF web page, DGI, "Det uhørte overgreb" p. 4)  | DIF guide 2021: "alle, der træner børn og unge **under 18** år"          | State the legal floor (under 15, so it covers U17-1 riders until they turn 15). Recommend DIF's under-18 practice. Recommend renewal every 2-3 years.                        |
| 2   | Weighing age                      | Team Danmark: don't weigh under **18** (B3)                                                  | Kadence ADR 0013: no weight or W/kg under **19** unless the team opts in | Keep Kadence's stricter default. Cite Team Danmark as the basis. Explain the 19 in the ADR (DCU's class boundary).                                                           |
| 3   | Average first period              | ATK 2.0: 13.4 years, range 11-16 (parents note)                                              | DIF 2021: about 12.5 years, range 10-16                                  | Don't hardcode either. Say "usually 10-16".                                                                                                                                  |
| 4   | Boys' adult height                | ATK: about 18, sometimes 20-22                                                               | DIF: 98 % by 17½                                                         | Consistent enough. A growth flag should stay possible through U19.                                                                                                           |
| 5   | Concussion rest                   | UCI (2021): 24-48 h **complete rest**; juniors back to racing ≥ 2 weeks after symptoms clear | DCFH (2024): light activity within 24-48 h, even with mild symptoms      | Both agree on no racing or group riding while symptomatic. Show the DCFH ladder for training and the UCI two-week rule for races. The doctor decides.                        |
| 6   | REDs thresholds                   | Team Danmark 2015: 45 / 30 kcal per kg fat-free mass per day                                 | IOC 2023 REDs: spectrum model and CAT2 tool (unverified detail)          | Never compute energy availability in Kadence. Use signs and refer on. Cite both, and note that Team Danmark's note predates IOC 2023.                                        |
| 7   | U19D DM age                       | Rules §1.6-1: turning 17-18                                                                  | Rules §5.10-1: "16-17 og 18 år"                                          | Minor. Kadence's class logic follows §1.6 already.                                                                                                                           |
| 8   | 2025 hours PDF                    | Web page: "damer, herrer, U17, U19, U23"                                                     | PDF: only U17 1 to U23 4                                                 | No women's hours exist. Kadence's current reading is right.                                                                                                                  |
| 9   | Training ride against race length | DCU U17 compendium: never ride over 4 h / 120 km in training                                 | Rules: U17 race max 80 km (DM 80-85 km)                                  | Not a contradiction, but a coach tip: the longest U17 race is shorter than the longest allowed training ride. The same holds for U19 (5 h / 150 km against races of 140 km). |
| 10  | Supplements                       | Team Danmark (elite adults): creatine, caffeine, beta-alanine and others may be considered   | ATK 2025 (youth): only vitamin D; no caffeinated energy drinks           | For under-18s, follow ATK. Label the elite list as not for youth.                                                                                                            |
| 11  | Juniors' gearing                  | UCI: no limit since 2023                                                                     | DCU still limits U17 (7.33 m road, 7.04 m track) and U15 (6.68 m)        | U19 has no limit. Tip for the first year in U19: bigger gears are allowed, so ramp gear-heavy work gradually. That last advice is my suggestion, not sourced.                |
| 12  | Wellbeing duration                | Forældreguide: act at about **3 weeks** of struggle; a yellow-zone meeting within 14 days    | Team Danmark model: problems arise "gennem længere tid" (no number)      | Kadence's "yellow too long" guardrail can cite the forældreguide's 3 weeks as its number.                                                                                    |

---

## 3. Proposed Danish coach guide inside Kadence ("Trænerguide")

Written in Kadence's own words, as short pages with a "Kilder" footer on each linking to the originals. Team Danmark's ATK and forældreguide are paraphrased only and never reproduced (see section 4). The headings are suggestions in Danish.

**1. "Din rolle som træner for unge ryttere"**

- Development before results; empowering coaching (C4, C6).
- Healthy talent environments: eight marks (B11), HUSET (parents note).
- Why young riders stop: dropout starts at 10-12 and is greatest among girls; a strong statistical predictor of dropout is results-only, controlling coaching (C1, C4).
- Cycling as a sport with late entry, where late developers catch up (B1 p. 32; ATK on relative age in the parents note).

**2. "Før du starter: børneattest, kurser og ansvar"**

- Børneattest: the legal floor, DIF practice, renewal (C2).
- § 223 and physical contact norms (C3).
- DCU courses: B&U Basistræner, Træner 1/2, Kaptajn (A4).
- DIF Trænerløftet (C6).
- Group-ride traffic rules (E5).

**3. "Årgangene og reglerne"**

- DCU classes by birth year (already in Kadence).
- For each class: race distances, gearing, stage-race days, moving up and down, DM entry needs 3 licensed races (A1).
- Licence classes after U19 (research note section 8).
- "Sportslig godkendelse" for national squads (B9).

**4. "Mængde og sæson"**

- DCU hours and corridor, year wheel, October break (already in Kadence).
- Longest ride against race length (section 2, row 9).
- No big jumps at camps (compendium).
- Stage-race day limits (A1).

**5. "Styrketræning"**

- DCU programmes, 48 h, 30 sessions, technique first (already in Kadence).
- ATK: safe for young people, no harm to growth (B1 pp. 56-57).
- MTB programmes exist too (A3).

**6. "Vækstspurt og biologisk alder"**

- PHV figures (B1 pp. 50-51; C1 pp. 29-30).
- Technique can wobble during the spurt (parents note).
- Growth-plate pain such as Osgood-Schlatter and Sever: reduce load and use the ATK pain ladder (B1 pp. 135-141).
- Relative age effect (parents note).

**7. "Belastning, smerte og skader"**

- ATK pain ladder (already in Kadence).
- Concussion: signs (B1 p. 152), DCFH stages (C8), UCI juniors ≥ 2 weeks before racing (E2).
- Illness or fever means no training (parents note).

**8. "Søvn, mad og væske"**

- Sleep 8-10 h for 14-17 (already cited).
- ATK 2025: regular meals, a snack before and after training, vitamin D Oct-Apr, iron for girls, no energy drinks (B1 pp. 178-183).
- Camp and buffet effect: keep weight within ±1-2 kg (B1 p. 182).
- Fluid numbers (B6).

**9. "Krop, vægt og energi (REDs)"**

- Don't weigh under 18; how to talk about weight (B2, B3).
- The DIF/SDU prevalence numbers and the role of coach comments (C7).
- REDs signs and action (B4, IOC 2023).
- Menstruation: openness, and absent periods mean seeing a doctor (C1 p. 37; ATK red flags in the parents note).

**10. "Doping, medicin og kosttilskud"**

- Strict liability, batch-tested products only (D1).
- For under-18s: nothing but vitamin D (B1).
- Asthma medicines and the medicine lookup (D2).
- CO-rebreathing ban (E4).
- ADD e-learning (D3).

**11. "Trivsel og mental sundhed"**

- Team Danmark's 4-level green/yellow/red model (B7).
- Kolding zones and the 3-week, 14-day rules (parents note).
- What healthy environments look like (B11).
- The 2024 survey figures (B7).
- Where to report: EliteSupport for national-team environments (B8); club, DIF and municipality for others (C3).

**12. "Skole, eksamen og overgange"**

- Dual career (parents note).
- Sportslig godkendelse (B9).
- Cut training for a few months when a rider starts upper-secondary school (B11; forældreguide theme 10).
- Agents and contracts in U17/U19: DCU offers independent advice (A6).

**13. "Varme og vejr"**

- Fluid and salt numbers (B6).
- UCI WBGT bands as a reference (E3).
- **Clearly marked: DCU and Team Danmark publish no heat guideline for youth**, so this section is Kadence's summary of general sources.

**14. "Samarbejdet med forældre"** (already largely covered; link to the parents' guide).

---

## 4. Reuse and licensing summary

| Source                                               | What its terms say                                                                         | How Kadence can use it                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| DCU rules and PDFs                                   | No licence stated                                                                          | Facts and numbers with page references (as Kadence does now)                    |
| Team Danmark ATK 2.0                                 | "Gengivelse … ikke tilladt med mindre, Team Danmark har givet skriftlig tilladelse" (p. 2) | Paraphrase and link only; even short quotes are best avoided without permission |
| Team Danmark forældreguide                           | Non-commercial, with attribution (parents note)                                            | Paraphrase and link                                                             |
| Team Danmark web pages and posters                   | Not stated                                                                                 | Paraphrase and link                                                             |
| Idan, Team Danmark wellbeing survey 2024             | "Gengivelse … tilladt med tydelig kildehenvisning"                                         | Quotes and figures allowed with citation                                        |
| DIF "Det gode børne- og ungeliv" (2018)              | "Gengivelse … tilladt med tydelig kildehenvisning"                                         | Allowed with citation                                                           |
| DIF booklet 2021, DIF reports                        | © DIF, no reuse clause                                                                     | Paraphrase and cite                                                             |
| Laws (børneattestloven, straffeloven, færdselsloven) | Not protected (ophavsretsloven § 9)                                                        | May be quoted                                                                   |
| UCI, ADD, DCFH                                       | Not stated                                                                                 | Paraphrase and link                                                             |

Kadence is free AGPL software, but "commercial" is not defined in Team Danmark's terms. Treat hosted Kadence as possibly commercial and ask Team Danmark before showing any of their text, models or figures.

---

## 5. Contextual coach tips: where they would help in the app

Each tip is short (1-2 sentences in Danish, via i18n), shown to the coach, dismissable, and links to the matching guide page. None of them enforces anything, in line with "guardrails, not bans". Section numbers point to the source list above.

**Planning strength sessions (workout builder, library)**

- Less than 48 h since the last strength session: already a guardrail.
- Adding strength in Nov-Mar: "Mindst 30 pas over vinteren; kan det ikke nås, anbefaler DCU ikke at starte" (compendium).
- The first 6-12 sessions of a programme: protocol reps, not to failure. DCU's own texts disagree here; show that.
- For a rider with a growth flag: "Styrketræning skader ikke vækst (ATK), men prioritér teknik og hold øje med knæ/hæl-smerter" (B1).

**Weekly hours over DCU's corridor or a steep ramp (load chart, team grid)**

- Cite U17 "not too much" and "no jumps at camps".
- If the rider is also yellow in check-ins: "Kombinationen af høj belastning og dårlig trivsel er et signal – tal med rytteren" (B7/B11 model).
- Camp planned: "undgå store spring i mængden" and the buffet effect on eating (B1 p. 182).

**Growth spurt (the height log shows fast growth, e.g. more than 0.5 cm a month; the threshold is my suggestion)**

- "Teknik og koordination kan svinge i vækstspurten; skru ned for spring i belastning, og tag smerter ved knæ/hæl alvorligt" (B1 pp. 50-51, 135-141; C1).

**Check-in yellow, or pain reported**

- Yellow for 3 weeks: suggest a conversation within 14 days (forældreguide theme 9).
- Pain: the ATK ladder (already in Kadence).
- A tip that the environment matters, not only the rider (B7 four levels).
- Sleep under 7 h repeatedly (parents note).
- Suspicion of REDs (fatigue, repeated injuries, stalled progress): "henvis til læge/sportsdiætist; kommentér ikke vægt" (B2, B4, C7). This needs very careful wording.

**Before a race (race in the calendar)**

- The class's distance and gearing limit: U17 max 80 km and 7.33 m (A1).
- Opener the day before (compendium).
- Stage race: max 4 days for U17/U19 and 5 for U23; check total load (A1).
- First licensed race of the season: DM entry needs 3 licensed races (A1).
- Parent-facing tip: forældreguide theme 2 (already planned).

**Heat (optional weather lookup, or a manual "varmt" flag; offline-safe)**

- Fluid 1.2-1.5 L per kg lost, salt when sweating a lot, carbohydrate 30-90 g/h on long rides (B6).
- Move sessions to early or late; shorten intervals.
- UCI's WBGT bands as a reference for race days (E3).
- Label clearly: "Ingen dansk ungdomsvejledning for varme".

**Exam period (school or exam calendar events)**

- Reduce load and lower expectations (ATK dual career, forældreguide theme 8).
- Plan homework blocks on camps (ATK).

**First season in a new class (auto-detect when the season changes, and in November)**

- **U17-1:**
  - new gear limit and 80 km races;
  - "Det vigtigste er ikke at træne for meget" (compendium);
  - börneattest reminder to the coach, since the rider may be 14 for part of the year (C2).
- **U19-1:**
  - no gear limit, and races of 90-140 km;
  - a volume increase of 10-15 % a year (compendium);
  - sportslig godkendelse deadline in January for riders starting upper-secondary school (B9);
  - suggest fewer sessions for the first months of the new school (B11).
- **U23-1:**
  - younger U23 riders may lie below the recommendations (compendium);
  - licence class A/B/C rules (research note section 8);
  - agents and contracts: DCU offers independent advice (A6).
- **Turning 18:** the guardian link lapses (already in Kadence); the weighing default under Team Danmark stays until 18, while Kadence's default runs to 19.

**Crash or suspected concussion (comment or activity note, a "styrt" tag)**

- "Ved mistanke om hjernerystelse: stop, lægevurdering; gradvis tilbagevenden efter DCFH-trinene; ingen løb før 2 uger symptomfri for U19 (UCI)" (C8, E2).

**Illness, medicine or supplements (a "syg" check-in, or a comment mentioning medicine)**

- Fever means no training (forældreguide).
- Asthma medicine: check ADD's medicine lookup; Bricanyl needs a TUE (D2).
- Supplements for under-18s: only vitamin D (B1).
- The AI should get this as context, never as instructions.

**Weight or W/kg fields (team setting)**

- When a coach turns weight on, show Team Danmark's rules (B2, B3): purpose, consent, never in front of others, and none under 18 as a default.

**Team overview and selection**

- Show birth quarter and growth flag beside results (relative age; parents note).
- Team Danmark's warning about ranking lists (already in Kadence as "no leaderboards").

**Group ride planning (a session tagged "fællestur")**

- Two abreast only where it is safe (E5).
- The DCU Kaptajn course (A4).

**The coach's Monday brief (AI)**

- Feed the sourced rule texts above as structured context (as `VOLUME_RULES` does now), so the AI can cite "DCU s. X" or "ATK s. Y".
- Never let it phrase weight or body comments (B2, C7).

---

## 6. Could not verify or not found

- A DCU heat or weather guideline, a DCU youth guide ("Ungdomsvejledning"), DCU weighing procedures, and a cap on race days per season for U17-U23. None found.
- "Ren Vinder" (ADD). Not found; ADD's coach e-learning is "Unge, krop og trivsel" **[search only]**.
- The UCI WBGT band values (secondary sources only) and the exact wording of § 223 and Færdselsloven § 49 (search snippets).
- Whether the IOC 2023 REDs statement drops fixed energy-availability thresholds (my reading, not checked in full text).
- Dansk Atletik's "no supplements under 18" (snippet). Dansk Firmaidrætsforbund, Center for Holdspil og Sundhed and Dansk Selskab for Sportsmedicin had no youth-cycling-specific material in my searches. I did not search them in depth.
- The text layer of DCU's Træner 1 PDF is garbled. Its content comes from the web page and the Træner 2 and B&U PDFs.
- Any Team Danmark or DCU page on sleep, overtraining or overload beyond what the parents note already covers. I did not re-read them.
