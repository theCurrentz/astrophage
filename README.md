# Astrophage

Fake-AR web experience: a dense, red, bioluminescent particle band over the device camera. Built with **Vite**, **React 19**, **TypeScript**, **Three.js**, and **React Three Fiber**.

## Run

```bash
pnpm install
pnpm dev
```

Open on desktop or iPhone Safari. Tap **Enter Astrophage** to request the camera (required on iOS).

## What you are looking at

1. **Camera layer** — A full-screen `<video>` from `getUserMedia` sits behind the canvas (`alpha: true` so the feed shows through).
2. **Instanced billboards** — Each “particle” is a small quad, always facing the camera. One draw call, many instances. Spheres would cost more fill rate and are harder to shape as soft glows.
3. **Simulation** — CPU-side vectors per particle: curl-noise drift (organic motion), light cohesion toward the swarm center, touch repulsion, and band constraints. No heavy physics engine.
4. **Shaders** — `RawShaderMaterial` vertex shader places each instance and adds wobble; fragment shader does radial falloff, pulse, density, additive color. **Additive blending** makes overlaps read as brighter plasma.
5. **Post** — Bloom (mipmap blur) plus **ACES Filmic** tone mapping so highlights roll off smoothly instead of clipping white.

## Performance

`usePerformanceScaler` samples frame rate and adjusts particle count, bloom strength, and max DPR (via `Canvas` `dpr={[1, cap]}`). Target 60fps; falls back toward 30fps on slower GPUs.

## Visual reference

Add `public/astrophage.webp` (your concept art) for local comparison; the scene does not load it at runtime—it is the artistic target for tuning shaders and counts.

## Project layout

| Path | Role |
|------|------|
| `src/App.tsx` | Camera UI, Canvas, parallax group, touch plane |
| `src/components/AstrophageField.tsx` | Instanced mesh, material, composer |
| `src/systems/particleSystem.ts` | Particle data, band init, simulation step |
| `src/shaders/*.glsl` | Vertex / fragment GLSL |
| `src/hooks/` | Camera, parallax, interaction, FPS scaler |

## Glossary

- **Billboard** — Quad oriented to face the camera every frame (here via view-space offset in the vertex shader).
- **Instancing** — One geometry, GPU repeats it per instance with different attributes (position, size, seed).
- **Curl noise** — Vector field with no divergence “sources”; good for swirly, fluid-like motion.
- **Bloom** — Blur of bright pixels, blended back—reads as glow and haze around emissive areas.
- **Fake AR** — Camera passthrough + 3D overlay; no SLAM or world anchors (per MVP).
