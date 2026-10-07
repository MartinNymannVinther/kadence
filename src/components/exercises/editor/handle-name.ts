import type { Selection } from "@/modules/exercises/pose-edit";
import type { Pose } from "@/modules/exercises/types";

type T = (key: string, values?: Record<string, string | number>) => string;

/**
 * What a handle is called, for its label and the screen reader: "Forreste
 * knæ", "Spids på pil 2", "Bænk", "Elastik, den ene ende", "TRX, ophænget".
 * `t` reads the `exercises.editor` namespace.
 */
export function handleName(pose: Pose, selection: Selection, t: T): string {
  switch (selection.kind) {
    case "joint":
      return t(`joints.${selection.joint}`);
    case "arrow":
      return t(selection.end === "from" ? "arrowFrom" : "arrowTo", { n: selection.index + 1 });
    case "prop": {
      const prop = pose.props?.[selection.index];
      const name = prop ? t(`prop.${prop.kind}`) : "";
      switch (selection.handle) {
        case "from":
          return t("propFrom", { name });
        case "to":
          return t("propTo", { name });
        case "anchor":
          return t("propAnchor", { name });
        case "handleA":
          return t("propHandleA", { name });
        case "handleB":
          return t("propHandleB", { name });
        case "at":
          return name;
      }
    }
  }
}

/** A stable key for a handle, for React and for finding its element again. */
export function handleKey(selection: Selection): string {
  switch (selection.kind) {
    case "joint":
      return `joint-${selection.joint}`;
    case "arrow":
      return `arrow-${selection.index}-${selection.end}`;
    case "prop":
      return `prop-${selection.index}-${selection.handle}`;
  }
}
