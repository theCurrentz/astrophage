import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// index.html lives at the site root. Vite injects script/link tags; `vite.config.ts`
// sets `base` from VITE_BASE so GitHub Project Pages resolve /repo-name/assets/... .
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
