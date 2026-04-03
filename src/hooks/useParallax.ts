import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";

const maxTilt = 0.18;

/**
 * **Device orientation → small rotation offset.** Beta/gamma are angles (degrees)
 * from the DeviceOrientationEvent; we convert to radians and build an Euler, then
 * a Quaternion. **Slerp** (spherical lerp) smooths jitter so the swarm does not buzz.
 *
 * iOS 13+ may require `DeviceOrientationEvent.requestPermission()` after a gesture—
 * handled in the async IIFE before subscribing.
 */
export function useParallax(delta: RefObject<THREE.Quaternion>) {
  const target = useRef(new THREE.Quaternion());
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  useEffect(() => {
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const beta = THREE.MathUtils.degToRad(e.beta);
      const gamma = THREE.MathUtils.degToRad(e.gamma);
      euler.current.set(
        THREE.MathUtils.clamp(beta - Math.PI / 2, -maxTilt, maxTilt) * 0.4,
        THREE.MathUtils.clamp(gamma, -maxTilt, maxTilt) * 0.5,
        0,
      );
      target.current.setFromEuler(euler.current);
      delta.current!.slerp(target.current, 0.08);
    };

    const req = async () => {
      if (typeof DeviceOrientationEvent !== "undefined" && "requestPermission" in DeviceOrientationEvent) {
        try {
          await (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> }).requestPermission?.();
        } catch {
          return;
        }
      }
      window.addEventListener("deviceorientation", onOrient, true);
    };
    void req();
    return () => window.removeEventListener("deviceorientation", onOrient, true);
  }, [delta]);
}
