import { describe, expect, it } from "vitest";
import { precipitationVisualIntensity } from "../../src/components/mapPrecipitationVisual";

describe("precipitationVisualIntensity (031-map-precipitation-overlay)", () => {
  it("increases both radius and opacity as mm increases", () => {
    const low = precipitationVisualIntensity(0.5);
    const high = precipitationVisualIntensity(2);

    expect(high.radius).toBeGreaterThan(low.radius);
    expect(high.opacity).toBeGreaterThan(low.opacity);
  });

  it("caps radius/opacity at the same value for any mm at or beyond the visual maximum", () => {
    const atCap = precipitationVisualIntensity(5);
    const wayOver = precipitationVisualIntensity(500);

    expect(wayOver.radius).toBe(atCap.radius);
    expect(wayOver.opacity).toBe(atCap.opacity);
  });

  it("returns a positive radius/opacity even for a very small mm value", () => {
    const { radius, opacity } = precipitationVisualIntensity(0.01);
    expect(radius).toBeGreaterThan(0);
    expect(opacity).toBeGreaterThan(0);
  });
});
