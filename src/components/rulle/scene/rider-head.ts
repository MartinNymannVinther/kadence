import * as THREE from "three";

/**
 * The rider's head (`RiderFigure`): a helmet over it — a long road helmet
 * with dark vents along its top, or a smooth, rounder aero one with a
 * small intake at the front and its straps down to the chin — and
 * sunglasses wrapped round the face. Built about the head's middle,
 * facing -z; the figure places it and tips it with the body.
 */
export function riderHead(
  materials: {
    skin: THREE.Material;
    helmet: THREE.Material;
    dark: THREE.Material;
    lens: THREE.Material;
  },
  style: "vented" | "aero" = "vented",
): THREE.Group {
  const head = new THREE.Group();
  const face = new THREE.Mesh(new THREE.IcosahedronGeometry(0.105, 1), materials.skin);
  head.add(face);
  const aero = style === "aero";
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, aero ? 16 : 10, aero ? 8 : 5, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.helmet,
  );
  shell.scale.set(1, aero ? 0.92 : 0.85, aero ? 1.2 : 1.32);
  shell.position.set(0, aero ? 0.015 : 0.025, aero ? 0.012 : 0.02);
  head.add(shell);
  if (aero) {
    // The intake over the brow, on the shell; a strap from by each ear down under the chin.
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.025), materials.dark);
    intake.position.set(0, 0.07, -0.1);
    intake.rotation.x = 0.75;
    head.add(intake);
    for (const side of [-1, 1]) head.add(strap(side, materials.dark));
  } else {
    // The vents: their tops just show along the shell, where it is highest.
    for (const x of [-0.045, 0, 0.045]) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.012, 0.11), materials.dark);
      vent.position.set(x, 0.122 - Math.abs(x) * 0.5, 0.02);
      head.add(vent);
    }
  }
  const glasses = new THREE.Mesh(
    new THREE.CylinderGeometry(0.112, 0.112, 0.036, 12, 1, true, Math.PI - 1.05, 2.1),
    materials.lens,
  );
  glasses.position.set(0, -0.005, 0);
  head.add(glasses);
  return head;
}

const UP = new THREE.Vector3(0, 1, 0);

/** A helmet strap on one side, from the shell's rim by the ear to under the chin. */
function strap(side: number, material: THREE.Material): THREE.Mesh {
  const ear = new THREE.Vector3(side * 0.095, 0.0, 0.01);
  const chin = new THREE.Vector3(side * 0.035, -0.095, -0.065);
  const along = new THREE.Vector3().subVectors(chin, ear);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, along.length(), 4),
    material,
  );
  mesh.position.copy(ear).addScaledVector(along, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, along.normalize());
  return mesh;
}
