"use client";

import { useState } from "react";

/**
 * Dragging a session to another day with the browser's own drag and drop
 * (Plot's backlog does the same). Desktop only in practice — a phone
 * uses "Flyt" in the session's menu — and within one rider's row: a
 * session changes day by dragging, never rider.
 */
type Dragged = { id: string; riderId: string; onDate: string };

export function useSessionDrag(onDrop: (id: string, onDate: string) => void) {
  const [dragging, setDragging] = useState<Dragged | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const key = (riderId: string, onDate: string) => `${riderId}|${onDate}`;

  function end() {
    setDragging(null);
    setOver(null);
  }

  /** Props for a card that can be picked up. */
  function source(card: Dragged & { title: string }, enabled: boolean) {
    if (!enabled) return {};
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", card.title);
        setDragging({ id: card.id, riderId: card.riderId, onDate: card.onDate });
      },
      onDragEnd: end,
    };
  }

  /** Props for a day a card can be dropped on. */
  function target(riderId: string, onDate: string) {
    const accepts = () => dragging !== null && dragging.riderId === riderId;
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!accepts()) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (over !== key(riderId, onDate)) setOver(key(riderId, onDate));
      },
      onDrop: (e: React.DragEvent) => {
        if (!accepts()) return;
        e.preventDefault();
        if (dragging && dragging.onDate !== onDate) onDrop(dragging.id, onDate);
        end();
      },
    };
  }

  return {
    draggingId: dragging?.id ?? null,
    source,
    target,
    isOver: (riderId: string, onDate: string) =>
      over === key(riderId, onDate) && dragging?.onDate !== onDate,
  };
}
