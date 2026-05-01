import { PointerLockControls, Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AstrophageField } from "./components/AstrophageField";
import { NebulaArc } from "./components/NebulaArc";
import { TurretBlasters } from "./components/TurretBlasters";
import { applyFpsMovement, isBoostHeld, useFpsMovement } from "./hooks/useFpsMovement";

type Props = { particleCount: number; bloom: number };

/*
  Scene composition:
    1. Stars — thousands of tiny white points for the deep-space backdrop
    2. NebulaArc(s) — procedural red plasma/lightning arcs at various depths
    3. AstrophageField — the main instanced particle swarm

  The user moves through this scene with WASD + mouse (FPS-style).
  PointerLockControls locks the cursor on click and maps mouse movement
  to camera rotation.
*/
export function Scene({ particleCount, bloom }: Props) {
  const { camera } = useThree();
  const { forward, right, move, speed } = useFpsMovement();

  useFrame((_, dt) => {
    applyFpsMovement(camera, dt, forward.current, right.current, move.current, speed);
    const pc = camera as THREE.PerspectiveCamera;
    if (pc.isPerspectiveCamera) {
      const target = isBoostHeld() ? 76 : 65;
      const k = 1 - Math.exp(-10 * dt);
      pc.fov += (target - pc.fov) * k;
      pc.updateProjectionMatrix();
    }
  });

  return (
    <>
      <PointerLockControls makeDefault />

      <Stars radius={80} depth={60} count={3000} factor={3} saturation={0} fade speed={0.3} />

      <NebulaArc />

      <TurretBlasters />

      <AstrophageField count={particleCount} bloom={bloom} />
    </>
  );
}
