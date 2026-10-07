import { describe, expect, it } from "vitest";
import { chooseDraft, type LocalDraftMeta } from "@/modules/training/week-draft-merge";

/**
 * Which week plan the planner shows when this device's copy and the
 * team's shared draft on the server disagree (ADR 0043, amended
 * 2026-10-07): the server's when it is newer, this device's when it holds
 * the latest change, a word to the coach whenever something shown here
 * was replaced, and a copy cleared when the week was laid in elsewhere.
 */

const T1 = "2026-11-02T13:30:00.000Z";
const T2 = "2026-11-02T13:32:00.000Z";
const ms = (iso: string) => Date.parse(iso);

const local = (meta: Partial<LocalDraftMeta>): LocalDraftMeta => ({
  at: ms(T1),
  base: T1,
  dirty: false,
  ...meta,
});

describe("chooseDraft", () => {
  it("shows nothing when neither side has a draft", () => {
    expect(chooseDraft(null, null)).toEqual({ take: "none", cleared: false });
  });

  it("takes the server's draft, without a word, on a device that has none", () => {
    expect(chooseDraft(null, { updatedAt: T1 })).toEqual({ take: "server", notice: false });
  });

  it("sends a copy the server has never seen", () => {
    // A plan kept on the device before drafts were shared, or made offline.
    expect(chooseDraft(local({ base: null, dirty: true }), null)).toEqual({
      take: "local",
      push: true,
    });
  });

  it("clears a saved copy when the server's draft is gone: the week was laid in", () => {
    expect(chooseDraft(local({}), null)).toEqual({ take: "none", cleared: true });
  });

  it("keeps a copy with unsaved changes even when the server's draft is gone", () => {
    expect(chooseDraft(local({ dirty: true, at: ms(T2) }), null)).toEqual({
      take: "local",
      push: true,
    });
  });

  it("keeps this device's copy while the server has not moved, and sends what is new", () => {
    expect(chooseDraft(local({}), { updatedAt: T1 })).toEqual({ take: "local", push: false });
    expect(chooseDraft(local({ dirty: true, at: ms(T2) }), { updatedAt: T1 })).toEqual({
      take: "local",
      push: true,
    });
  });

  it("takes a newer draft someone saved since, and says so", () => {
    expect(chooseDraft(local({}), { updatedAt: T2 })).toEqual({ take: "server", notice: true });
  });

  describe("a conflict: both changed since this device last met the server", () => {
    it("lets the server's draft win when it was saved after the change here", () => {
      const changedHere = local({ dirty: true, at: ms(T1) + 30_000 });
      expect(chooseDraft(changedHere, { updatedAt: T2 })).toEqual({
        take: "server",
        notice: true,
      });
    });

    it("lets this device's copy win when its change is the latest, and sends it", () => {
      const changedHere = local({ dirty: true, at: ms(T2) + 1 });
      expect(chooseDraft(changedHere, { updatedAt: T2 })).toEqual({ take: "local", push: true });
    });

    it("counts a copy that never met the server as a conflict too", () => {
      expect(chooseDraft(local({ base: null, dirty: true, at: 0 }), { updatedAt: T1 })).toEqual({
        take: "server",
        notice: true,
      });
    });
  });
});
