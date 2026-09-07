import { describe, expect, it } from "vitest";
import {
  TEMPERATURE_BANDS,
  bandForTemperature,
  buildGradientStops,
} from "../../src/services/temperatureColorScale";

describe("TEMPERATURE_BANDS (037-header-controls-and-chart-fixes, US6)", () => {
  it("has exactly 11 bands", () => {
    expect(TEMPERATURE_BANDS).toHaveLength(11);
  });

  it("has strictly increasing maxC values, 5°C apart, with only the last one open-ended", () => {
    const closed = TEMPERATURE_BANDS.slice(0, -1);
    for (const band of closed) {
      expect(band.maxC).not.toBeNull();
    }
    for (let i = 1; i < closed.length; i++) {
      expect(closed[i].maxC! - closed[i - 1].maxC!).toBe(5);
    }
    expect(TEMPERATURE_BANDS[TEMPERATURE_BANDS.length - 1].maxC).toBeNull();
  });
});

describe("bandForTemperature", () => {
  it("resolves a value inside a named band to that band", () => {
    expect(bandForTemperature(3).label).toBe("Cool");
    expect(bandForTemperature(0).label).toBe("Around freezing");
    expect(bandForTemperature(18).label).toBe("Warm");
  });

  it("resolves a value exactly at a boundary to the colder (lower) band", () => {
    expect(bandForTemperature(-15).label).toBe("Very cold");
    expect(bandForTemperature(0).label).toBe("Around freezing");
  });

  it("resolves a value more extreme than the table's own bounds to the matching open-ended band", () => {
    expect(bandForTemperature(-25).label).toBe("Very cold");
    expect(bandForTemperature(40).label).toBe("Extreme heat");
  });
});

describe("buildGradientStops", () => {
  it("starts at offset 0 with the max value's band color and ends at offset 100 with the min value's", () => {
    const stops = buildGradientStops(2, 18);
    expect(stops[0]).toEqual({ offset: 0, color: bandForTemperature(18).color });
    expect(stops[stops.length - 1]).toEqual({ offset: 100, color: bandForTemperature(2).color });
  });

  it("produces stops in non-decreasing offset order", () => {
    const stops = buildGradientStops(-12, 27);
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i].offset).toBeGreaterThanOrEqual(stops[i - 1].offset);
    }
  });

  it("adds a hard edge (duplicate offset, two colors) at each internal band boundary", () => {
    // Range 2-18 crosses the boundaries at 5, 10, and 15.
    const stops = buildGradientStops(2, 18);
    const offsets = stops.map((s) => s.offset);
    const duplicateOffsets = offsets.filter((o, i) => offsets.indexOf(o) !== i);
    expect(duplicateOffsets).toHaveLength(3);
  });

  it("uses the correct extreme band when min/max fall outside the table's named range", () => {
    const stops = buildGradientStops(-25, 40);
    expect(stops[0].color).toBe(bandForTemperature(40).color);
    expect(stops[stops.length - 1].color).toBe(bandForTemperature(-25).color);
  });

  it("handles a flat series (min === max) without dividing by zero", () => {
    const stops = buildGradientStops(10, 10);
    expect(stops[0].offset).toBe(0);
    expect(stops[stops.length - 1].offset).toBe(100);
    for (const stop of stops) {
      expect(stop.color).toBe(bandForTemperature(10).color);
    }
  });
});
