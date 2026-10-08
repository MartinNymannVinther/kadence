import {
  Bike,
  BookOpen,
  CalendarDays,
  CalendarRange,
  CircleHelp,
  CircleUser,
  Compass,
  Gauge,
  HeartHandshake,
  House,
  LibraryBig,
  MessagesSquare,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { NavKey } from "./nav-items";

/**
 * One icon per place (docs/adr/0068), the same in the sidebar, the "Mere"
 * sheet and the bottom bar, so a place looks alike wherever it stands.
 * Where Kadence already drew a place with an icon, it keeps that one: the
 * compass on the card to the open guides, the open book on the coach guide.
 */
export const NAV_ICONS: Record<NavKey, LucideIcon> = {
  today: House,
  calendar: CalendarDays,
  riders: Users,
  me: CircleUser,
  library: LibraryBig,
  season: CalendarRange,
  child: Bike,
  rulle: Gauge,
  club: Trophy,
  coaches: MessagesSquare,
  guides: Compass,
  coachGuide: BookOpen,
  parentsGuide: HeartHandshake,
  help: CircleHelp,
};
