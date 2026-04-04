import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import vert from "../shaders/nebula.vert.glsl";
import frag from "../shaders/nebula.frag.glsl";

/*
  NebulaArc: a large transparent plane with a procedural plasma/lightning
  shader. It sits in the scene like a distant nebula, giving depth and
  atmosphere to the astrophage field.

  The plane uses RawShaderMaterial with additive blending so it glows
  on top of the black background without occluding particles.

  Multiple arcs at different positions, rotations, and scales create
  layered depth — just like real nebulae have multiple filaments.
*/

type Props = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
};

export function NebulaArc({
  position = [0, 0, -10],
  rotation = [0, 0, 0],
  scale = [30, 8, 1],
}: Props) {
  const meshRef = useRef<THREE.Mesh>(null);

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
    if (meshRef.current) {
      meshRef.current.material = mat;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale} material={mat} renderOrder={0}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
