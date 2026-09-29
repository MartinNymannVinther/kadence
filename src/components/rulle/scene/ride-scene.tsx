"use client";

import { useEffect, useRef } from "react";
import type { Course } from "@/modules/rulle";
import { Sky } from "./sky";
import { World, type Moment } from "./world";

/**
 * The landscape behind the ride (ADR 0033), drawn with three.js into a
 * canvas that fills the screen. Loaded only on Rulle's ride screen. The
 * quiet sky lies behind the canvas the whole time: it is what shows while
 * the landscape is built, and all that shows where WebGL is missing or
 * fails. A small or slow device gets fewer trees and pixels; a rider who
 * has asked for less motion gets a camera that only follows.
 */
export default function RideScene({
  course,
  moment,
  top,
  bottom,
}: {
  course: Course;
  /** Where the rider is now: read every frame. */
  moment: (now: number) => Moment;
  /** Pixels of the screen covered by the strip on top and the panel below. */
  top: number;
  bottom: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ moment, top, bottom });
  const resize = useRef<() => void>(() => {});

  useEffect(() => {
    latest.current = { moment, top, bottom };
    resize.current();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let world: World;
    try {
      world = new World(canvas, course, {
        calm: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        light: window.innerWidth < 700 || (navigator.hardwareConcurrency ?? 8) <= 4,
      });
    } catch {
      // No WebGL: the sky behind the canvas is the landscape.
      return;
    }
    resize.current = () => {
      const box = canvas.getBoundingClientRect();
      world.resize(box.width, box.height, latest.current.top, latest.current.bottom);
    };
    resize.current();
    const observer = new ResizeObserver(() => resize.current());
    observer.observe(canvas);
    let last = performance.now();
    let raf = 0;
    const loop = (time: number) => {
      const seconds = Math.min(0.1, Math.max(0, (time - last) / 1000));
      last = time;
      world.frame(latest.current.moment(Date.now()), seconds);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resize.current = () => {};
      world.dispose();
    };
  }, [course]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <Sky />
      </div>
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
