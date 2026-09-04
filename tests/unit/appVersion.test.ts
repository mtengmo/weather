import { describe, expect, it } from "vitest";
import { APP_VERSION } from "../../src/services/appVersion";

describe("appVersion (016-dashboard-polish-round-two, US8)", () => {
  it("exposes a non-empty version string", () => {
    // vite.config.ts's `define` for __APP_VERSION__ applies under Vitest too (it shares the
    // same config), so this always resolves to the real "<package.json version> (<git hash>)"
    // value here rather than the "dev" fallback — that fallback only matters for a build
    // pipeline that doesn't apply Vite's `define` at all.
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+ \(.+\)$/);
  });
});
