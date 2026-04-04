# Astrophage — build tutorial

This document walks through **how** this project was put together. It assumes you are comfortable with **React** and have used **Three.js** a little (scenes, meshes, maybe `requestAnimationFrame`). Ideas are ordered from the app shell toward GPU details so you can match sections to files.

**What you are building:** a **3D first-person** fly-through of a dense, glowing red **particle band** (the “astrophage”). You **click to capture the mouse** (pointer lock), then use **WASD** to move and the mouse to look around—classic web FPS controls. There is **no** device camera and **no** AR.

---

## Part 0 — Prerequisites and vocabulary

| You already know | We will add |
|------------------|-------------|
| React components, hooks, refs | Driving the **camera** from `useFrame` + keyboard state |
| `THREE.Scene`, `PerspectiveCamera`, `Mesh` | **React Three Fiber (R3F)** as a React renderer for Three.js |
| Materials | **Custom shaders** (`RawShaderMaterial`) and **instancing** |
| Maybe nothing about post | **EffectComposer**: bloom + tone mapping |

**Words we use a lot:**

- **Scene graph** — Tree of `Object3D`s. Parent transform applies to children.
- **Draw call** — One GPU submission (“draw this geometry with this material”). Fewer is usually faster.
- **Fragment shader** — Runs per pixel. **Vertex shader** — Runs per vertex.
- **Pointer lock** — Browser API: hides the cursor and sends relative mouse motion so you can implement “mouse look” without the pointer leaving the window.

---

## Part 1 — Project shell: Vite + React + TypeScript

We use **Vite** for dev server and production bundling. TypeScript helps when wiring Three types into React.

**Why pnpm:** deterministic installs.

At this layer there is no 3D yet—only `main.tsx` mounting `<App />`.

---

## Part 2 — Full-screen 3D: one canvas, opaque background

**Goal:** A single WebGL canvas fills the viewport. The scene is a **dark void** (`<color attach="background" />`) so the additive red particles read as emissive fog.

There is **no** `<video>`, **no** `getUserMedia`, **no** transparent canvas. The camera is the default R3F **PerspectiveCamera** (configured in `App.tsx`).

---

## Part 3 — React Three Fiber: React as a scene graph API

In plain Three.js you create a scene and add meshes. **R3F** maps that to JSX:

```tsx
<mesh><boxGeometry /><meshStandardMaterial /></mesh>
```

**`useFrame`** runs every animation frame—ideal for moving the camera from keyboard input without React re-renders.

**Takeaway:** R3F organizes Three.js; you still think in cameras, meshes, and materials.

---

## Part 4 — First-person navigation: PointerLock + WASD

**Problem:** Move the camera through world space with **WASD** and look with the **mouse**.

**Pieces:**

1. **`PointerLockControls`** (`@react-three/drei`) — Wraps Three’s pointer-lock controls. User **clicks** the canvas; the browser locks the pointer. Mouse deltas rotate the camera. **Esc** unlocks.
2. **`useFpsMovement` / `applyFpsMovement`** — Each frame, read keys (`KeyW`, `KeyA`, `KeyS`, `KeyD`) and add `camera.position` along **camera-relative** forward and right vectors (`forward = (0,0,-1)`, `right = (1,0,0)` rotated by `camera.quaternion`).

This is the same idea as a simple FPS demo: **rotation** from pointer lock, **translation** from keys.

See `Scene.tsx` and `hooks/useFpsMovement.ts`.

---

## Part 5 — Particles: why instanced quads, not spheres

**Requirement:** Many glowing specks, good frame rate on laptops and phones.

| Approach | Pros | Cons |
|----------|------|------|
| Many `Mesh`es | Simple | One draw call each → bottleneck |
| **Instanced** single mesh | One draw, GPU repeats geometry | Instanced attributes + shader for billboards |
| Points (`Points`) | Cheap | Harder to get soft circular glow |

We use **one `InstancedBufferGeometry`** from a **plane** (two triangles). Per instance: **offset**, **size**, **seed**, **density**. The vertex shader billboards each quad toward the camera.

**Concept:** **Instancing** means the GPU draws the same triangles N times in one call; each instance reads a different row from the instanced attributes.

---

## Part 6 — CPU simulation vs GPU drawing

| Layer | Responsibility |
|-------|----------------|
| **JavaScript (`particleSystem.ts`)** | Curl-noise drift, cohesion toward centroid, soft clamp to a ribbon volume. Update **`aOffset`** each frame. |
| **GPU (shaders)** | Billboard corners, radial sprite, pulse, additive red. |

**Curl noise:** Smooth noise → finite differences → **curl** vector field; motion swirls like smoke.

**Why not simulate entirely on GPU?** Possible with compute shaders; CPU sim is easier to read and tune at these particle counts.

---

## Part 7 — Shaders: `RawShaderMaterial`

**Vertex:** Transform instance center, offset corners in view space for billboarding.

**Fragment:** Radial mask in UV space, density, pulse, additive color. **Additive blending** stacks brightness for a plasma look.

**RawShaderMaterial:** Full GLSL, no Three shader chunks—explicit uniforms and attributes.

Files: `src/shaders/astrophage.vert.glsl`, `astrophage.frag.glsl`.

---

## Part 8 — Post-processing: bloom and tone mapping

- **Bloom** — Blur bright pixels, add back → glow.
- **ACES Filmic tone mapping** — Roll off highlights so additive stacks do not clip to harsh white.

See `AstrophageField.tsx`.

---

## Part 9 — Performance: DPR cap and adaptive quality

**`dpr={[1, dprCap]}`** — Caps device pixel ratio on high-DPI screens.

**`usePerformanceScaler.ts`** — Rough FPS sampling adjusts particle count, bloom, and DPR cap.

---

## Part 10 — Deploying to GitHub Pages

Vite outputs `dist/`. **Project Pages** URLs look like `https://<user>.github.io/<repo>/`, so asset paths need the repo prefix.

**`vite.config.ts`** uses `base` from `VITE_BASE` (default `/` locally). CI sets `VITE_BASE=/<repository-name>/`.

**`.github/workflows/pages.yml`** builds and deploys. Enable **Pages → GitHub Actions** in repo settings.

---

## Map: files to concepts

| File | Concepts |
|------|----------|
| `src/App.tsx` | Canvas, background color, HUD hint, DPR |
| `src/Scene.tsx` | Pointer lock, WASD movement |
| `src/hooks/useFpsMovement.ts` | Key state, camera-relative translation |
| `src/components/AstrophageField.tsx` | Instancing, shaders, composer |
| `src/systems/particleSystem.ts` | Curl noise, cohesion, integration |
| `src/hooks/usePerformanceScaler.ts` | FPS sampling, quality tiers |
| `src/shaders/*.glsl` | Billboard, sprite shading |

---

## Run

```bash
pnpm install
pnpm dev
```

Click the scene, then **WASD** + mouse. Optional: `public/astrophage.webp` as offline art reference (not loaded by the app).

---

## Glossary

| Term | One line |
|------|----------|
| **Billboard** | Quad always facing the camera. |
| **Instancing** | One geometry, many instances, per-instance attributes. |
| **Curl noise** | Swirly vector field from noise derivatives. |
| **Bloom** | Blur bright areas, add back → glow. |
| **Tone mapping** | Map HDR-like values to display range. |
| **Pointer lock** | Capture mouse for relative look; Esc to exit. |

For shorter notes, see comments in the source files.
