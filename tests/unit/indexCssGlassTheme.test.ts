import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Glass theme dropdown legibility (019-dashboard-polish-round-four, US3)", () => {
  it("includes the Display menu and Forecast-sources menu panels in the glass theme's opaque-background rule", () => {
    const css = readFileSync(join(process.cwd(), "src/index.css"), "utf-8");
    const glassRuleMatch = css.match(/\[data-theme="glass"\][^{]*\.error-banner\s*\{[^}]*\}/);

    expect(glassRuleMatch).not.toBeNull();
    const glassRule = glassRuleMatch![0];
    expect(glassRule).toContain(".display-menu-content");
    expect(glassRule).toContain(".forecast-sources-control ul");
    expect(glassRule).toContain(".location-panel-content");
  });
});
