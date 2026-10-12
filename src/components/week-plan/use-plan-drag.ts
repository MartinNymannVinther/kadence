"use client";

import { useState } from "react";

/**
 * Dragging a session of the week plan to another day with the browser's
 * own drag and drop, as the calendar does (use-session-drag.ts). The
 * calendar's hook moves a stored session between dates within one
 * rider's row; here a draft's session moves between the week's seven
 * days, by its key. A mouse drags; a keyboard and a phone use "Flyt til"
 * on the card, so dragging is never the only way.
 */
type Dragged = { key: string; day: number };

export function usePlanDrag(onDrop: (key: string, day: number) => void) {
  const [dragging, setDragging] = useState<Dragged | null>(null);
  const [over, setOver] = useState<number | null>(null);

  function end() {
    setDragging(null);
    setOver(null);
  }

  /** Props for a card that can be picked up. */
  function source(card: Dragged & { title: string }) {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", card.title);
        setDragging({ key: card.key, day: card.day });
      },
      onDragEnd: end,
    };
  }

  /** Props for a day a card can be dropped on. */
  function target(day: number) {
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!dragging) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (over !== day) setOver(day);
      },
      onDragLeave: (e: React.DragEvent) => {
        // Leaving for one of the day's own cards is still over the day.
        if (over === day && !e.currentTarget.contains(e.relatedTarget as Node | null))
          setOver(null);
      },
      onDrop: (e: React.DragEvent) => {
        if (!dragging) return;
        e.preventDefault();
        if (dragging.day !== day) onDrop(dragging.key, day);
        end();
      },
    };
  }

  return {
    draggingKey: dragging?.key ?? null,
    source,
    target,
    isOver: (day: number) => over === day && dragging !== null && dragging.day !== day,
  };
}
