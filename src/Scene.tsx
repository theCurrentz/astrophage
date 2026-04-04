import { PointerLockControls, Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { AstrophageField } from "./components/AstrophageField";
import { NebulaArc } from "./components/NebulaArc";
import { applyFpsMovement, useFpsMovement } from "./hooks/useFpsMovement";

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
  });

  return (
    <>
      <PointerLockControls makeDefault />

      <Stars radius={80} depth={60} count={3000} factor={3} saturation={0} fade speed={0.3} />

      <NebulaArc position={[0, 2, -15]} rotation={[0.1, 0, 0.15]} scale={[35, 10, 1]} />
      <NebulaArc position={[5, -3, -20]} rotation={[-0.2, 0.3, -0.1]} scale={[40, 12, 1]} />
      <NebulaArc position={[-8, 1, -12]} rotation={[0.05, -0.2, 0.3]} scale={[25, 8, 1]} />

      <AstrophageField count={particleCount} bloom={bloom} />
    </>
  );
}
