import * as THREE from "three";

/**
 * One simulated agent. CPU updates positions; GPU only reads `aOffset` each frame.
 * **Velocity integration:** classic game physics—forces accumulate into `velocity`,
 * then `position += velocity * dt` (see `stepParticles`).
 */
export type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  seed: number;
  size: number;
  density: number;
};

const tmp = new THREE.Vector3();
const center = new THREE.Vector3();
const noiseScratch = new THREE.Vector3();
const curlIn = new THREE.Vector3();

/** Deterministic pseudo-random in [0,1) from integer lattice coords (value noise building block). */
function hash3(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth 3D value noise: interpolate random values at cube corners (trilinear blend). */
function noise3(p: THREE.Vector3) {
  const i = new THREE.Vector3(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
  const f = new THREE.Vector3(p.x - i.x, p.y - i.y, p.z - i.z);
  const u = new THREE.Vector3(f.x * f.x * (3 - 2 * f.x), f.y * f.y * (3 - 2 * f.y), f.z * f.z * (3 - 2 * f.z));
  const n000 = hash3(i.x, i.y, i.z);
  const n100 = hash3(i.x + 1, i.y, i.z);
  const n010 = hash3(i.x, i.y + 1, i.z);
  const n110 = hash3(i.x + 1, i.y + 1, i.z);
  const n001 = hash3(i.x, i.y, i.z + 1);
  const n101 = hash3(i.x + 1, i.y, i.z + 1);
  const n011 = hash3(i.x, i.y + 1, i.z + 1);
  const n111 = hash3(i.x + 1, i.y + 1, i.z + 1);
  const nx00 = THREE.MathUtils.lerp(n000, n100, u.x);
  const nx10 = THREE.MathUtils.lerp(n010, n110, u.x);
  const nx01 = THREE.MathUtils.lerp(n001, n101, u.x);
  const nx11 = THREE.MathUtils.lerp(n011, n111, u.x);
  const nxy0 = THREE.MathUtils.lerp(nx00, nx10, u.y);
  const nxy1 = THREE.MathUtils.lerp(nx01, nx11, u.y);
  return THREE.MathUtils.lerp(nxy0, nxy1, u.z) * 2 - 1;
}

/**
 * **Curl noise:** take derivatives of scalar noise along each axis and assemble a vector.
 * Intuition: the field “swirls” like fluid because divergence is near zero—no sources/sinks,
 * so motion looks organic instead of all particles rushing one direction.
 */
function curl(p: THREE.Vector3, out: THREE.Vector3, t: number) {
  const e = 0.12;
  const n1 = noise3(tmp.set(p.x, p.y + e, p.z + t));
  const n2 = noise3(tmp.set(p.x, p.y - e, p.z + t));
  const n3 = noise3(tmp.set(p.x + e, p.y, p.z + t));
  const n4 = noise3(tmp.set(p.x - e, p.y, p.z + t));
  const n5 = noise3(tmp.set(p.x, p.y, p.z + e + t));
  const n6 = noise3(tmp.set(p.x, p.y, p.z - e + t));
  out.set(n1 - n2, n3 - n4, n5 - n6);
  return out;
}

/** Spawn a thin **Gaussian band** in Y so the swarm reads as a ribbon in front of the camera. */
export function createBandParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const x = THREE.MathUtils.lerp(-1.5, 1.5, Math.random());
    const yRaw = THREE.MathUtils.lerp(-0.2, 0.2, Math.random());
    const z = THREE.MathUtils.lerp(-0.35, 0.35, Math.random());
    const g = Math.exp(-(yRaw * yRaw) / (2 * 0.085 * 0.085));
    const seed = Math.random() * 1000;
    particles.push({
      position: new THREE.Vector3(x, yRaw, z),
      velocity: new THREE.Vector3(0, 0, 0),
      seed,
      size: THREE.MathUtils.lerp(0.016, 0.058, Math.pow(Math.random(), 0.55)) * (0.75 + g * 0.5),
      density: THREE.MathUtils.lerp(0.55, 1.45, g),
    });
  }
  return particles;
}

/**
 * One simulation tick. Order of forces matters visually:
 * 1) drift (curl) — global flow
 * 2) cohesion — mild pull toward centroid so the cloud does not evaporate
 * 3) touch repulsion — push away from pointer in 3D
 * 4) damping + integration + soft box clamp
 */
export function stepParticles(
  particles: Particle[],
  dt: number,
  time: number,
  touchWorld: THREE.Vector3,
  touchActive: boolean,
) {
  center.set(0, 0, 0);
  for (const p of particles) center.add(p.position);
  center.multiplyScalar(1 / particles.length);

  for (const p of particles) {
    curlIn.copy(p.position).multiplyScalar(0.82);
    curl(curlIn, noiseScratch, time * 0.075);
    noiseScratch.multiplyScalar(0.42 * dt * 60);
    p.velocity.add(noiseScratch);

    tmp.copy(center).sub(p.position).multiplyScalar(0.014 * dt * 60);
    p.velocity.add(tmp);

    if (touchActive) {
      tmp.copy(p.position).sub(touchWorld);
      const d = tmp.length() + 0.07;
      if (d < 0.9) {
        const f = (0.9 - d) / 0.9;
        tmp.normalize().multiplyScalar(((f * f * 2.4) / d) * dt * 60);
        p.velocity.add(tmp);
      }
    }

    p.velocity.multiplyScalar(0.964);
    tmp.copy(p.velocity).multiplyScalar(dt);
    p.position.add(tmp);

    const gy = Math.exp(-(p.position.y * p.position.y) / (2 * 0.1 * 0.1));
    p.position.y += -p.position.y * 0.018 * dt * 60 * (1 - gy * 0.5);
    p.position.x = THREE.MathUtils.clamp(p.position.x, -1.65, 1.65);
    p.position.z = THREE.MathUtils.clamp(p.position.z, -0.42, 0.42);
    p.position.y = THREE.MathUtils.clamp(p.position.y, -0.28, 0.28);
  }
}
