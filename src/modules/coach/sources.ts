/**
 * The documents behind the coach guide and the coach's tips, beyond
 * DCU's own (`src/modules/dcu/sources.ts`). Read for
 * docs/research/traenermateriale.md, which says what each one offers, its
 * reuse terms and how current it is.
 *
 * Reuse matters here: Team Danmark forbids reproducing ATK 2.0 without
 * written permission, so Kadence writes its own words and links to the
 * originals — the same for every source whose terms are silent. Laws may
 * be quoted (ophavsretsloven § 9).
 *
 * Pure: imports nothing from the database.
 */

export type CoachSourceId =
  | "dcuRules2026"
  | "dcuHours2025"
  | "dcuU17Compendium"
  | "dcuU19Compendium"
  | "dcuEducation"
  | "dcuStrategy"
  | "atk"
  | "tdWeightPoster"
  | "tdWeighing"
  | "tdRems"
  | "tdFluid"
  | "tdWellbeing2024"
  | "tdParentGuide"
  | "tdDualCareer"
  | "henriksen"
  | "difYouth"
  | "difChildCertificate"
  | "difAbuse"
  | "difMotivation"
  | "difCoachPledge"
  | "difEatingDisorders"
  | "dcfhConcussion"
  | "addSupplements"
  | "addAsthma"
  | "uciConcussion"
  | "uciHeat"
  | "ioc2023Reds"
  | "lawChildCertificate"
  | "lawPenal223"
  | "lawTraffic49";

export type CoachSource = {
  title: string;
  publisher: string;
  year: number | null;
  url: string;
};

export const COACH_SOURCES: Record<CoachSourceId, CoachSource> = {
  dcuRules2026: {
    title: "Danmarks Cykle Unions sportslige regler 2026",
    publisher: "DCU",
    year: 2026,
    url: "https://www.cyklingdanmark.dk/fileadmin/files/PDFer/Sporstlige_regler_2026_-_Endelig_versin_-_17.02.2026.pdf",
  },
  dcuHours2025: {
    title: "Træningsanbefalinger – Landevej 2025",
    publisher: "DCU",
    year: 2025,
    url: "https://www.cyklingdanmark.dk/fileadmin/user_upload/Landevej_traeningsanbefalinger_2025.pdf",
  },
  dcuU17Compendium: {
    title: "U17-rytter 2016 – Kompendium",
    publisher: "DCU",
    year: 2016,
    url: "https://www.cyklingdanmark.dk/fileadmin/user_upload/DCU_U17_kompendium_2016.pdf",
  },
  dcuU19Compendium: {
    title: "U19-rytter 2016 – Kompendium",
    publisher: "DCU",
    year: 2016,
    url: "https://www.cyklingdanmark.dk/fileadmin/user_upload/DCU_U19_kompendium_2016.pdf",
  },
  dcuEducation: {
    title: "DCU's uddannelser (B&U Basistræner, Træner 1 og 2, Kaptajn Landevej)",
    publisher: "DCU",
    year: null,
    url: "https://www.cyklingdanmark.dk/uddannelse/dcu-uddannelser",
  },
  dcuStrategy: {
    title: "Vejen frem – Talent- og elitestrategi 2025-2028",
    publisher: "DCU",
    year: 2025,
    url: "https://www.cyklingdanmark.dk",
  },
  atk: {
    title: "ATK 2.0 – Aldersrelateret træning (digital udgave)",
    publisher: "Team Danmark",
    year: 2025,
    url: "https://tdatk2.in5.dk/assets/downloads/Team%20Danmark%20-%20ATK%202.0%20digital.pdf",
  },
  tdWeightPoster: {
    title: "Anbefalinger til italesættelse af vægt og kropssammensætning",
    publisher: "Team Danmark",
    year: 2023,
    url: "https://www.teamdanmark.dk/media/3649/anbefalinger-til-italesaettelse-af-vaegt-og-kropskomposition.pdf",
  },
  tdWeighing: {
    title: "Kropskomposition og vejning",
    publisher: "Team Danmark",
    year: null,
    url: "https://www.teamdanmark.dk/til-atleter/sportsernaering/kropskomposition-og-vejning",
  },
  tdRems: {
    title: "Relativ energi-mangel i sport (REM-S)",
    publisher: "Team Danmark",
    year: 2015,
    url: "https://www.teamdanmark.dk/media/1681/rems-notatfinal.pdf",
  },
  tdFluid: {
    title: "Væske",
    publisher: "Team Danmark",
    year: null,
    url: "https://www.teamdanmark.dk/til-atleter/sportsernaering/vaeske",
  },
  tdWellbeing2024: {
    title: "Team Danmark trivselsundersøgelse 2024",
    publisher: "Idrættens Analyseinstitut for Team Danmark",
    year: 2025,
    url: "https://www.teamdanmark.dk/media/pzjbpuyg/team-danmark-trivselsundersoegelse-2024.pdf",
  },
  tdParentGuide: {
    title: "Forældreguide for sportsforældre",
    publisher: "Team Danmark og Kolding Talent",
    year: null,
    url: "https://www.teamdanmark.dk/talent/foraeldreguide",
  },
  tdDualCareer: {
    title: "Sportslig godkendelse til gymnasial ungdomsuddannelse",
    publisher: "Team Danmark",
    year: null,
    url: "https://www.teamdanmark.dk/til-atleter/uddannelse/gymnasial-ungdomsuddannelse",
  },
  henriksen: {
    title: "Det mentalt sunde talentudviklingsmiljø",
    publisher: "Henriksen, Larsen og Küttel, Syddansk Universitet",
    year: 2019,
    url: "https://gymdanmark.dk/wp-content/uploads/2020/11/kristoffer-henriksen-det-mentalt-sunde-talentudviklingsmiljoe-2.pdf",
  },
  difYouth: {
    title: "Idræt for børn og unge (3. udgave)",
    publisher: "DIF",
    year: 2021,
    url: "https://www.dif.dk/media/i2wnl2yv/idr%C3%A6t-for-b%C3%B8rn-og-unge-h%C3%A6fte.pdf",
  },
  difChildCertificate: {
    title: "Børneattester",
    publisher: "DIF",
    year: 2021,
    url: "https://www.dif.dk/raadgivning-og-stoette/trivsel-og-sundhed/seksuelle-kraenkelser/boerneattester",
  },
  difAbuse: {
    title: "Det uhørte overgreb",
    publisher: "DIF",
    year: 2021,
    url: "https://www.dif.dk/raadgivning-og-stoette/trivsel-og-sundhed/seksuelle-kraenkelser",
  },
  difMotivation: {
    title: "Det motiverende idrætsmiljø for unge",
    publisher: "DIF og Københavns Universitet",
    year: 2024,
    url: "https://www.dif.dk/media/mpjhxdwg/dif_det-motiverende-idraetsmiljoe_final-v20_2024.pdf",
  },
  difCoachPledge: {
    title: "Trænerløftet",
    publisher: "DIF",
    year: 2024,
    url: "https://www.dif.dk",
  },
  difEatingDisorders: {
    title: "Spiseforstyrrelser og lav energitilgængelighed i dansk elite- og subeliteidræt",
    publisher: "Lichtenstein og Melin for DIF",
    year: 2022,
    url: "https://www.dif.dk/media/jwunqsit/rapport-spiseforstyrrelser-i-elite-og-subelitesport-16-11-22.pdf",
  },
  dcfhConcussion: {
    title: "Tilbage til sport efter hjernerystelse – informationsark til trænere",
    publisher: "Dansk Center for Hjernerystelse",
    year: 2024,
    url: "https://dcfh.dk/wp-content/uploads/2024/09/Informationsark_til_traenere_og_underviser_indenfor_sport_TILBAGE_TIL_SPORT_EFTER_HJERNERYSTELSE_2024_.pdf",
  },
  addSupplements: {
    title: "Kosttilskud",
    publisher: "Anti Doping Danmark",
    year: null,
    url: "https://www.antidoping.dk/doping/kosttilskud",
  },
  addAsthma: {
    title: "Har du astma? og medicinopslag",
    publisher: "Anti Doping Danmark",
    year: null,
    url: "https://www.antidoping.dk",
  },
  uciConcussion: {
    title: "Concussion protocol for cycling",
    publisher: "UCI",
    year: 2021,
    url: "https://www.uci.org",
  },
  uciHeat: {
    title: "High Temperature Protocol",
    publisher: "UCI",
    year: 2024,
    url: "https://www.uci.org",
  },
  ioc2023Reds: {
    title: "2023 IOC consensus statement on Relative Energy Deficiency in Sport (REDs)",
    publisher: "British Journal of Sports Medicine 57(17)",
    year: 2023,
    url: "https://doi.org/10.1136/bjsports-2023-106994",
  },
  lawChildCertificate: {
    title: "Lov om indhentelse af børneattest",
    publisher: "Retsinformation",
    year: null,
    url: "https://www.retsinformation.dk",
  },
  lawPenal223: {
    title: "Straffeloven § 223",
    publisher: "Retsinformation",
    year: null,
    url: "https://www.retsinformation.dk",
  },
  lawTraffic49: {
    title: "Færdselsloven § 49",
    publisher: "Retsinformation",
    year: null,
    url: "https://www.retsinformation.dk",
  },
};
