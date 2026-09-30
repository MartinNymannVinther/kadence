"use client";

import { useEffect, useRef, useState } from "react";
import type { Course, Land, Seen } from "@/modules/rulle";
import { LensDrops } from "./lens-drops";
import type { SceneWords } from "./small-things";
import { Sky } from "./sky";
import { World, type Moment } from "./world";

/**
 * The landscape behind the ride (ADR 0033), drawn with three.js into a
 * canvas that fills the screen. Loaded only on Rulle's ride screen. The
 * quiet sky lies behind the canvas the whole time: it is what shows while
 * the landscape is built, and all that shows where WebGL is missing or
 * fails. A small or slow device gets fewer trees and pixels and no
 * shadows; a rider who has asked for less motion gets a camera that only
 * follows, and no drops on the lens. On a route that comes with Kadence
 * the land is the real one (ADR 0035). What the small things on the way
 * (ADR 0034) meet is told back through `onSeen`, and what they ring
 * through `onSound`.
 */
export default function RideScene({
  course,
  moment,
  top,
  bottom,
  words,
  finish,
  land,
  city,
  onSeen,
  onSound,
}: {
  course: Course;
  /** Where the rider is now: read every frame. */
  moment: (now: number) => Moment;
  /** Pixels of the screen covered by the strip on top and the panel below. */
  top: number;
  bottom: number;
  words: SceneWords;
  /** A race's course: the finish arch where the lap ends. */
  finish: boolean;
  /** The real land round the route, if it is one that comes with Kadence. */
  land: Land | null;
  /** A city's course: streets, pavements and blocks (ADR 0036). */
  city: boolean;
  onSeen: (key: keyof Seen, count: number) => void;
  onSound: (kind: "bell" | "cheer") => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ moment, top, bottom, words, onSeen, onSound });
  const resize = useRef<() => void>(() => {});
  // Each spray of washer fluid, numbered: the drops on the lens are drawn for the latest.
  const [spray, setSpray] = useState(0);

  useEffect(() => {
    latest.current = { moment, top, bottom, words, onSeen, onSound };
  });

  // Only when the strip or the panel over the picture changes: the page
  // draws its numbers four times a second, and the picture is not redone
  // for that.
  useEffect(() => resize.current(), [top, bottom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let world: World;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      world = new World(
        canvas,
        course,
        {
          calm,
          light: window.innerWidth < 700 || (navigator.hardwareConcurrency ?? 8) <= 4,
          finish,
          land,
          city,
        },
        latest.current.words,
        {
          seen: (key, count) => latest.current.onSeen(key, count),
          sound: (kind) => latest.current.onSound(kind),
          spray: () => {
            if (!calm) setSpray((n) => n + 1);
          },
        },
      );
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
  }, [course, finish, land, city]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <Sky />
      </div>
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block h-full w-full" />
      {spray > 0 && <LensDrops key={spray} seed={spray} top={top} bottom={bottom} />}
    </div>
  );
}
