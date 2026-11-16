import { describe, expect, it } from "vitest";
import { rainBar, toMm } from "../../src/services/rainScale";

describe("rainBar", () => {
  it("24h: linear against 4 mm/h with SMHI-anchored classes", () => {
    expect(rainBar(1, "last-24-hours").heightPercent).toBeCloseTo(25);
    expect(rainBar(0.7, "last-24-hours")).toMatchObject({ level: 2, overflow: false });
    expect(rainBar(0.5, "last-24-hours").level).toBe(2);
    expect(rainBar(0.4, "last-24-hours").level).toBe(1);
    expect(rainBar(4, "last-24-hours")).toMatchObject({ heightPercent: 100, overflow: false, level: 3 });
    expect(rainBar(6, "last-24-hours")).toMatchObject({ heightPercent: 100, overflow: true, level: 3 });
    expect(rainBar(10, "last-24-hours").level).toBe(4);
  });

  it("3-day: normalises by bucket length so steady rain looks the same", () => {
    const night = rainBar(9, "last-3-days", 9);
    const lunch = rainBar(2, "last-3-days", 2);
    expect(night.heightPercent).toBeCloseTo(50);
    expect(lunch.heightPercent).toBeCloseTo(50);
    expect(night.ratePerHour).toBeCloseTo(1);
    expect(rainBar(36, "last-3-days", 9)).toMatchObject({ level: 4, overflow: true });
  });

  it("7-day: linear against 20 mm per day, class 4 from 35 mm", () => {
    expect(rainBar(10, "last-7-days")).toMatchObject({ heightPercent: 50, level: 3 });
    expect(rainBar(25, "last-7-days")).toMatchObject({ heightPercent: 100, overflow: true, level: 3 });
    expect(rainBar(35, "last-7-days").level).toBe(4);
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
