import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { AstrophageField } from "./components/AstrophageField";
import { applyFpsMovement, useFpsMovement } from "./hooks/useFpsMovement";

type Props = {
  particleCount: number;
  bloom: number;
};

/**
 * **World-space scene:** the particle band sits at the origin. The user moves the
 * **PerspectiveCamera** with WASD and looks with the mouse after pointer lock.
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
      <AstrophageField count={particleCount} bloom={bloom} />
    </>
  );
}
