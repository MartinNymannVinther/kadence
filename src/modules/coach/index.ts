/**
 * The coach guide and the coach's tips (ADR 0021): what Kadence tells a
 * coach of young riders, in its own words, from DCU, Team Danmark, DIF,
 * Anti Doping Danmark and the law. Pure: imports nothing from the database.
 */
export { COACH_SOURCES, type CoachSource, type CoachSourceId } from "./sources";
export { GUIDE_SECTIONS, guideValues, type GuideSection, type GuideSectionId } from "./guide";
export {
  CAMP_LOOKAHEAD_DAYS,
  LOOKAHEAD_DAYS,
  MAX_TIPS,
  coachTips,
  type CoachTip,
  type TipEvent,
  type TipId,
  type TipInput,
  type TipRider,
} from "./tips";
export { FLAG_SECTION } from "./flag-sections";
