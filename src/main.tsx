// Must be the first import: initializes i18next before any other module (some of which call
// `i18next.t()` at module-evaluation time, not just at render time) is evaluated
// (064-swedish-translation). ES module side-effect imports execute in the order they're written,
// depth-first — a later position here would let `import App` (and everything it transitively
// imports) run first.
import "./i18n";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "leaflet/dist/leaflet.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
