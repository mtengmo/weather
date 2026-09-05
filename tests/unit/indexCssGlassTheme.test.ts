import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Glass theme dropdown legibility (019-dashboard-polish-round-four, US3)", () => {
  it("includes the Display menu panel in the glass theme's opaque-background rule", () => {
    const css = readFileSync(join(process.cwd(), "src/index.css"), "utf-8");
    const glassRuleMatch = css.match(/\[data-theme="glass"\][^{]*\.error-banner\s*\{[^}]*\}/);

    expect(glassRuleMatch).not.toBeNull();
    const glassRule = glassRuleMatch![0];
    expect(glassRule).toContain(".display-menu-content");
    expect(glassRule).toContain(".location-panel-content");
  });
});

describe("Display menu doesn't overflow off-screen on narrow viewports (020-dashboard-polish-round-five, US8)", () => {
  it("anchors the panel's left edge to the button, not the right edge", () => {
    const css = readFileSync(join(process.cwd(), "src/index.css"), "utf-8");
    const ruleMatch = css.match(/\.display-menu-content\s*\{[^}]*\}/);

    expect(ruleMatch).not.toBeNull();
    const rule = ruleMatch![0];
    // Anchoring the *right* edge (right: 0) pushed the panel's content off the left of the
    // screen when the Display button sits near the header's left edge on a narrow viewport —
    // found via live mobile-viewport testing, not something jsdom can otherwise catch.
    expect(rule).toContain("left: 0");
    expect(rule).not.toMatch(/[^-]right:\s*0/);
  });
});
