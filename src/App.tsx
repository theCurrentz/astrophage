import { Canvas } from "@react-three/fiber";
import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { Scene } from "./Scene";
import { useCamera } from "./hooks/useCamera";
import { usePerformanceScaler } from "./hooks/usePerformanceScaler";

export function App() {
  const { videoRef, ready, error, start } = useCamera();
  const [started, setStarted] = useState(false);
  const touchWorld = useRef(new THREE.Vector3());
  const touchActive = useRef(false);
  const { particleCount, bloom, dprCap } = usePerformanceScaler();

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0000" }}>
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          opacity: ready ? 1 : 0,
          transition: "opacity 0.4s",
        }}
      />
      {!started && (
        <button
          type="button"
          onClick={() => {
            setStarted(true);
            void start();
          }}
          style={{
            position: "absolute",
            zIndex: 2,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            padding: "14px 28px",
            fontSize: 16,
            borderRadius: 999,
            border: "1px solid rgba(255,80,60,0.5)",
            background: "rgba(40,0,0,0.75)",
            color: "#ffb8a8",
            cursor: "pointer",
          }}
        >
          Enter Astrophage
        </button>
      )}
      {error && (
        <p style={{ position: "absolute", zIndex: 2, bottom: 24, left: 16, right: 16, color: "#f88", fontSize: 13 }}>
          {error}
        </p>
      )}
      <Canvas
        dpr={[1, dprCap]}
        gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0, zIndex: 1, touchAction: "none" }}
        camera={{ position: [0, 0, 2.4], fov: 55, near: 0.1, far: 100 }}
        onPointerUp={() => {
          touchActive.current = false;
        }}
        onPointerLeave={() => {
          touchActive.current = false;
        }}
      >
        <Suspense fallback={null}>
          <Scene particleCount={particleCount} bloom={bloom} touchWorld={touchWorld} touchActive={touchActive} />
        </Suspense>
      </Canvas>
    </div>
  );
}
