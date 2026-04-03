import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Vite injects bundled script/link tags. `vite.config.ts` sets `base` from VITE_BASE
// for GitHub Project Pages (/repo-name/ prefix on asset URLs).
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
