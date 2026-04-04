import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Scene } from "./Scene";
import { usePerformanceScaler } from "./hooks/usePerformanceScaler";

/**
 * Full-screen **3D** view only: no camera feed. The canvas uses an opaque clear
 * (default) so the void behind the swarm reads as deep black-red.
 */
export function App() {
  const { particleCount, bloom, dprCap } = usePerformanceScaler();

  return (
    <div style={{ position: "fixed", inset: 0, background: "#050000" }}>
      <div
        style={{
          position: "absolute",
          zIndex: 2,
          top: 12,
          left: 12,
          right: 12,
          color: "rgba(255,200,190,0.85)",
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
        camera={{ position: [0, 0.15, 2.8], fov: 60, near: 0.08, far: 100 }}
      >
        <color attach="background" args={["#030000"]} />
        <Suspense fallback={null}>
          <Scene particleCount={particleCount} bloom={bloom} />
        </Suspense>
      </Canvas>
    </div>
  );
}
