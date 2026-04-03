# Astrophage

A **fake AR** web demo: a dense, red, glowing particle band drawn **on top of your phone camera** (or desktop webcam). No app install—just the browser.

If you are new to 3D graphics, read this file top to bottom once; the code comments repeat the same ideas next to the implementation.

---

## 3D in one minute (novice-friendly)

- **Scene graph** — A tree of objects (groups, meshes, lights). Each has position, rotation, scale. Parent transforms apply to children.
- **Mesh** — Geometry (triangles) + material (how pixels are colored).
- **Camera** — Defines **view** (where you stand) and **projection** (perspective: distant things look smaller).
- **Rasterization** — The GPU turns triangles into pixels. For each pixel the **fragment shader** runs (possibly thousands of times per frame).
- **Frame loop** — Typically 60 updates per second: move things, draw, repeat.

This project adds:

- **Instancing** — Draw the *same* quad many times with different positions in one GPU call.
- **Shaders** — Small programs on the GPU: **vertex** (move vertices) and **fragment** (color pixels).
- **Post-processing** — Extra image passes after the 3D scene (here: **bloom** glow + **tone mapping**).

---

## What you see on screen (stacking order)

1. **Bottom:** Full-screen HTML `<video>` showing the camera feed.
2. **Top:** A **transparent WebGL canvas** (`alpha: true`). Where nothing is drawn, you see the video. Where particles are drawn, you see red additive glow.

That is **fake AR**: we are not mapping objects onto real-world surfaces; we overlay graphics like a heads-up display.

---

## Run locally

```bash
pnpm install
pnpm dev
```

On iPhone Safari you must tap **Enter Astrophage** so the browser allows camera access (and orientation on some iOS versions).

---

## Deploy to GitHub Pages

This repo includes **GitHub Actions** (`.github/workflows/pages.yml`) that:

1. Builds the Vite app with `VITE_BASE=/<repository-name>/` so asset URLs work on **Project Pages** (`https://<user>.github.io/<repo>/`).
2. Uploads `dist/` to GitHub Pages.

**Enable it once in the repo:** Settings → Pages → **Build and deployment** → Source: **GitHub Actions**.

Pushes to `main` trigger a deploy. After the first successful run, open the site URL shown in the workflow / Pages settings.

**Note:** Camera and device orientation may require **HTTPS** (GitHub Pages provides that). Some browsers block camera on insecure origins.

---

## Project layout

| Path | Role |
|------|------|
| `src/App.tsx` | Stacks video + R3F canvas; explains fake AR and canvas flags |
| `src/Scene.tsx` | Parallax group + invisible touch plane |
| `src/components/AstrophageField.tsx` | Instanced mesh, shaders, post stack |
| `src/systems/particleSystem.ts` | CPU motion: curl noise, cohesion, touch |
| `src/shaders/*.glsl` | GPU: billboards, glow, sprite falloff |
| `src/hooks/` | Camera, pointer→3D, gyro, FPS scaler |
| `vite.config.ts` | `base` from `VITE_BASE` for GitHub Pages |

---

## Glossary (short)

| Term | Meaning |
|------|--------|
| **Billboard** | A quad that always faces the camera—good for particles and lens flares. |
| **NDC** | Normalized Device Coordinates: X and Y from −1 to 1 across the viewport; used to cast rays from mouse/touch. |
| **Raycast** | Shoot a ray from the camera through a pixel; intersect with geometry or a mathematical plane. |
| **Instancing** | One draw call renders many copies of the same mesh with per-instance attributes. |
| **Curl noise** | A smooth vector field that swirls like fluid—nice for organic motion. |
| **Bloom** | Blur bright pixels and add them back—reads as glow around emissive content. |
| **Tone mapping** | Map HDR-style brightness into the 0–1 range your screen can display (ACES ≈ film-like). |

---

## Visual reference

Add `public/astrophage.webp` (concept art) locally if you want a still reference beside the running app; the runtime does not depend on it.
