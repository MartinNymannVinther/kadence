/**
 * The demo team's words, in both languages: made-up riders, sessions and
 * notes for a U19 team in full swing (ADR 0005). Names are invented and
 * belong to nobody; the checklist forbids real people in a demo.
 */

export type L = "da" | "en";
export type Text = Record<L, string>;
export const pick = (text: Text, l: L) => text[l];

export const TEAM_NAME: Text = { da: "Demo CK U19", en: "Demo CC U19" };

/** "Prøv alene" (seed-alone.ts): the personal workspace of the team demo's Emma (docs/adr/0080). */
export const ALONE_NAME: Text = { da: "Emmas træning", en: "Emma's training" };

/** Born so they ride U19 in the coming racing year: years 1 and 2. */
export const RIDERS: Array<{
  name: string;
  u19Year: 1 | 2;
  ftp: number;
  thr: number;
  sex: "female" | "male";
}> = [
  { name: "Emma Holm", u19Year: 1, ftp: 225, thr: 176, sex: "female" },
  { name: "Oskar Lund", u19Year: 2, ftp: 295, thr: 181, sex: "male" },
  { name: "Freja Dahl", u19Year: 1, ftp: 210, thr: 179, sex: "female" },
  { name: "Magnus Berg", u19Year: 2, ftp: 280, thr: 174, sex: "male" },
  { name: "Ida Kjær", u19Year: 2, ftp: 240, thr: 183, sex: "female" },
  { name: "Noah Friis", u19Year: 1, ftp: 265, thr: 178, sex: "male" },
];

/** The library the coach built, in the coach's own shorthand (read by parse-text.ts). */
export const TEMPLATES: Array<{ name: Text; text: string }> = [
  { name: { da: "Grundtur", en: "Endurance ride" }, text: "2 t Z2" },
  {
    name: { da: "3 × 10 min AT", en: "3 × 10 min threshold" },
    text: "15 min opvarmning, 3x10 min Z4 / 5 min pause, 10 min nedkørsel",
  },
  {
    name: { da: "4 × 4 min VO2", en: "4 × 4 min VO2" },
    text: "20 min opvarmning, 4x4 min 110-115% FTP / 4 min pause, 15 min nedkørsel",
  },
  { name: { da: "Restitution", en: "Recovery spin" }, text: "45 min Z1" },
  {
    name: { da: "Sprint og kadence", en: "Sprints and cadence" },
    text: "20 min opvarmning, 6x30 s sprint / 4 min rolig, 20 min Z2",
  },
  {
    name: { da: "Tempo", en: "Tempo" },
    text: "15 min opvarmning, 2x20 min Z3 / 5 min pause, 10 min nedkørsel",
  },
  { name: { da: "Kort tur", en: "Short ride" }, text: "1 t Z2" },
];

/**
 * One session the coach built once in the week planner itself, for this
 * block only (ADR 0059): not in the library above, kept in the block with
 * its own time and place (P2-14, drizzle/0027).
 */
export const BLOCK_OWN_SESSION = {
  name: { da: "Teknik og sving", en: "Technique and cornering" },
  text: "15 min opvarmning, 8x30 s sprint / 3 min pause, 10 min nedkørsel",
  place: { da: "Parkeringspladsen ved skoven", en: "The car park by the forest" },
} satisfies { name: Text; text: string; place: Text };

/**
 * The team's events. `inDays` counts from today while the racing season
 * runs (April to September); from October to March races wait for the
 * season, so `seasonDay` places them from 1 April of the racing year
 * instead, and the camp stays a few weeks ahead (seed.ts).
 */
export const EVENTS: Array<{
  kind: "race" | "camp";
  title: Text;
  inDays: number;
  seasonDay: number | null;
  days: number;
  priority: "A" | "B" | null;
  /** When and where it starts and who drives (docs/backlog.md P2-03). */
  where?: Record<L, { startTime: string; meetingPlace: string; transportNote: string }>;
}> = [
  {
    kind: "race",
    title: { da: "Sæsonstart, landevej", en: "Season opener, road" },
    inDays: 19,
    seasonDay: 11,
    days: 1,
    priority: "B",
    where: {
      da: {
        startTime: "09:30",
        meetingPlace: "Hillerød Stadion",
        transportNote: "Klubbens bus fra klubhuset kl. 7.45. Sig til træneren, hvis du kører selv.",
      },
      en: {
        startTime: "09:30",
        meetingPlace: "Hillerød Stadion",
        transportNote:
          "The club's bus from the clubhouse at 7:45. Tell the coach if you drive yourself.",
      },
    },
  },
  {
    kind: "camp",
    title: { da: "Holdsamling", en: "Team camp" },
    inDays: 33,
    seasonDay: null,
    days: 3,
    priority: null,
  },
  {
    kind: "race",
    title: { da: "DM enkeltstart", en: "National time trial" },
    inDays: 47,
    seasonDay: 70,
    days: 1,
    priority: "A",
  },
];

/** What the demo's parent put into Emma's calendar (docs/adr/0069). */
export const FAMILY_HOLIDAY: Text = {
  da: "Efterårsferie i sommerhuset",
  en: "Autumn break at the summer house",
};

export const EXAM: Text = { da: "Terminsprøve i matematik", en: "Maths mock exam" };

export const COMMENTS: Array<{ coach: Text }> = [
  {
    coach: {
      da: "Flot kørt. Hold pulsen lidt lavere i sidste interval næste gang.",
      en: "Well ridden! Keep the pulse a little lower in the last interval next time.",
    },
  },
  {
    coach: {
      da: "Tag den helt rolig i morgen — du har haft en travl uge i skolen.",
      en: "Take it completely easy tomorrow — it has been a busy week at school.",
    },
  },
];

/** Emma's own words on a ride she has done, written as the demo's rider (roles.ts). */
export const RIDER_COMMENT: Text = {
  da: "Benene var tunge i starten, men det løsnede op efter en halv time.",
  en: "My legs were heavy at the start, but they loosened up after half an hour.",
};

export const NOTES = {
  soreLegs: { da: "Tunge ben efter weekenden", en: "Heavy legs after the weekend" },
  knee: { da: "Knæet driller lidt", en: "My knee is bothering me a bit" },
} satisfies Record<string, Text>;
