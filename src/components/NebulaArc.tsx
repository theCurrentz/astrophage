import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import vert from "../shaders/nebula.vert.glsl";
import frag from "../shaders/nebula.frag.glsl";

type Props = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
};

export function NebulaArc({
  position = [0, 1.5, -28],
  rotation = [0.08, 0.12, 0],
  scale = [48, 14, 1],
}: Props) {
  const mat = useMemo(
    () =>
      new THREE.RawShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uTime: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh position={position} rotation={rotation} scale={scale} material={mat} renderOrder={0}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
