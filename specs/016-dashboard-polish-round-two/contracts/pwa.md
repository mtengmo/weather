# Contract: PWA Installability (User Story 7)

## `package.json`

Add `vite-plugin-pwa` to `devDependencies`.

## `vite.config.ts`

```ts
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "node:child_process";
import pkg from "./package.json";

const commitHash = execSync("git rev-parse --short HEAD").toString().trim();

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
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [], // no runtime caching rules for any external origin
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
    /* unchanged */
  },
});
```

(`background_color`/`theme_color` match the app's existing Midnight theme default — see
`src/index.css`'s theme tokens — so the install splash screen doesn't flash an unrelated color.)

## New: `public/icon-192.png`, `public/icon-512.png`

App icon assets at the two standard PWA sizes — reuses the app's existing visual identity (exact
source asset to be produced during implementation, not specified here).

## `src/vite-env.d.ts` (or a new `src/pwa-env.d.ts`)

```ts
declare const __APP_VERSION__: string;
```

(Ambient type declaration for the `define`d global, so `src/services/appVersion.ts` type-checks.)

## No changes to

- Any fetch call in `smhiProvider.ts`/`openMeteoProvider.ts`/`weatherApi.ts`/`geocodingApi.ts` —
  the service worker's `runtimeCaching: []` means none of these requests are ever intercepted or
  cached by the service worker; they behave exactly as they do today, online or not (failing
  normally offline, exactly as before this feature).
