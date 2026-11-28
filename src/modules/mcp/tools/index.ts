import { getMySeasonPlan } from "./season";
import { getMyForm } from "./form";
import { listMyCheckins } from "./checkins";
import { listMyRides } from "./rides";
import { getMySession } from "./session";
import { getToday } from "./today";
import { getMyWeek } from "./week";
import type { Tool } from "../tool";
import { deleteMyCheckin, deleteMyManualActivity, deleteMyRide, deleteMySession } from "./delete";
import { saveMyCheckin } from "./write-checkin";
import { moveMySession, skipMySession, unskipMySession } from "./write-move";
import { rateMyRide } from "./write-ride";
import { addMySession, updateMySession } from "./write-sessions";

/**
 * Every tool an assistant may call (docs/plan-mcp.md §4): the rider reading
 * about themselves, and — each behind a switch the person turns on
 * (docs/adr/0120) — writing and deleting their own, every change undoable.
 * tests/mcp/registry.test.ts holds the list of tools that write.
 */
export const TOOLS: readonly Tool[] = [
  getToday,
  getMyWeek,
  getMySession,
  listMyRides,
  getMyForm,
  listMyCheckins,
  getMySeasonPlan,
  saveMyCheckin,
  rateMyRide,
  moveMySession,
  skipMySession,
  unskipMySession,
  addMySession,
  updateMySession,
  deleteMySession,
  deleteMyManualActivity,
  deleteMyRide,
  deleteMyCheckin,
] as readonly Tool[];
