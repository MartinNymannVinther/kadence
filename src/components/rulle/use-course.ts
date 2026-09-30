"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  buildCourse,
  bundledRoute,
  DEFAULT_ROUTE,
  readRouteGpx,
  RouteError,
  ROUTE_LIMITS,
  ROUTES,
  type Course,
  type RouteErrorCode,
} from "@/modules/rulle";

/**
 * The route to ride: one of those that come with Kadence (ADR 0035),
 * fetched as the ordinary GPX file it is and read through the same import
 * as a rider's own (`readRouteGpx`, `buildCourse`), or a GPX the rider
 * picks, which is read here in the browser and sent nowhere. The route
 * chosen last is remembered on this device.
 */

export type CourseState =
  | { status: "loading" }
  | { status: "ready"; course: Course; own: boolean }
  | { status: "error"; code: RouteErrorCode | "fetch"; own: boolean };

const REMEMBERED = "kadence.rulle.route";
const CHANGED = "kadence:rulle-route";

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

/** Chosen on this page: what counts when the browser will not remember it. */
let chosenHere: string | null = null;

function rememberedKey(): string {
  if (chosenHere) return chosenHere;
  try {
    return bundledRoute(window.localStorage.getItem(REMEMBERED)).key;
  } catch {
    return DEFAULT_ROUTE;
  }
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", listener);
  };
}

export function useCourse() {
  const key = useSyncExternalStore(subscribe, rememberedKey, () => DEFAULT_ROUTE);
  const route = bundledRoute(key);
  const [state, setState] = useState<CourseState>({ status: "loading" });
  // Asked again for the same route: back from the rider's own file to it.
  const [asked, setAsked] = useState(0);

  useEffect(() => {
    let current = true;
    void fetchBundled(route.file).then((next) => {
      if (current) setState(next);
    });
    return () => {
      current = false;
    };
  }, [route.file, asked]);

  /** One of the routes that come with Kadence, instead of the one there is. */
  const chooseRoute = useCallback((next: string) => {
    chosenHere = bundledRoute(next).key;
    try {
      window.localStorage.setItem(REMEMBERED, chosenHere);
    } catch {
      // Not remembered, then: chosen all the same, for this page.
    }
    setState({ status: "loading" });
    setAsked((n) => n + 1);
    window.dispatchEvent(new Event(CHANGED));
  }, []);

  const loadFile = useCallback(async (file: File) => {
    if (file.size > ROUTE_LIMITS.maxChars) {
      setState({ status: "error", code: "too_large", own: true });
      return;
    }
    setState(read(await file.text(), true));
  }, []);

  return { state, route, routes: ROUTES, chooseRoute, loadFile };
}
