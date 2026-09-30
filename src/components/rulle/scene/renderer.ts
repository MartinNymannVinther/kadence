import * as THREE from "three";
import { Pace } from "./pace";

/**
 * The renderer a ride is drawn with: antialiased, with soft shadows, on a
 * device that can afford them; fewer pixels and neither on a small or slow
 * one; and the pace that takes pixels away when frames come late
 * (`pace.ts`).
 */
export function rideRenderer(canvas: HTMLCanvasElement, light: boolean) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !light,
    powerPreference: "high-performance",
  });
  const ratio = Math.min(window.devicePixelRatio || 1, light ? 1 : 1.5);
  renderer.setPixelRatio(ratio);
  const shaded = !light;
  if (shaded) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }
  return { renderer, pace: new Pace(ratio, Math.min(ratio, 0.75)), shaded };
}
