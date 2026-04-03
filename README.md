# Astrophage — build tutorial

This document walks through **how** this project was put together. It assumes you are comfortable with **React** and have used **Three.js** a little (scenes, meshes, maybe `requestAnimationFrame`). We build ideas in order—from the app shell to the more advanced GPU pieces—so you can map each section to folders in the repo.

**What you are building:** a “fake AR” view: the device camera fills the screen, and a **dense ribbon of glowing red particles** is drawn on top. It feels physical because of motion, touch reaction, and glow—not because we track the real world (no WebXR plane detection here).

---

## Part 0 — Prerequisites and vocabulary

| You already know | We will add |
|------------------|-------------|
| React components, hooks, refs | Using **refs** to pass stable handles into the render loop (no re-render per frame) |
| `THREE.Scene`, `PerspectiveCamera`, `Mesh` | **React Three Fiber (R3F)** as a React renderer for Three.js |
| Materials | **Custom shaders** (`RawShaderMaterial`) and **instancing** |
| Maybe nothing about post | **EffectComposer**: bloom + tone mapping as extra render passes |

**Words we use a lot:**

- **Scene graph** — Tree of `Object3D`s (groups, meshes). Parent transform applies to children.
- **Draw call** — One submission to the GPU (“draw this geometry with this material”). Fewer is usually faster.
- **Fragment shader** — Runs per pixel (per covered fragment). **Vertex shader** — Runs per vertex.

---

## Part 1 — Project shell: Vite + React + TypeScript

We use **Vite** for fast dev server and production bundling. TypeScript catches mistakes when we wire Three types (vectors, refs) into React.

**Why pnpm:** deterministic installs; same as any modern JS project.

At this layer there is no 3D yet—only `main.tsx` mounting `<App />`.

---

## Part 2 — Fake AR: stacking video under WebGL

**Goal:** Show the camera behind the effect.

1. **HTML `<video>`** — We attach a `MediaStream` from `navigator.mediaDevices.getUserMedia`. The video element is a normal 2D layer: full screen, `object-fit: cover`.
2. **`<Canvas>` from R3F** — Sits above the video (`z-index`). It creates a `WebGLRenderer` with **`alpha: true`** so the default clear is **transparent**. Pixels we do not draw show the video through.

This is **not** WebXR AR. We are not aligning models to floors or tables. We are doing **compositing**: video + transparent WebGL, like a HUD. See `useCamera.ts` and `App.tsx`.

**iOS note:** Camera (and sometimes orientation) must be triggered after a **user gesture**, hence the “Enter Astrophage” button calling `start()`.

---

## Part 3 — React Three Fiber: React as a scene graph API

In plain Three.js you write:

```js
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);
```

**R3F** lets you describe the same thing declaratively:

```tsx
<mesh><boxGeometry /><meshStandardMaterial /></mesh>
```

Under the hood, R3F creates Three objects, attaches them to the scene, and reconciles updates when props change. **`useFrame`** runs code **every rendered frame** (like `requestAnimationFrame` tied to the renderer)—ideal for animation and reading input without React state thrash.

**Takeaway:** R3F does not replace understanding Three.js; it **organizes** it. You still think in scenes, cameras, and materials.

---

## Part 4 — One group parented to the camera: parallax without AR tracking

**Problem:** We want particles to feel “in front of you” and shift slightly when you tilt the phone.

**Idea:** Put all particles in a **`THREE.Group`**. Each frame, set that group’s **position** and **base rotation** to match the **camera**. That keeps the swarm in front of the user. Then multiply in a **small extra rotation** from device orientation so tilt adds a subtle offset (parallax).

**Implementation notes (`Scene.tsx`):**

- `useFrame` copies `camera.position` and `camera.quaternion` into the group, then **multiplies** by `parallaxDelta` (a quaternion updated in `useParallax.ts`).
- **Quaternions** represent rotations without gimbal lock; **slerp** smoothly interpolates toward the target tilt so motion does not jitter.

We are still not solving “where is the floor”—we only fake depth with motion cues.

---

## Part 5 — Particles: why instanced quads, not spheres

**Requirement:** Hundreds or thousands of glowing specks, 60fps on mobile if possible.

| Approach | Pros | Cons |
|----------|------|------|
| Many `Mesh`es | Simple mentally | One draw call each → CPU bottleneck |
| **Instanced** single mesh | One draw, GPU repeats geometry | Need instanced attributes + custom shader for best control |
| Points (`Points`) | Cheap | Harder to get soft circular glow; size limits vary |

We chose **one `InstancedBufferGeometry`** built from a **plane** (two triangles). Each instance has attributes: **offset** (center), **size**, **seed**, **density**. The vertex shader moves each quad’s corners in **view space** so quads **face the camera**—classic **billboarding**.

**Concept:** **Instancing** means the GPU draws the same triangles N times in one call; each instance reads a different row from the instanced attributes. See `AstrophageField.tsx`.

---

## Part 6 — CPU simulation vs GPU drawing

We split responsibilities on purpose:

| Layer | Responsibility |
|-------|----------------|
| **JavaScript (`particleSystem.ts`)** | Integrate forces: curl noise drift, cohesion toward swarm center, repulsion from touch, clamp to a “ribbon” volume. Update **`aOffset`** buffer each frame. |
| **GPU (shaders)** | Turn each instance into a camera-facing quad; color pixels with radial falloff, pulse, additive red. |

**Why not simulate entirely on GPU?** Possible with transform feedback or compute shaders, but not required for MVP. CPU sim is easier to read and tune, and particle counts stay in a range (hundreds–low thousands) where JS is acceptable if we avoid allocations in the hot loop (reuse `Vector3`s).

**Curl noise (high level):** We build smooth 3D noise, then take finite differences to form a **curl** vector field—motion tends to swirl like smoke instead of flowing in one random direction. See comments in `particleSystem.ts`.

---

## Part 7 — Shaders: `RawShaderMaterial` and the two stages

**Vertex shader** — Inputs: per-vertex `position`/`uv`, per-instance `aOffset`, etc. Outputs: `gl_Position` (clip space), and **varyings** (e.g. `vUv`) passed to the fragment stage.

We transform the instance center with `modelViewMatrix`, then add `position.xy * aSize` in **view-aligned** space so the quad billboards.

**Fragment shader** — Inputs: interpolated `vUv` (and others). Outputs: `gl_FragColor` (RGBA). We compute a **radial mask** in UV space (soft circle), multiply by **density**, **pulse** (sin over time + seed), and a red tint. **Additive blending** (`AdditiveBlending`) makes overlaps brighter—good for “plasma” glow.

**RawShaderMaterial:** Three does not prepend its shader chunks; we list `precision`, `uniform` matrices, and `attribute`s explicitly. Trade-off: verbosity for full control (matches learning goals).

Files: `src/shaders/astrophage.vert.glsl`, `astrophage.frag.glsl`.

---

## Part 8 — Touch: from screen pixels to 3D force

**Problem:** Pointer events give **2D** coordinates. The simulation needs a **3D point** in the same space as particle positions (group local space after parallax).

**Pipeline (`useInteraction.ts`):**

1. Convert client x/y to **NDC** (−1 to 1): normalized device coordinates.
2. **`Raycaster.setFromCamera(ndc, camera)`** — Builds a ray from the eye through that pixel.
3. Intersect the ray with a **plane** facing the camera at a chosen distance—an invisible “window” in front of the scene.
4. Copy the hit point, then **`worldToLocal`** on the parallax group so the point matches where particles live.

The invisible plane in `Scene.tsx` exists so pointer events hit **something**; the math above is what actually drives the simulation.

---

## Part 9 — Post-processing: bloom and tone mapping

After the scene renders to an internal buffer, **post** effects run as full-screen passes.

- **Bloom** — Detects bright pixels, blurs them (mipmap blur here), adds back. Reads as **glow** and light bleed—critical for “emissive swarm” look.
- **Tone mapping (ACES Filmic)** — Real additive stacks can exceed displayable range. Tone mapping **compresses** highlights smoothly so brights roll off instead of clipping harsh white.

R3F integration: `@react-three/postprocessing` wraps `postprocessing` effects. See `AstrophageField.tsx` (`EffectComposer`, `Bloom`, `ToneMapping`).

---

## Part 10 — Performance: DPR cap and adaptive quality

**Device pixel ratio (DPR):** Retina screens might be 2× or 3×. Rendering at full native resolution costs more fragment shader work. We pass **`dpr={[1, dprCap]}`** on `<Canvas>` so R3F caps effective resolution.

**Adaptive scaler (`usePerformanceScaler.ts`):** A simple **FPS estimate** over half-second windows nudges particle count, bloom strength, and DPR cap down when the frame rate drops, and nudges them up when there is headroom. This is a heuristic, not a formal benchmark—enough to keep mobile web usable.

---

## Part 11 — Deploying to GitHub Pages

Vite outputs static files in `dist/`. **GitHub Project Pages** serves the site at `https://<user>.github.io/<repo>/`, so asset URLs must include the **repository name** as a path prefix.

**`vite.config.ts`** sets `base` from `VITE_BASE` (default `/` for local dev). CI sets `VITE_BASE=/<repository-name>/` when building.

Workflow **`.github/workflows/pages.yml`** runs `pnpm run build` with that env and deploys `dist/` via GitHub Actions. Enable **Pages → Source: GitHub Actions** in the repository settings. HTTPS is provided—important for camera access in many browsers.

---

## Map: files to concepts

| File | Concepts |
|------|----------|
| `src/App.tsx` | Video + transparent canvas, DPR, Suspense |
| `src/Scene.tsx` | Camera-follow group, touch plane, parallax multiply |
| `src/components/AstrophageField.tsx` | Instancing, shaders, composer |
| `src/systems/particleSystem.ts` | Forces, curl noise, integration |
| `src/hooks/useCamera.ts` | getUserMedia, cleanup |
| `src/hooks/useInteraction.ts` | NDC, ray, plane, worldToLocal |
| `src/hooks/useParallax.ts` | DeviceOrientation, quaternion slerp |
| `src/hooks/usePerformanceScaler.ts` | FPS sampling, quality tiers |
| `src/shaders/*.glsl` | Billboard math, sprite shading |

---

## Run and reference image

```bash
pnpm install
pnpm dev
```

Optional: add `public/astrophage.webp` as static art reference next to the running app (not loaded by the shader pipeline).

---

## Glossary (quick lookup)

| Term | One line |
|------|----------|
| **Billboard** | Quad always facing the camera. |
| **NDC** | Clip-space normalized x/y for pointer → ray. |
| **Instancing** | One geometry, many instances, per-instance attributes. |
| **Curl noise** | Swirly divergence-free vector field from noise derivatives. |
| **Bloom** | Blur bright areas, add back → glow. |
| **Tone mapping** | Map HDR-like values to display range. |

For line-by-line commentary, read the source files—comments there mirror this tutorial in smaller chunks.
