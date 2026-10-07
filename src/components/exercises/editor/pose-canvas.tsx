"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { figureGeometry } from "@/modules/exercises/figure";
import {
  handlesOf,
  nearestHandle,
  sameSelection,
  type Selection,
} from "@/modules/exercises/pose-edit";
import { BOX, type Point, type Pose } from "@/modules/exercises/types";
import { Primitive } from "../exercise-figure";
import { handleKey, handleName } from "./handle-name";

/** How near a pointer must come to pick a handle up, in the box's units (≈ 40 px on a phone). */
const REACH = 14;
/** How far one press of an arrow key moves, and with Shift. */
const STEP = { small: 1, large: 5 } as const;

const KEYS: Record<string, Point> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * The drawing with its handles: a dot on every joint the figure shows,
 * on each end of an arrow and on each prop. A pointer — a mouse, a pen or
 * a finger — picks up the nearest handle and drags it; every handle is
 * also a stop for the keyboard, moved with the arrow keys (Shift for
 * further). The editor keeps everything inside the box
 * (src/modules/exercises/pose-edit.ts); this only says where things go.
 */
export function PoseCanvas({
  pose,
  selected,
  onSelect,
  onBegin,
  onMove,
  onEnd,
  onNudge,
}: {
  pose: Pose;
  selected: Selection | null;
  onSelect: (selection: Selection) => void;
  /** A drag starts, ends, and moves its handle to a point in the box. */
  onBegin: () => void;
  onMove: (selection: Selection, to: Point) => void;
  onEnd: () => void;
  /** A key moved the handle by so many units. */
  onNudge: (selection: Selection, dx: number, dy: number) => void;
}) {
  const t = useTranslations("exercises.editor");
  const svg = useRef<SVGSVGElement>(null);
  const handleRefs = useRef(new Map<string, SVGGElement>());
  const drag = useRef<{ selection: Selection; offset: Point; pointer: number } | null>(null);
  const [said, setSaid] = useState("");

  function toBox(clientX: number, clientY: number): Point | null {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return [p.x, p.y];
  }

  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const at = toBox(event.clientX, event.clientY);
    const handle = at && nearestHandle(pose, at, REACH, selected);
    if (!at || !handle) return;
    event.preventDefault();
    svg.current?.setPointerCapture(event.pointerId);
    drag.current = {
      selection: handle.selection,
      offset: [handle.at[0] - at[0], handle.at[1] - at[1]],
      pointer: event.pointerId,
    };
    onSelect(handle.selection);
    handleRefs.current.get(handleKey(handle.selection))?.focus({ preventScroll: true });
    onBegin();
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    const at = toBox(event.clientX, event.clientY);
    if (at) onMove(current.selection, [at[0] + current.offset[0], at[1] + current.offset[1]]);
  }

  function stop(event: React.PointerEvent<SVGSVGElement>) {
    if (!drag.current || drag.current.pointer !== event.pointerId) return;
    drag.current = null;
    if (svg.current?.hasPointerCapture(event.pointerId))
      svg.current.releasePointerCapture(event.pointerId);
    onEnd();
  }

  function onKeyDown(event: React.KeyboardEvent, selection: Selection) {
    const direction = KEYS[event.key];
    if (!direction) return;
    event.preventDefault();
    const step = event.shiftKey ? STEP.large : STEP.small;
    onNudge(selection, direction[0] * step, direction[1] * step);
  }

  const handles = handlesOf(pose);
  // After a key moves a handle, where it went is said once.
  const spoken = said ? handles.find((h) => sameSelection(h.selection, selected)) : undefined;
  const colour = (selection: Selection) =>
    selection.kind === "joint"
      ? "var(--primary)"
      : selection.kind === "arrow"
        ? "var(--warning)"
        : "var(--label)";

  return (
    <div className="bg-secondary relative rounded-lg">
      <svg
        ref={svg}
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        role="group"
        aria-label={t("canvas")}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="block h-auto w-full touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
      >
        <g aria-hidden>
          {figureGeometry(pose).map((p, i) => (
            <Primitive key={i} p={p} />
          ))}
        </g>
        {handles.map(({ selection, at }) => {
          const key = handleKey(selection);
          const active = sameSelection(selection, selected);
          const name = handleName(pose, selection, t);
          return (
            <g
              key={key}
              ref={(el) => {
                if (el) handleRefs.current.set(key, el);
                else handleRefs.current.delete(key);
              }}
              role="button"
              tabIndex={0}
              aria-label={t("position", { name, x: at[0], y: at[1] })}
              aria-pressed={active}
              className="cursor-grab outline-none"
              onFocus={() => onSelect(selection)}
              onKeyDown={(event) => {
                onKeyDown(event, selection);
                if (KEYS[event.key]) setSaid(name);
              }}
            >
              {active && (
                <circle
                  cx={at[0]}
                  cy={at[1]}
                  r={8}
                  style={{ fill: "none", stroke: "var(--ring)", strokeWidth: 2 }}
                />
              )}
              <circle
                cx={at[0]}
                cy={at[1]}
                r={active ? 5 : 4}
                style={{ fill: "var(--card)", stroke: colour(selection), strokeWidth: 2 }}
              />
            </g>
          );
        })}
      </svg>
      <p className="sr-only" aria-live="polite">
        {spoken ? t("position", { name: said, x: spoken.at[0], y: spoken.at[1] }) : ""}
      </p>
    </div>
  );
}
