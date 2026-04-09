import * as THREE from "three";

const _r = new THREE.Vector3();

export function interceptDirection(
  muzzle: THREE.Vector3,
  target: THREE.Vector3,
  vTarget: THREE.Vector3,
  bulletSpeed: number,
  outDir: THREE.Vector3,
): void {
  _r.subVectors(target, muzzle);
  const r2 = _r.dot(_r);
  const rv = _r.dot(vTarget);
  const vv = vTarget.dot(vTarget);
  const s2 = bulletSpeed * bulletSpeed;
  const a = vv - s2;
  const b = 2 * rv;
  const c = r2;

  if (Math.abs(a) < 1e-4) {
    outDir.copy(_r).normalize();
    return;
  }

  const disc = b * b - 4 * a * c;
  if (disc < 0) {
    outDir.copy(_r).addScaledVector(vTarget, 0.25).normalize();
    return;
  }

  const sqrtD = Math.sqrt(disc);
  let t = (-b - sqrtD) / (2 * a);
  if (t < 0.01) t = (-b + sqrtD) / (2 * a);
  if (t < 0.01 || !Number.isFinite(t)) {
    outDir.copy(_r).normalize();
    return;
  }

  outDir.copy(vTarget).multiplyScalar(t).add(_r).normalize();
}
