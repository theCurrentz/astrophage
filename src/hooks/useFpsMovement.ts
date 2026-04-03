import { useEffect, useRef } from "react";
import * as THREE from "three";

const keys = new Set<string>();

/**
 * First-person style movement: read WASD each frame and move the camera along its
 * **local axes** (forward = −Z in camera space). Pointer-lock mouse look is handled
 * by `PointerLockControls`; this hook only translates `camera.position`.
 */
export function useFpsMovement(speed = 1.35) {
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const move = useRef(new THREE.Vector3());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code);
    };
    const up = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return { forward, right, move, speed };
}

export function applyFpsMovement(
  camera: THREE.Camera,
  dt: number,
  forward: THREE.Vector3,
  right: THREE.Vector3,
  move: THREE.Vector3,
  speed: number,
) {
  forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  right.set(1, 0, 0).applyQuaternion(camera.quaternion);
  move.set(0, 0, 0);
  if (keys.has("KeyW")) move.add(forward);
  if (keys.has("KeyS")) move.sub(forward);
  if (keys.has("KeyA")) move.sub(right);
  if (keys.has("KeyD")) move.add(right);
  if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * dt);
  camera.position.add(move);
}
