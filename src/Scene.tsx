import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useRef } from "react";
import * as THREE from "three";
import { AstrophageField } from "./components/AstrophageField";
import { useInteraction } from "./hooks/useInteraction";
import { useParallax } from "./hooks/useParallax";

type Props = {
  particleCount: number;
  bloom: number;
  touchWorld: React.RefObject<THREE.Vector3>;
  touchActive: React.RefObject<boolean>;
};

export function Scene({ particleCount, bloom, touchWorld, touchActive }: Props) {
  const { camera, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const parallaxDelta = useRef(new THREE.Quaternion());
  const { setFromEvent } = useInteraction(camera, touchWorld, group);

  useParallax(parallaxDelta);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion).multiply(parallaxDelta.current);
  });

  const onPointer = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const rect = gl.domElement.getBoundingClientRect();
      setFromEvent(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    },
    [gl, setFromEvent],
  );

  return (
    <group ref={group}>
      <mesh
        position={[0, 0, -2]}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          touchActive.current = true;
          e.stopPropagation();
          onPointer(e);
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          if (e.buttons > 0) {
            e.stopPropagation();
            onPointer(e);
          }
        }}
      >
        <planeGeometry args={[12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <AstrophageField count={particleCount} touchWorld={touchWorld} touchActive={touchActive} bloom={bloom} />
    </group>
  );
}
