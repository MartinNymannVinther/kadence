"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { addComment, CommentBody, deleteComment, editComment, Target } from "./comments";
import {
  completeSession,
  FeedbackInput,
  logActivity,
  ManualActivityInput,
  reopenSession,
  setFeedback,
} from "./complete";
import { createEvent, deleteEvent, EventInput, updateEvent } from "./events";
import { createGroupSessions, scheduleTemplate } from "./group";
import { RepeatInput } from "./recurrence";
import { deleteSession, moveSession, updateSession } from "./sessions";
import {
  archiveTemplate,
  createTemplate,
  duplicateTemplate,
  TemplateInput,
  updateTemplate,
} from "./templates";
import { id, isoDate, SCOPES, SessionInput } from "./vocabulary";

/**
 * The calendar's server actions. Each resolves the caller's team, validates
 * at the boundary and lets the service decide who may (src/core/action.ts);
 * the calendar and today's page are refreshed after.
 */

const PATHS = ["/calendar", "/today"];
const LIBRARY = ["/library"];

export async function createSessionsAction(raw: unknown) {
  return runAction(
    raw,
    SessionInput.omit({ riderId: true }).extend({
      riderIds: z.array(id).min(1).max(60),
      repeat: RepeatInput.optional(),
    }),
    (ctx, { riderIds, repeat, ...input }) => createGroupSessions(ctx, riderIds, input, repeat),
    PATHS,
  );
}

export async function updateSessionAction(raw: unknown) {
  return runAction(
    raw,
    SessionInput.omit({ riderId: true, onDate: true }).extend({
      sessionId: id,
      scope: z.enum(SCOPES).default("one"),
    }),
    (ctx, { sessionId, scope, ...input }) => updateSession(ctx, sessionId, input, scope),
    PATHS,
  );
}

export async function moveSessionAction(raw: unknown) {
  return runAction(
    raw,
    z.object({
      sessionId: id,
      onDate: isoDate,
      copy: z.boolean().default(false),
      toRiderId: id.optional(),
    }),
    (ctx, input) => moveSession(ctx, input.sessionId, input.onDate, input.copy, input.toRiderId),
    PATHS,
  );
}

export async function deleteSessionAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ sessionId: id, scope: z.enum(SCOPES).default("one") }),
    (ctx, input) => deleteSession(ctx, input.sessionId, input.scope),
    PATHS,
  );
}

export async function scheduleTemplateAction(raw: unknown) {
  return runAction(
    raw,
    z.object({
      templateId: id,
      riderIds: z.array(id).min(1).max(60),
      onDate: isoDate,
      repeat: RepeatInput.optional(),
    }),
    (ctx, input) =>
      scheduleTemplate(ctx, input.templateId, input.riderIds, input.onDate, input.repeat),
    PATHS,
  );
}

export async function completeSessionAction(raw: unknown) {
  return runAction(
    raw,
    FeedbackInput.extend({
      sessionId: id,
      minutes: z.coerce.number().int().min(1).max(1440),
      distanceKm: z.coerce.number().min(0).max(400).nullable().default(null),
    }),
    (ctx, { sessionId, ...input }) => completeSession(ctx, sessionId, input),
    PATHS,
  );
}

export async function reopenSessionAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ sessionId: id }),
    (ctx, input) => reopenSession(ctx, input.sessionId),
    PATHS,
  );
}

export async function logActivityAction(raw: unknown) {
  return runAction(raw, ManualActivityInput, logActivity, PATHS);
}

export async function setFeedbackAction(raw: unknown) {
  return runAction(
    raw,
    FeedbackInput.extend({ activityId: id }),
    (ctx, { activityId, ...input }) => setFeedback(ctx, activityId, input),
    PATHS,
  );
}

export async function addCommentAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ target: Target, body: CommentBody }),
    (ctx, input) => addComment(ctx, input.target, input.body),
    PATHS,
  );
}

export async function editCommentAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ commentId: id, body: CommentBody }),
    (ctx, input) => editComment(ctx, input.commentId, input.body),
    PATHS,
  );
}

export async function deleteCommentAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ commentId: id }),
    (ctx, input) => deleteComment(ctx, input.commentId),
    PATHS,
  );
}

export async function createEventAction(raw: unknown) {
  return runAction(raw, EventInput, createEvent, PATHS);
}

export async function updateEventAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ eventId: id, event: EventInput }),
    (ctx, input) => updateEvent(ctx, input.eventId, input.event),
    PATHS,
  );
}

export async function deleteEventAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ eventId: id }),
    (ctx, input) => deleteEvent(ctx, input.eventId),
    PATHS,
  );
}

export async function createTemplateAction(raw: unknown) {
  return runAction(raw, TemplateInput, createTemplate, LIBRARY);
}

export async function updateTemplateAction(raw: unknown) {
  return runAction(
    raw,
    TemplateInput.extend({ templateId: id }),
    (ctx, { templateId, ...input }) => updateTemplate(ctx, templateId, input),
    LIBRARY,
  );
}

export async function archiveTemplateAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ templateId: id, archived: z.boolean() }),
    (ctx, input) => archiveTemplate(ctx, input.templateId, input.archived),
    LIBRARY,
  );
}

export async function duplicateTemplateAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ templateId: id, name: z.string().trim().min(1).max(120) }),
    (ctx, input) => duplicateTemplate(ctx, input.templateId, input.name),
    LIBRARY,
  );
}
