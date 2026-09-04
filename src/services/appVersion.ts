// Injected at build time via vite.config.ts's `define` (016-dashboard-polish-round-two, FR-010) —
// package.json's version plus a short git commit hash, e.g. "0.1.0 (a41fea7)". Falls back to
// "dev" when the build-time define isn't present (e.g. a test runner that doesn't set it).
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
