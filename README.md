# Astrophage — Interactive WebGL Particle Simulation

A real-time 3D visualization of **astrophage** — the fictional infrared-emitting microorganism
from Andy Weir's *Project Hail Mary*. Built with **React Three Fiber**, **TypeScript**, and **Vite**.

Fly through a deep-space field of thousands of glowing red particles with WASD + mouse controls.

---

## Quick Start

```bash
pnpm install
pnpm dev         # opens http://localhost:5173
pnpm build       # production build → dist/
```

---

## Architecture Overview

```
src/
├── main.tsx                    Entry point — mounts React root
├── App.tsx                     Canvas setup, adaptive quality hook
├── Scene.tsx                   Scene graph: stars, nebula arcs, particles, FPS controls
├── components/
│   ├── AstrophageField.tsx     Instanced particle renderer + post-processing
│   └── NebulaArc.tsx           Procedural plasma/lightning arc mesh
├── shaders/
│   ├── astrophage.vert.glsl   Particle vertex shader (billboarding)
│   ├── astrophage.frag.glsl   Particle fragment shader (bokeh glow)
│   ├── nebula.vert.glsl       Nebula vertex shader (pass-through)
│   └── nebula.frag.glsl       Nebula fragment shader (fBm plasma)
├── systems/
│   └── particleSystem.ts      CPU particle simulation (gentle drift)
└── hooks/
    ├── useFpsMovement.ts       WASD camera translation
    └── usePerformanceScaler.ts Adaptive quality (FPS-based)
```

---

## Concepts Explained

### 1. Instanced Rendering

Instead of creating a separate mesh for each of 6,000+ particles, we create **one** quad
and tell the GPU to draw it thousands of times. Each "instance" reads its own position,
size, and seed from per-instance buffers (`InstancedBufferAttribute`). This is the key
to rendering massive particle counts at 60 FPS.

**Where:** `AstrophageField.tsx` creates an `InstancedBufferGeometry` with shared vertex
data (the quad's corners and UVs) plus per-instance attributes (`aOffset`, `aSize`, `aSeed`, `aDensity`).

### 2. Vertex Shader — Billboarding

Each particle is a flat quad, but it must always face the camera no matter where the
camera is. The trick: transform the particle center to **eye space** (where the camera
is at the origin looking down −Z), then offset the quad corners in screen-aligned XY.

**Where:** `astrophage.vert.glsl` — the line `mvPosition.xy += position.xy * aSize`
does the billboard expansion after `modelViewMatrix` moves the center to eye space.

### 3. Fragment Shader — Bokeh Glow

Each particle pixel uses two **gaussian curves** (`exp(-d² * k)`):
- A wide one for the soft bokeh halo
- A tight one for the bright hot core

The color ramps from deep red at the edges to pinkish-white at the center, simulating
infrared radiation from astrophage organisms.

**Where:** `astrophage.frag.glsl` — `bokeh` and `core` variables create the layered glow.

### 4. Additive Blending

Normal alpha blending layers objects back-to-front and obscures what's behind.
**Additive blending** simply adds each particle's color to what's already there,
so overlapping particles create brighter, more intense glow — perfect for emissive
light-emitting organisms. Depth writes are disabled so draw order doesn't matter.

**Where:** `AstrophageField.tsx` sets `blending: THREE.AdditiveBlending` and `depthWrite: false`.

### 5. Post-Processing — Bloom

Bloom extracts pixels brighter than a threshold, blurs them at multiple scales
(mipmap chain), and adds the blurred result back to the image. This creates the
camera-like glow/halo effect you see around bright lights in photographs.

**Where:** `AstrophageField.tsx` uses `<Bloom>` from `@react-three/postprocessing`.

### 6. Procedural Nebula (fBm Noise)

The red lightning/plasma arcs are generated entirely in the GPU fragment shader using
**fractal Brownian motion** — multiple layers of 2D value noise at increasing frequency
and decreasing amplitude. This creates organic, turbulent patterns without any textures.

**Where:** `nebula.frag.glsl` — the `fbm()` function layers 5 octaves of noise, and
`noise()` implements bilinear-interpolated 2D value noise with smoothstep blending.

### 7. Adaptive Quality

A `requestAnimationFrame` loop measures FPS every 500 ms. If FPS drops below 30,
the system reduces particle count, bloom intensity, and pixel ratio. If FPS exceeds
56, it scales them back up. This keeps the experience smooth on phones while showing
full quality on powerful GPUs.

**Where:** `usePerformanceScaler.ts` — the returned `particleCount`, `bloom`, and
`dprCap` values flow into the Canvas and AstrophageField components.

### 8. FPS Camera Controls

`PointerLockControls` (from drei) captures the mouse cursor on click and maps mouse
deltas to camera rotation. The `useFpsMovement` hook reads WASD key state each frame
and translates the camera along its **local axes** — forward is the camera's −Z
direction, right is its +X. This gives standard first-person movement.

**Where:** `useFpsMovement.ts` computes direction vectors; `Scene.tsx` applies them.

### 9. RawShaderMaterial

Three.js normally prepends hundreds of lines of built-in GLSL to your shaders
(`#include <common>`, `#include <fog_vertex>`, etc). `RawShaderMaterial` skips all of
that — you write every uniform, attribute, and varying yourself. This is more work but
gives complete control and is the best way to learn how shaders actually work.

**Where:** Both `AstrophageField.tsx` and `NebulaArc.tsx` use `RawShaderMaterial`.

---

## Controls

| Key         | Action             |
|-------------|--------------------|
| Click       | Lock mouse cursor  |
| W / S       | Move forward/back  |
| A / D       | Strafe left/right  |
| Mouse       | Look around        |
| Esc         | Unlock cursor      |

---

## Deployment

The project deploys to GitHub Pages via the workflow in `.github/workflows/pages.yml`.
Set the `VITE_BASE` environment variable to your repo name (e.g. `/astrophage/`) so
asset paths resolve correctly under the GitHub Pages subdirectory.

---

## Tech Stack

| Library                    | Role                                 |
|----------------------------|--------------------------------------|
| React 19                   | UI framework                         |
| Three.js                   | WebGL abstraction                    |
| @react-three/fiber         | React renderer for Three.js          |
| @react-three/drei          | Helpers (Stars, PointerLockControls) |
| @react-three/postprocessing| Bloom, tone mapping                  |
| Vite                       | Build tool + dev server              |
| vite-plugin-glsl           | Import .glsl files as strings        |
| TypeScript                 | Type safety                          |
