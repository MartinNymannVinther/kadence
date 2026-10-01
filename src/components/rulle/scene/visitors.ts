import * as THREE from "three";
import {
  courseAt,
  hash,
  VISITOR_SPEED,
  visitsOnLap,
  type Course,
  type Seen,
  type Visit,
  type VisitorKind,
} from "@/modules/rulle";
import { dog, type Dog } from "./folk";
import { personOf } from "./folk-look";
import { moto, type Moto } from "./moto";
import type { Ground } from "./ground";
import { PALETTE } from "./palette";
import { groundPoint, roadPoint, roadYaw } from "./road-point";
import { cargoBike, car, NOZZLES, scooter, type Figure } from "./vehicles";

/**
 * What passes on the road (ADR 0034), one thing at a time and where the
 * route and the lap say (`visitsOnLap`): it comes from behind and
 * overtakes on the left, or waits ahead to be passed, and is counted for
 * "today's little things" as it does. The cargo bike rings before it
 * overtakes; the car washes its windscreen as it goes by, and some of it
 * reaches the rider; the dog runs along for a bit and sits down again. On
 * a city's closed course on race day (ADR 0037) there is no car and no
 * farm dog: a race marshal's motorbike comes past in their places,
 * hooting, rides ahead a while with the flag up, and goes on.
 */

export type VisitorHooks = {
  seen: (key: keyof Seen) => void;
  sound: (kind: "bell" | "horn") => void;
  /** Drops on the lens: the car's washer fluid reached the rider. */
  spray: () => void;
};

type Active = {
  visit: VisitorKind;
  figure: Figure;
  distance: number;
  offset: number;
  speed: number;
  age: number;
  /** Overtaking the rider from behind, or waiting ahead to be passed. */
  overtakes: boolean;
  counted: boolean;
  rang: boolean;
};

/** How far ahead something that overtook goes on before it is let go: far into the haze. */
const GONE_AHEAD = 650;
const GONE_BEHIND = 45;
const DOG_RUNS = 70;
const DOG_TOP_SPEED = 9.5;
const SPRAY = 140;
/** A marshal's motorbike rides this far ahead of the rider until it has been out this long, seconds. */
const MOTO_AHEAD = 22;
const MOTO_HOLD = 34;

export class Visitors {
  readonly group = new THREE.Group();
  private lap = -1;
  private plan: Visit[] = [];
  private next = 0;
  private active: Active | null = null;
  private dogFrom = 0;
  private readonly figures = new Map<VisitorKind, Figure>();
  private readonly spray: THREE.Points;
  private readonly drops: { position: THREE.Vector3; velocity: THREE.Vector3; age: number }[] = [];

  constructor(
    private readonly course: Course,
    private readonly ground: Ground,
    private readonly material: THREE.Material,
    private readonly hooks: VisitorHooks,
  ) {
    const positions = new Float32Array(SPRAY * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.spray = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: "#e9f1f4",
        size: 0.045,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    this.spray.frustumCulled = false;
    for (let i = 0; i < SPRAY; i++)
      this.drops.push({ position: new THREE.Vector3(), velocity: new THREE.Vector3(), age: 9 });
  }

  frame(distance: number, speed: number, seconds: number, paused: boolean): void {
    const length = this.course.length;
    const lap = Math.floor(distance / length);
    const along = distance - lap * length;
    if (lap !== this.lap) {
      this.lap = lap;
      // A city's course is closed on race day: a marshal's motorbike where
      // a car or a farm dog would have come.
      this.plan = visitsOnLap(this.course, lap).map((v) =>
        this.ground.city && (v.kind === "car" || v.kind === "dog") ? { ...v, kind: "moto" } : v,
      );
      this.next = 0;
      while (this.next < this.plan.length && this.plan[this.next]!.at < along - 300) this.next++;
    }
    const due = this.plan[this.next];
    if (due && along >= due.at) {
      if (!this.active && !paused) {
        this.start(due.kind, distance, speed);
        this.next++;
      } else if (along > due.at + 300) this.next++;
    }
    if (this.active) this.move(this.active, distance, speed, seconds);
  }

  dispose(): void {
    for (const figure of this.figures.values()) figure.dispose();
    this.spray.geometry.dispose();
    (this.spray.material as THREE.Material).dispose();
  }

  private figure(kind: VisitorKind): Figure {
    let figure = this.figures.get(kind);
    if (!figure) {
      const cars = PALETTE.cars;
      figure =
        kind === "cargo"
          ? cargoBike(this.material, personOf(this.lap * 31 + 3))
          : kind === "car"
            ? car(this.material, cars[Math.floor(hash(this.lap, 1, 93) * cars.length)]!)
            : kind === "scooter"
              ? scooter(this.material)
              : kind === "moto"
                ? moto(this.material)
                : dog(this.material);
      figure.group.rotation.order = "YXZ";
      if (kind === "car") figure.group.add(this.spray);
      this.figures.set(kind, figure);
    }
    this.group.add(figure.group);
    return figure;
  }

  private start(visit: VisitorKind, distance: number, speed: number): void {
    const figure = this.figure(visit);
    const base = { visit, figure, age: 0, counted: false, rang: false };
    if (visit === "cargo") {
      const slower = speed < VISITOR_SPEED.cargo + 0.6;
      this.active = slower
        ? // Overtakes on the left, at the motor's 25 — or a touch faster than a rider going 25.
          {
            ...base,
            distance: distance - 30,
            offset: -0.7,
            speed: Math.max(VISITOR_SPEED.cargo, speed + 1.2),
            overtakes: true,
          }
        : {
            ...base,
            distance: distance + 70,
            offset: 2.2,
            speed: VISITOR_SPEED.cargo,
            overtakes: false,
          };
    } else if (visit === "car")
      this.active = {
        ...base,
        distance: distance - 80,
        offset: -1.7,
        speed: Math.max(VISITOR_SPEED.car, speed + 9),
        overtakes: true,
      };
    else if (visit === "moto")
      this.active = {
        ...base,
        distance: distance - 60,
        offset: -1.5,
        speed: Math.max(10, speed + 7),
        overtakes: true,
      };
    else if (visit === "scooter")
      this.active = {
        ...base,
        distance: distance - 55,
        offset: -0.5,
        speed: Math.max(VISITOR_SPEED.scooter, speed + 5),
        overtakes: true,
      };
    else {
      this.active = { ...base, distance: distance + 38, offset: 5.2, speed: 0, overtakes: false };
      (figure as Dog).running = false;
    }
  }

  private move(a: Active, distance: number, speed: number, seconds: number): void {
    a.age += seconds;
    if (a.visit === "moto") this.steerMoto(a, distance, speed);
    if (a.visit === "dog") this.moveDog(a, distance, speed, seconds);
    else a.distance += a.speed * seconds;
    const at =
      a.visit === "dog"
        ? groundPoint(this.course, this.ground, a.distance, a.offset)
        : roadPoint(this.course, a.distance, a.offset);
    const group = a.figure.group;
    group.position.copy(at);
    // A dog sitting by the verge faces the road.
    const sitting = a.visit === "dog" && !(a.figure as Dog).running;
    group.rotation.y = roadYaw(this.course, a.distance) + (sitting ? Math.PI / 2 : 0);
    group.rotation.x = a.visit === "dog" ? 0 : Math.atan(courseAt(this.course, a.distance).grade);
    a.figure.animate(seconds, a.speed);

    if (a.visit === "cargo" && a.overtakes && !a.rang && a.distance > distance - 16) {
      a.rang = true;
      this.hooks.sound("bell");
    }
    const passed = a.overtakes ? a.distance > distance + 1 : distance > a.distance + 1;
    if (!a.counted && passed && a.visit !== "dog") {
      a.counted = true;
      this.hooks.seen(
        a.visit === "cargo" ? (a.overtakes ? "cargoOvertaken" : "cargoOvertook") : a.visit,
      );
      if (a.visit === "car") this.hooks.spray();
    }
    if (a.visit === "car") this.washer(a, distance, seconds);
    const gone = a.overtakes
      ? a.distance > distance + GONE_AHEAD
      : a.distance < distance - GONE_BEHIND;
    if (gone || a.age > 150) {
      this.group.remove(group);
      this.active = null;
    }
  }

  /** Up past the rider with two hoots, ahead of the rider a while with the flag up, then away. */
  private steerMoto(a: Active, distance: number, speed: number): void {
    const ahead = a.distance - distance;
    if (!a.rang && ahead > -25) {
      a.rang = true;
      this.hooks.sound("horn");
    }
    if (ahead < MOTO_AHEAD && a.age < MOTO_HOLD) a.speed = speed + 7;
    else if (a.age < MOTO_HOLD) a.speed = Math.max(0, speed + (MOTO_AHEAD - ahead) * 0.4);
    else a.speed = speed + 9;
    (a.figure as Moto).waving = ahead > 4 && a.age < MOTO_HOLD;
  }

  /** Sits by the verge until the rider is near, runs along beside for a bit, and sits again. */
  private moveDog(a: Active, distance: number, speed: number, seconds: number): void {
    const figure = a.figure as Dog;
    if (!a.counted && distance > a.distance - 9) {
      a.counted = true;
      figure.running = true;
      this.dogFrom = a.distance;
      this.hooks.seen("dog");
    }
    if (!figure.running) return;
    a.speed = Math.min(DOG_TOP_SPEED, Math.max(speed, 3));
    a.distance += a.speed * seconds;
    a.offset += (3.7 - a.offset) * Math.min(1, seconds * 2);
    if (a.distance - this.dogFrom > DOG_RUNS) {
      figure.running = false;
      a.speed = 0;
    }
  }

  /** The washer's jets, blown back over the roof while the car is near the rider. */
  private washer(a: Active, distance: number, seconds: number): void {
    const near = a.distance > distance - 20 && a.distance < distance + 30;
    const attribute = this.spray.geometry.getAttribute("position") as THREE.BufferAttribute;
    this.drops.forEach((drop, i) => {
      drop.age += seconds;
      if (drop.age > 0.8 && near) {
        const nozzle = NOZZLES[i % 2]!;
        drop.position.copy(nozzle);
        drop.velocity.set(
          (hash(i, a.age * 60, 5) - 0.5) * 1.5,
          1.6 + hash(i, 2, 5) * 1.2,
          6 + hash(i, 3, 5) * 9,
        );
        drop.age = hash(i, 4, 5) * 0.3;
      }
      drop.velocity.y -= 9.8 * seconds;
      drop.position.addScaledVector(drop.velocity, seconds);
      const hidden = drop.age > 0.9;
      attribute.setXYZ(i, drop.position.x, hidden ? -99 : drop.position.y, drop.position.z);
    });
    attribute.needsUpdate = true;
  }
}
