import { useCallback, useRef, type RefObject } from "react";
import * as THREE from "three";

export function useInteraction(
  camera: THREE.Camera,
  localTarget: RefObject<THREE.Vector3>,
  group: RefObject<THREE.Group | null>,
  planeDistance = 1.65,
) {
  const world = useRef(new THREE.Vector3());
  const ndc = useRef(new THREE.Vector2());
  const ray = useRef(new THREE.Raycaster());
  const dir = useRef(new THREE.Vector3());
  const plane = useRef(new THREE.Plane());
  const pt = useRef(new THREE.Vector3());

  const setFromEvent = useCallback(
    (clientX: number, clientY: number, width: number, height: number) => {
      ndc.current.set((clientX / width) * 2 - 1, -(clientY / height) * 2 + 1);
      ray.current.setFromCamera(ndc.current, camera);
      camera.getWorldDirection(dir.current);
      pt.current.copy(camera.position).addScaledVector(dir.current, planeDistance);
      plane.current.setFromNormalAndCoplanarPoint(dir.current.clone().negate(), pt.current);
      ray.current.ray.intersectPlane(plane.current, world.current);
      localTarget.current!.copy(world.current);
      const g = group.current;
      if (g) g.worldToLocal(localTarget.current!);
    },
    [camera, group, localTarget, planeDistance],
  );

  return { setFromEvent };
}
