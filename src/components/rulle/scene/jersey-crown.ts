/**
 * The crown on the sprinter's jersey (ADR 0075), drawn once on a canvas
 * of its own in one colour, for `jersey-pattern.ts` to set on the chest
 * and the back: a rimmed band set with lozenges and studs and a ring over
 * it, small crosses standing on the ring, four beaded arches curving in
 * over the top and one straight up the front with a stud on it, and the
 * orb with a cross on it at the top. Its openings are cut out, so the
 * jersey shows through them as the velvet does in a real one. Drawn in
 * units: 100 across, y up from the rim.
 */

/** The canvas, square, pixels; and pixels to a unit. */
export const BADGE = 256;
const UNIT = 2.2;

type Pen = CanvasRenderingContext2D;

/** The crown in `color` on a clear square canvas, its rim along the foot. */
export function crownBadge(color: string): HTMLCanvasElement {
  const element = document.createElement("canvas");
  element.width = BADGE;
  element.height = BADGE;
  const pen = element.getContext("2d")!;
  pen.setTransform(UNIT, 0, 0, -UNIT, BADGE / 2, BADGE - 8);
  pen.fillStyle = color;
  pen.strokeStyle = color;
  pen.lineCap = "round";
  pen.lineJoin = "round";
  // The rim, the band and the ring over it; small crosses standing on the ring.
  pen.fillRect(-48, 0, 96, 4);
  pen.fillRect(-45, 4, 90, 19);
  pen.fillRect(-46, 23, 92, 5);
  for (const x of [-31, -10.5, 10.5, 31]) pattee(pen, x, 33, 5);
  // Four arches, out and up and in over the top, beaded along their backs.
  pen.lineWidth = 4.5;
  for (const x of [-42, -21, 21, 42]) {
    const side = Math.sign(x);
    const arch = [x, 27, x + side * 9, 54, x * 0.7 + side * 6, 76, side * 6, 66] as const;
    pen.beginPath();
    pen.moveTo(arch[0], arch[1]);
    pen.bezierCurveTo(arch[2], arch[3], arch[4], arch[5], arch[6], arch[7]);
    pen.stroke();
    for (const t of [0.2, 0.4, 0.6, 0.8]) dot(pen, ...bezier(arch, t), 2.8);
  }
  // The arch up the front, a stud on it; the orb, and the cross on it.
  pen.lineWidth = 7;
  pen.beginPath();
  pen.moveTo(0, 27);
  pen.lineTo(0, 62);
  pen.stroke();
  dot(pen, 0, 70, 8.5);
  pattee(pen, 0, 90, 11);
  // The openings: lozenges in the band with studs between, the lines between band and ring and round the orb,
  // a stud on the front arch, and the cross hollow but for its middle.
  pen.globalCompositeOperation = "destination-out";
  for (const x of [-27, 0, 27]) lozenge(pen, x, 13.5, 10, 6);
  for (const x of [-13.5, 13.5]) dot(pen, x, 13.5, 2.6);
  pen.fillRect(-46, 22.4, 92, 1.3);
  pen.fillRect(-8.5, 69.2, 17, 1.4);
  dot(pen, 0, 46, 4.2);
  pattee(pen, 0, 90, 6.5);
  pen.globalCompositeOperation = "source-over";
  for (const x of [-13.5, 13.5]) dot(pen, x, 13.5, 1.3);
  dot(pen, 0, 46, 2.6);
  dot(pen, 0, 90, 2.4);
  return element;
}

/** A cross pattée at `x`, `y`: four arms widening out to `r` from the middle. */
function pattee(pen: Pen, x: number, y: number, r: number): void {
  for (let arm = 0; arm < 4; arm++) {
    pen.save();
    pen.translate(x, y);
    pen.rotate((arm * Math.PI) / 2);
    pen.beginPath();
    pen.moveTo(0, -0.2 * r);
    pen.lineTo(r, -0.55 * r);
    pen.lineTo(r, 0.55 * r);
    pen.lineTo(0, 0.2 * r);
    pen.closePath();
    pen.fill();
    pen.restore();
  }
}

function lozenge(pen: Pen, x: number, y: number, half: number, high: number): void {
  pen.beginPath();
  pen.moveTo(x - half, y);
  pen.lineTo(x, y + high);
  pen.lineTo(x + half, y);
  pen.lineTo(x, y - high);
  pen.closePath();
  pen.fill();
}

function dot(pen: Pen, x: number, y: number, r: number): void {
  pen.beginPath();
  pen.arc(x, y, r, 0, Math.PI * 2);
  pen.fill();
}

/** The point `t` along a cubic curve, from its four points flattened. */
function bezier(p: readonly number[], t: number): [number, number] {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [0, 1].map((k) => w.reduce((sum, wi, i) => sum + wi * p[i * 2 + k]!, 0)) as [
    number,
    number,
  ];
}
