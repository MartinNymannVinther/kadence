"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildCourse,
  readRouteGpx,
  RouteError,
  ROUTE_LIMITS,
  type BundledRoute,
  type Course,
  type RouteErrorCode,
} from "@/modules/rulle";

/**
 * The route to ride: the one that comes with Kadence, fetched as the
 * ordinary GPX file it is and read through the same import as a rider's
 * own (`readRouteGpx`, `buildCourse`), or a GPX the rider picks, which is
 * read here in the browser and sent nowhere.
 */

export type CourseState =
  | { status: "loading" }
  | { status: "ready"; course: Course; own: boolean }
  | { status: "error"; code: RouteErrorCode | "fetch"; own: boolean };

function read(xml: string, own: boolean): CourseState {
  try {
    return { status: "ready", course: buildCourse(readRouteGpx(xml)), own };
  } catch (error) {
    return { status: "error", code: error instanceof RouteError ? error.code : "corrupt", own };
  }
}

async function fetchBundled(file: string): Promise<CourseState> {
  try {
    const response = await fetch(file);
    if (!response.ok) throw new Error(String(response.status));
    return read(await response.text(), false);
  } catch {
    return { status: "error", code: "fetch", own: false };
  }
}

export function useCourse(route: BundledRoute) {
  const [state, setState] = useState<CourseState>({ status: "loading" });
  const [bundledName, setBundledName] = useState("");

  const settle = useCallback((next: CourseState) => {
    if (next.status === "ready" && !next.own) setBundledName(next.course.name);
    setState(next);
  }, []);

  useEffect(() => {
    let current = true;
    void fetchBundled(route.file).then((next) => {
      if (current) settle(next);
    });
    return () => {
      current = false;
    };
  }, [route.file, settle]);

  /** Back from the rider's own route to the one that comes with Kadence. */
  const loadBundled = useCallback(async () => {
    setState({ status: "loading" });
    settle(await fetchBundled(route.file));
  }, [route.file, settle]);

  const loadFile = useCallback(async (file: File) => {
    if (file.size > ROUTE_LIMITS.maxChars) {
      setState({ status: "error", code: "too_large", own: true });
      return;
    }
    setState(read(await file.text(), true));
  }, []);

  return { state, bundledName, loadFile, loadBundled };
}
