import { COACH_SOURCES, type CoachSource, type CoachSourceId } from "@/modules/coach/sources";

/**
 * The documents behind the open guides and calculators, beyond those the
 * coach guide already cites (which are reused, so one document has one
 * entry). Kadence writes its own words and links to the originals; the
 * research that read them is in docs/research: klasser-og-gearing.md,
 * udstyr.md and ernaering.md.
 *
 * Pure: imports nothing from the database.
 */

export type OwnSourceId =
  | "dcuGear2023"
  | "dcuLicence"
  | "dcuClipCard"
  | "dcuTeams"
  | "uciPart1"
  | "uciPart2"
  | "tdCriteria"
  | "tdGymnasium"
  | "tdElitekommuner"
  | "garminWheel"
  | "gearcalcChecking"
  | "blocken2018"
  | "cnClothing2025"
  | "cnHelmets2025"
  | "cnWheels2026"
  | "cnBikes2024"
  | "brrTyres"
  | "frictionFacts"
  | "barry2015"
  | "swart2009"
  | "hopker2009"
  | "martin1998"
  | "keytel2005"
  | "compendium2024"
  | "thomas2016"
  | "jeukendrup2014"
  | "tdFood2026"
  | "tdSupplementsBuy"
  | "dtuCaffeine"
  | "fvstCooling"
  | "usdaDangerZone"
  | "dentistsSport"
  | "dentistsErosion"
  | "kkTeeth"
  | "ismFreeDental"
  | "needleman2013"
  | "needleman2015"
  | "gallagher2018"
  | "desbrow2021";

export type GuideSourceId = CoachSourceId | OwnSourceId;

const OWN: Record<OwnSourceId, CoachSource> = {
  dcuGear2023: {
    title: "Information om nye gearregler i B&U-klasserne, gældende fra 2023",
    publisher: "DCU",
    year: 2023,
    url: "https://www.cyklingdanmark.dk/fileadmin/files/PDFer/Information_om_nye_BU_gearinger_2023.pdf",
  },
  dcuLicence: {
    title: "Tegn licens",
    publisher: "DCU",
    year: 2026,
    url: "https://www.cyklingdanmark.dk/medlemmer/om-licens",
  },
  dcuClipCard: {
    title: "Klippekort",
    publisher: "DCU",
    year: 2026,
    url: "https://www.cyklingdanmark.dk/medlemmer/klippekort",
  },
  dcuTeams: {
    title: "Teams",
    publisher: "DCU",
    year: 2026,
    url: "https://www.cyklingdanmark.dk/klubber-teams/om-teams",
  },
  uciPart1: {
    title: "UCI Cycling Regulations, Part 1: General Organisation",
    publisher: "UCI",
    year: 2025,
    url: "https://www.copaci.org/pdfs/en/REGLAMENTO%20GENERAL%20UCI%20INGLES.pdf",
  },
  uciPart2: {
    title: "UCI Cycling Regulations, Part 2: Road Races",
    publisher: "UCI",
    year: 2025,
    url: "https://www.copaci.org/pdfs/en/REGLAMENTO%20RUTA%20INGLES.pdf",
  },
  tdCriteria: {
    title: "Forbundenes kriterier for sportslig godkendelse",
    publisher: "Team Danmark",
    year: 2026,
    url: "https://ungdom.teamdanmark.dk/organizationCriteria/pdf/file",
  },
  tdGymnasium: {
    title: "Gymnasial ungdomsuddannelse og eliteidræt",
    publisher: "Team Danmark",
    year: 2026,
    url: "https://www.teamdanmark.dk/til-atleter/uddannelse/gymnasial-ungdomsuddannelse",
  },
  tdElitekommuner: {
    title: "Elitekommuner",
    publisher: "Team Danmark",
    year: 2026,
    url: "https://www.teamdanmark.dk/talent/elitekommuner",
  },
  garminWheel: {
    title: "Wheel Size and Circumference",
    publisher: "Garmin",
    year: null,
    url: "https://www8.garmin.com/manuals/webhelp/edge520/EN-US/GUID-DB0BC20A-DADF-41EB-A61C-14BEC158B43C.html",
  },
  gearcalcChecking: {
    title: "Gear Checking at Races",
    publisher: "Gearcalc",
    year: 2026,
    url: "https://www.gearcalc.co.uk/en/guides/gear-checking-at-races",
  },
  blocken2018: {
    title:
      "Aerodynamic drag in cycling pelotons: new insights by CFD simulation and wind tunnel testing (Blocken m.fl.)",
    publisher: "Journal of Wind Engineering and Industrial Aerodynamics",
    year: 2018,
    url: "https://doi.org/10.1016/j.jweia.2018.06.011",
  },
  cnClothing2025: {
    title: "Wind tunnel clothing test: budget vs aero jersey, skinsuit vs super suit",
    publisher: "Cyclingnews",
    year: 2025,
    url: "https://www.cyclingnews.com/features/wind-tunnel-clothing-test-budget-vs-aero-jersey-skinsuit-vs-super-suit-socks-vs-no-socks-and-more/",
  },
  cnHelmets2025: {
    title: "Wind tunnel tested: the world's biggest aero helmet group test",
    publisher: "Cyclingnews",
    year: 2025,
    url: "https://www.cyclingnews.com/features/wind-tunnel-tested-the-worlds-biggest-aero-helmet-grouptest/",
  },
  cnWheels2026: {
    title: "What are the fastest UCI-legal road wheels? Wind tunnel testing",
    publisher: "Cyclingnews",
    year: 2026,
    url: "https://www.cyclingnews.com/cycling-tech-components/wheels-tyres/what-are-the-fastest-uci-legal-road-wheels-wind-tunnel-testing-the-big-name-brands-and-chinese-contenders/",
  },
  cnBikes2024: {
    title: "Wind tunnel tested: 11 superbikes go head to head",
    publisher: "Cyclingnews",
    year: 2024,
    url: "https://www.cyclingnews.com/features/wind-tunnel-tested-11-superbikes-go-head-to-head/",
  },
  brrTyres: {
    title: "Grand Prix 5000 S TR: tubeless vs inner tubes",
    publisher: "Bicycle Rolling Resistance",
    year: 2026,
    url: "https://www.bicyclerollingresistance.com/specials/grand-prix-5000-s-tr-tubeless-vs-tubes",
  },
  frictionFacts: {
    title: "How many watts does a dirty chain steal? (Friction Facts' measurements)",
    publisher: "CyclingTips",
    year: 2020,
    url: "https://web.archive.org/web/2021/https://cyclingtips.com/2020/05/how-many-watts-does-a-dirty-chain-steal/",
  },
  barry2015: {
    title: "Aerodynamic performance and riding posture in road cycling and triathlon (Barry m.fl.)",
    publisher: "Proceedings of the IMechE, Part P",
    year: 2015,
    url: "https://doi.org/10.1177/1754337114549876",
  },
  swart2009: {
    title:
      "Effects of high-intensity training by heart rate or power in well-trained cyclists (Swart m.fl.)",
    publisher: "Journal of Strength and Conditioning Research",
    year: 2009,
    url: "https://pubmed.ncbi.nlm.nih.gov/19204572",
  },
  hopker2009: {
    title: "The effects of training on gross efficiency in cycling: a review (Hopker m.fl.)",
    publisher: "International Journal of Sports Medicine",
    year: 2009,
    url: "https://kar.kent.ac.uk/36044/",
  },
  martin1998: {
    title: "Validation of a mathematical model for road cycling power (Martin m.fl.)",
    publisher: "Journal of Applied Biomechanics",
    year: 1998,
    url: "https://doi.org/10.1123/jab.14.3.276",
  },
  keytel2005: {
    title:
      "Prediction of energy expenditure from heart rate monitoring during submaximal exercise (Keytel m.fl.)",
    publisher: "Journal of Sports Sciences",
    year: 2005,
    url: "https://doi.org/10.1080/02640410470001730089",
  },
  compendium2024: {
    title: "2024 Adult Compendium of Physical Activities: Bicycling",
    publisher: "Journal of Sport and Health Science",
    year: 2024,
    url: "https://pacompendium.com/bicycling/",
  },
  thomas2016: {
    title: "Nutrition and Athletic Performance (Thomas, Erdman og Burke)",
    publisher: "Academy of Nutrition and Dietetics, Dietitians of Canada og ACSM",
    year: 2016,
    url: "https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf",
  },
  jeukendrup2014: {
    title:
      "A step towards personalized sports nutrition: carbohydrate intake during exercise (Jeukendrup)",
    publisher: "Sports Medicine",
    year: 2014,
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4008807/",
  },
  tdFood2026: {
    title: "Kost og elitesport – basal sportsernæring",
    publisher: "Team Danmark",
    year: 2026,
    url: "https://www.teamdanmark.dk/media/b3hlper2/kostogelitesport_2026.pdf",
  },
  tdSupplementsBuy: {
    title: "Anskaffelse af kosttilskud",
    publisher: "Team Danmark",
    year: null,
    url: "https://www.teamdanmark.dk/til-atleter/sportsernaering/kosttilskud/anskaffelse",
  },
  dtuCaffeine: {
    title: "Risikovurdering af koffein i energidrikke",
    publisher: "DTU Fødevareinstituttet for Fødevarestyrelsen",
    year: 2023,
    url: "https://foedevarestyrelsen.dk/Media/638191330374579437/Risikovurdering%20koffein%20i%20energidrikke.pdf",
  },
  fvstCooling: {
    title: "Nedkøling af fødevarer",
    publisher: "Fødevarestyrelsen",
    year: null,
    url: "https://foedevarestyrelsen.dk/kost-og-foedevarer/start-og-drift-af-foedevarevirksomhed/hygiejne-og-indretning/haandtering-af-foedevarer-hygiejne-og-nedkoeling/nedkoeling-af-foedevarer",
  },
  usdaDangerZone: {
    title: '"Danger Zone" (40 °F–140 °F)',
    publisher: "USDA Food Safety and Inspection Service",
    year: null,
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/danger-zone-40f-140f",
  },
  dentistsSport: {
    title: "Tandlæger advarer: Sportsdrikke og energibarer kan skade tænderne",
    publisher: "Tandlægeforeningen",
    year: null,
    url: "https://www.tandlaegeforeningen.dk/til-tandlaeger/til-dine-patienter/livsstil/sukker-skader-taenderne/sukker-i-sportsernaeringsprodukter/",
  },
  dentistsErosion: {
    title: "Erosioner – syreskader på tænderne",
    publisher: "Tandlægeforeningen",
    year: null,
    url: "https://www.tandlaegeforeningen.dk/til-tandlaeger/til-dine-patienter/tandsygdomme-gener-og-behandlinger/a-f/erosioner-syreskader-paa-taenderne/",
  },
  kkTeeth: {
    title: "Sunde tænder",
    publisher: "Københavns Kommune, Tandplejen",
    year: null,
    url: "https://tandplejen.kk.dk/taender-og-tandpleje/sunde-taender",
  },
  ismFreeDental: {
    title: "Ny ordning om gratis tandpleje for 18-21-årige træder i kraft i dag",
    publisher: "Indenrigs- og Sundhedsministeriet",
    year: 2022,
    url: "https://www.ism.dk/nyheder/2022/juli/ny-ordning-om-gratis-tandpleje-for-18-21-aarige-traeder-i-kraft-i-dag-",
  },
  needleman2013: {
    title:
      "Oral health and impact on performance of athletes at the London 2012 Olympic Games (Needleman m.fl.)",
    publisher: "British Journal of Sports Medicine",
    year: 2013,
    url: "https://doi.org/10.1136/bjsports-2013-092891",
  },
  needleman2015: {
    title: "Oral health and elite sport performance (Needleman m.fl.)",
    publisher: "British Journal of Sports Medicine",
    year: 2015,
    url: "https://doi.org/10.1136/bjsports-2014-093804",
  },
  gallagher2018: {
    title:
      "Oral health and performance impacts in elite and professional athletes (Gallagher m.fl.)",
    publisher: "Community Dentistry and Oral Epidemiology",
    year: 2018,
    url: "https://doi.org/10.1111/cdoe.12392",
  },
  desbrow2021: {
    title: "Youth Athlete Development and Nutrition (Desbrow)",
    publisher: "Gatorade Sports Science Institute",
    year: 2021,
    url: "https://www.gssiweb.org/sports-science-exchange/article/youth-athlete-development-and-nutrition",
  },
};

export const GUIDE_SOURCES: Record<GuideSourceId, CoachSource> = { ...COACH_SOURCES, ...OWN };
