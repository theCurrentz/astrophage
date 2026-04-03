import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";
import { defineConfig } from "vite";

// Base path for deployed assets. GitHub Project Pages serves the site at
// https://<user>.github.io/<repo>/ so built JS/CSS links must include /repo/.
// Local dev uses "/". CI sets VITE_BASE=/repo-name/ when building for Pages.
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [react(), glsl()],
});
