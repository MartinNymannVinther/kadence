import {
  Bike,
  CalendarDays,
  CalendarRange,
  CircleUser,
  Compass,
  Gauge,
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
 * Knowledge keeps the compass the open guides' card has always had.
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
  knowledge: Compass,
};
