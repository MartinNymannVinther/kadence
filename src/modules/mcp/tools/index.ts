import { getMySeasonPlan } from "./season";
import { getMyForm } from "./form";
import { listMyCheckins } from "./checkins";
import { listMyRides } from "./rides";
import { getMySession } from "./session";
import { getToday } from "./today";
import { getMyWeek } from "./week";
import type { Tool } from "../tool";

/**
 * Every tool an assistant may call (docs/plan-mcp.md §4). The first wave
 * is the rider reading about themselves; tests/mcp/registry.test.ts holds
 * the list of tools that write, which is empty.
 */
export const TOOLS: readonly Tool[] = [
  getToday,
  getMyWeek,
  getMySession,
  listMyRides,
  getMyForm,
  listMyCheckins,
  getMySeasonPlan,
] as readonly Tool[];
