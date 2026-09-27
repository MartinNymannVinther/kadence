"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The width a chart has to draw in, followed as the page resizes, so a
 * chart draws in real pixels — crisp text and round dots on a phone as on
 * a desk — rather than stretching one drawing to fit. Until the browser
 * has measured, `fallback` stands in, which is also what the server
 * renders.
 */
export function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(Math.max(200, Math.round(element.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}
