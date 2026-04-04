import * as THREE from "three";

export type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  seed: number;
  size: number;
  density: number;
};

/**
 * Spread particles throughout a large spherical volume centered on the origin.
 * This simulates astrophage suspended in deep space — billions of infrared-emitting
 * microorganisms drifting in the void between stars.
 *
 * Each particle gets a random position inside a sphere (reject sampling), a tiny
 * initial drift velocity, and visual attributes (size, density, seed) that the
 * GPU shaders use for variation.
 */
function spawnSpaceParticle(): Particle {
  const radius = 18;
  let x: number, y: number, z: number;
  do {
    x = (Math.random() * 2 - 1) * radius;
    y = (Math.random() * 2 - 1) * radius;
    z = (Math.random() * 2 - 1) * radius;
  } while (x * x + y * y + z * z > radius * radius);

  const seed = Math.random() * 1000;
  const r = Math.random();

  return {
    position: new THREE.Vector3(x, y, z),
    velocity: new THREE.Vector3(
      (Math.random() - 0.5) * 0.003,
      (Math.random() - 0.5) * 0.003,
      (Math.random() - 0.5) * 0.003,
    ),
    seed,
    size:
      r < 0.05
        ? THREE.MathUtils.lerp(0.12, 0.35, Math.random())
        : r < 0.3
          ? THREE.MathUtils.lerp(0.04, 0.12, Math.random())
          : THREE.MathUtils.lerp(0.008, 0.04, Math.random()),
    density: THREE.MathUtils.lerp(0.6, 1.5, Math.random()),
  };
}

export function createSpaceParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) particles.push(spawnSpaceParticle());
  return particles;
}

export function resizeParticleArray(particles: Particle[], newCount: number): Particle[] {
  if (newCount === particles.length) return particles;
  if (newCount < particles.length) return particles.slice(0, newCount);
  const next = particles.slice();
  while (next.length < newCount) next.push(spawnSpaceParticle());
  return next;
}

/**
 * Gentle drift: particles sway slowly with a sine-based wobble and very light damping.
 * No curl noise, no cohesion forces — astrophage in space just floats.
 * Particles that drift past the boundary are wrapped to the opposite side
 * so the field feels infinite as the camera moves through it.
 */
export function stepParticles(particles: Particle[], dt: number, time: number) {
  const limit = 20;
  const cdt = Math.min(dt, 1 / 120);

  for (const p of particles) {
    const wobbleX = Math.sin(time * 0.15 + p.seed * 0.1) * 0.0004;
    const wobbleY = Math.cos(time * 0.12 + p.seed * 0.08) * 0.0003;
    const wobbleZ = Math.sin(time * 0.1 + p.seed * 0.12) * 0.0003;

    p.velocity.x += wobbleX * cdt * 60;
    p.velocity.y += wobbleY * cdt * 60;
    p.velocity.z += wobbleZ * cdt * 60;

    p.velocity.multiplyScalar(0.998);

    const speed = p.velocity.length();
    if (speed > 0.008) p.velocity.multiplyScalar(0.008 / speed);

    p.position.x += p.velocity.x * cdt * 60;
    p.position.y += p.velocity.y * cdt * 60;
    p.position.z += p.velocity.z * cdt * 60;

    if (p.position.x > limit) p.position.x -= limit * 2;
    if (p.position.x < -limit) p.position.x += limit * 2;
    if (p.position.y > limit) p.position.y -= limit * 2;
    if (p.position.y < -limit) p.position.y += limit * 2;
    if (p.position.z > limit) p.position.z -= limit * 2;
    if (p.position.z < -limit) p.position.z += limit * 2;
  }
}
