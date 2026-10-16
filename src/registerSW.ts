import { registerSW } from "virtual:pwa-register";

/**
 * Registers the service worker and reloads the page once a new deploy's worker takes control.
 * Without this, a stale precached shell (old JS/icons) is served on the first load after a deploy
 * and the new build only appears after a second, manual refresh.
 */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Skip the very first install (no previous controller): nothing stale to replace.
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });
  registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      // Re-check for a new deploy hourly and whenever the tab becomes visible again.
      const check = () => void reg.update().catch(() => undefined);
      setInterval(check, 60 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
    },
  });
}
