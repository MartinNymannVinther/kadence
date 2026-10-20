"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { basePose } from "@/modules/exercises/base-poses";
import {
  addArrow,
  mirrorPose,
  moveSelection,
  nudge,
  removeArrow,
  setBend,
  toggleLimb,
  type Selection,
} from "@/modules/exercises/pose-edit";
import { addProp, removeProp, turnBarbell } from "@/modules/exercises/pose-props";
import type { PoseHistory, PoseHistoryAction } from "@/modules/exercises/pose-history";
import type { Prop } from "@/modules/exercises/types";
import { ArrowTools } from "./arrow-tools";
import { PoseCanvas } from "./pose-canvas";
import { PoseTools } from "./pose-tools";
import { PropTools } from "./prop-tools";

/**
 * A coach draws the team's own exercise (docs/plan-ovelser-og-programmer.md):
 * from a base pose taken from Kadence's own, joints, arrows and props are
 * dragged on the drawing or moved with the keyboard; arrows are added and
 * bent, props added and taken away, limbs hidden, the whole mirrored, and
 * every step can be undone. Everything stays inside the figure's box. The
 * history is the form's, which shows the card as it will look beside it.
 */
export function PoseEditor({
  history,
  dispatch,
  onPropAdded,
}: {
  history: PoseHistory;
  dispatch: (action: PoseHistoryAction) => void;
  /** A prop came onto the drawing: the form may tick it as equipment. */
  onPropAdded?: (kind: Prop["kind"]) => void;
}) {
  const t = useTranslations("exercises.editor");
  const [selected, setSelected] = useState<Selection | null>(null);
  const { pose } = history;
  const change = (next: typeof pose) => dispatch({ type: "change", pose: next });

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-meta text-xs leading-relaxed">{t("drawingHint")}</p>
      <PoseCanvas
        pose={pose}
        selected={selected}
        onSelect={setSelected}
        onBegin={() => dispatch({ type: "begin" })}
        onMove={(selection, to) =>
          dispatch({ type: "drag", pose: moveSelection(pose, selection, to) })
        }
        onEnd={() => dispatch({ type: "end" })}
        onNudge={(selection, dx, dy) => change(nudge(pose, selection, dx, dy))}
      />
      <PoseTools
        pose={pose}
        canUndo={history.past.length > 0}
        onBase={(base) => {
          setSelected(null);
          change(basePose(base));
        }}
        onUndo={() => dispatch({ type: "undo" })}
        onMirror={() => change(mirrorPose(pose))}
        onLimb={(limb) => change(toggleLimb(pose, limb))}
      />
      <ArrowTools
        pose={pose}
        onAdd={() => change(addArrow(pose))}
        onRemove={(index) => {
          setSelected(null);
          change(removeArrow(pose, index));
        }}
        onBend={(index, bend, live) => {
          const next = setBend(pose, index, bend);
          dispatch(live ? { type: "drag", pose: next } : { type: "change", pose: next });
        }}
        onSlide={(phase) => dispatch({ type: phase })}
      />
      <PropTools
        pose={pose}
        onAdd={(kind) => {
          change(addProp(pose, kind));
          onPropAdded?.(kind);
        }}
        onRemove={(index) => {
          setSelected(null);
          change(removeProp(pose, index));
        }}
        onTurn={(index) => change(turnBarbell(pose, index))}
      />
    </div>
  );
}
