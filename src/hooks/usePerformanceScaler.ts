import { useEffect, useRef, useState } from "react";

type Tier = { particleCount: number; bloom: number; dprCap: number };

/**
 * **Adaptive quality:** measures rough FPS over 500ms windows, then nudges:
 * - fewer/more **instances** (biggest cost),
 * - bloom **intensity** (blur passes cost GPU),
 * - **device pixel ratio** cap (fewer pixels shaded = higher FPS on Retina).
 *
 * This is a heuristic, not a formal benchmark—good enough to keep mobile web usable.
 */
export function usePerformanceScaler() {
  const [tier, setTier] = useState<Tier>({ particleCount: 900, bloom: 1.5, dprCap: 2 });
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
            n = Math.max(500, n - 40);
            b = Math.max(0.9, b - 0.08);
            d = Math.max(1.25, d - 0.15);
          } else if (fps > 56) {
            n = Math.min(1200, n + 20);
            b = Math.min(1.85, b + 0.04);
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
