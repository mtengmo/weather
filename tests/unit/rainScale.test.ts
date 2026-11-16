import { describe, expect, it } from "vitest";
import { rainBar, toMm } from "../../src/services/rainScale";

describe("rainBar", () => {
  it("24h: linear against 5 mm/h, overflow only above it", () => {
    expect(rainBar(1, "last-24-hours").heightPercent).toBeCloseTo(20);
    expect(rainBar(0.7, "last-24-hours").heightPercent).toBeCloseTo(14);
    expect(rainBar(5, "last-24-hours")).toMatchObject({ heightPercent: 100, overflow: false });
    expect(rainBar(8, "last-24-hours")).toMatchObject({ heightPercent: 100, overflow: true });
  });

  it("3-day: normalises by bucket length so steady rain looks the same", () => {
    const night = rainBar(9, "last-3-days", 9);
    const lunch = rainBar(2, "last-3-days", 2);
    expect(night.heightPercent).toBeCloseTo(40);
    expect(lunch.heightPercent).toBeCloseTo(40);
    expect(night.ratePerHour).toBeCloseTo(1);
    expect(rainBar(30, "last-3-days", 9).overflow).toBe(true);
  });

  it("7-day: linear against 20 mm per day", () => {
    expect(rainBar(10, "last-7-days").heightPercent).toBeCloseTo(50);
    expect(rainBar(25, "last-7-days")).toMatchObject({ heightPercent: 100, overflow: true });
  });

  it("flags exactly zero rain as dry", () => {
    expect(rainBar(0, "last-24-hours")).toMatchObject({ dry: true, heightPercent: 0, overflow: false });
    expect(rainBar(0.1, "last-24-hours").dry).toBe(false);
  });

  it("converts inches back to mm", () => {
    expect(toMm(1, "in")).toBeCloseTo(25.4);
    expect(toMm(3, "mm")).toBe(3);
  });
});
