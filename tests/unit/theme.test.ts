import { beforeEach, describe, expect, it } from "vitest";
import { applyTheme, getThemePreference, setThemePreference } from "../../src/services/theme";
import { SERIES_COLORS } from "../../src/components/seriesColors";

// WCAG 2.1 relative-luminance contrast ratio, used to verify the "Bright" theme
// palette (research.md §6) meets 4.5:1 (normal text) / 3:1 (graphical objects).
function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("theme service", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to 'midnight' when no preference is stored", () => {
    expect(getThemePreference()).toBe("midnight");
  });

  it("persists a manual selection and returns it on next read", () => {
    setThemePreference("ivory");
    expect(getThemePreference()).toBe("ivory");
  });

  it("falls back to 'midnight' for an invalid stored value", () => {
    localStorage.setItem("weather-app:theme-preference:v1", "not-a-theme");
    expect(getThemePreference()).toBe("midnight");
  });

  it("applyTheme sets the data-theme attribute on the document root", () => {
    applyTheme("glass");
    expect(document.documentElement.getAttribute("data-theme")).toBe("glass");
  });

  it("resolves a pre-existing persisted 'ivory' value to the restyled theme with no migration step (FR-003a)", () => {
    // Simulates a user who selected the old "Ivory" theme before this feature shipped:
    // the identifier is unchanged, so no migration code is needed for it to resolve cleanly.
    localStorage.setItem("weather-app:theme-preference:v1", "ivory");
    expect(getThemePreference()).toBe("ivory");
  });
});

describe("'Bright' theme (data-theme=\"ivory\") contrast (FR-005, SC-004, research.md §6)", () => {
  const bg = "#fffdf9";
  const surface = "#ffffff";
  const text = "#151316";
  const textMuted = "#6b6570";
  const accent = "#e01050";
  const errorText = "#7a0930";
  const errorBg = "#ffe3e8";

  it("meets the 4.5:1 normal-text threshold for text and muted text", () => {
    expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(textMuted, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(textMuted, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("meets the 4.5:1 threshold for the accent color used as link/body text", () => {
    expect(contrastRatio(accent, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(accent, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("meets the 4.5:1 threshold for error banner text", () => {
    expect(contrastRatio(errorText, errorBg)).toBeGreaterThanOrEqual(4.5);
  });

  it("meets the 3:1 graphical-object threshold for every existing chart series color", () => {
    for (const color of SERIES_COLORS) {
      expect(contrastRatio(color, bg)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(color, surface)).toBeGreaterThanOrEqual(3);
    }
  });
});
