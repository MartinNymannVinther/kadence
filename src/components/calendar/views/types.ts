import type { OrgContext } from "@/core/db/tenant";
import type { RiderRow } from "@/core/db/schema";
import type { Me } from "@/modules/team/access";
import type { CalendarQuery } from "../href";
import type { RiderOption } from "../types";

/** What the calendar page has settled before it hands over to a scale's view. */
export type ViewProps = {
  ctx: OrgContext;
  me: Me;
  today: string;
  locale: string;
  /** Every rider the caller may read, as rows and as options. */
  riderRows: RiderRow[];
  visible: RiderOption[];
  /** The rider shown, when it is not the team. */
  rider: RiderOption;
  teamView: boolean;
  query: CalendarQuery;
};
