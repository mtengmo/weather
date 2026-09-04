/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as {
  version: string;
};

// A short git hash so the footer's version string changes on every build, not just on a manual
// package.json version bump (016-dashboard-polish-round-two, FR-010). Falls back to "local" when
// git isn't available (e.g. a source tarball without .git).
let commitHash = "local";
try {
  commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  // Best-effort — the footer just shows "<version> (local)" in that case.
}

export default defineConfig({
  base: "/",
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version} (${commitHash})`),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Never cache live weather-provider responses — a reopened offline app must show its
      // shell, never stale forecast data presented as current (016, Constraints).
      workbox: {
        runtimeCaching: [],
      },
      manifest: {
        name: "Weather History",
        short_name: "Weather",
        description: "SMHI and Open-Meteo weather history, forecast, and comparison.",
        start_url: "/",
        display: "standalone",
        background_color: "#0f1115",
        theme_color: "#0f1115",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
