import { useEffect, useRef, useState } from "react";

type Tier = { particleCount: number; bloom: number; dprCap: number };

/*
  Adaptive quality system: measures FPS every 500 ms and adjusts rendering
  parameters to keep the experience smooth on any device.

  Three knobs:
    1. particleCount — how many astrophage instances the GPU draws per frame
    2. bloom — intensity of the glow post-process (more = more blur passes)
    3. dprCap — device pixel ratio limit (lower = fewer pixels = faster)

  The scaler nudges these values up when FPS is healthy (>56) and down when
  the GPU struggles (<30). This keeps mobile browsers usable while letting
  powerful desktops show the full effect.
*/
export function usePerformanceScaler() {
  const [tier, setTier] = useState<Tier>({
    particleCount: 6000,
    bloom: 2.0,
    dprCap: 2,
  });
  const acc = useRef(0);
  const frames = useRef(0);
  const last = useRef(performance.now());

  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      const dt = t - last.current;
      last.current = t;
      acc.current += dt;
      frames.current += 1;

      if (acc.current >= 500) {
        const fps = (frames.current / acc.current) * 1000;
        acc.current = 0;
        frames.current = 0;

        setTier((prev) => {
          let n = prev.particleCount;
          let b = prev.bloom;
          let d = prev.dprCap;

          if (fps < 30) {
            n = Math.max(2000, n - 300);
            b = Math.max(1.0, b - 0.1);
            d = Math.max(1.0, d - 0.15);
          } else if (fps > 56) {
            n = Math.min(12000, n + 200);
            b = Math.min(2.5, b + 0.05);
            d = Math.min(2, d + 0.05);
          }

          if (n === prev.particleCount && b === prev.bloom && d === prev.dprCap) return prev;
          return { particleCount: n, bloom: b, dprCap: d };
        });
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return tier;
}
