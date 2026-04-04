import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Scene } from "./Scene";
import { usePerformanceScaler } from "./hooks/usePerformanceScaler";

/*
  App: the root component. Sets up:
    - A full-screen dark container (pure black for space)
    - The R3F <Canvas> with performance-tuned settings
    - A HUD overlay with movement instructions

  The Canvas props control WebGL behavior:
    - dpr: device pixel ratio range (adaptive via usePerformanceScaler)
    - gl.antialias: off because bloom already softens edges
    - camera: positioned inside the particle field, looking into the void
    - far: 100 units so distant stars and nebulae are visible
*/
export function App() {
  const { particleCount, bloom, dprCap } = usePerformanceScaler();

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <div
        style={{
          position: "absolute",
          zIndex: 2,
          top: 12,
          left: 12,
          right: 12,
          color: "rgba(255,180,170,0.8)",
          fontSize: 13,
          fontFamily: "system-ui, sans-serif",
          pointerEvents: "none",
          textShadow: "0 0 8px rgba(0,0,0,0.9)",
        }}
      >
        Click the scene, then <strong>W A S D</strong> to move · mouse to look · <strong>Esc</strong> unlocks cursor
      </div>
      <Canvas
        dpr={[1, dprCap]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0, touchAction: "none" }}
        camera={{ position: [0, 0, 3], fov: 65, near: 0.05, far: 100 }}
      >
        <color attach="background" args={["#000000"]} />
        <Suspense fallback={null}>
          <Scene particleCount={particleCount} bloom={bloom} />
        </Suspense>
      </Canvas>
    </div>
  );
}
