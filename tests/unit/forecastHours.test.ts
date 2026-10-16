import { describe, expect, it } from "vitest";
import { forecastHoursFor } from "../../src/services/forecastHours";

const BASE = { "last-24-hours": 24, "last-7-days": 168, "last-30-days": 0 } as const;

describe("forecastHoursFor (extended 48h hourly forecast)", () => {
  it("keeps the default reach when not extended", () => {
    expect(forecastHoursFor(BASE, "last-24-hours", false)).toBe(24);
  });
  it("extends only the 24-hour window to 48 hours", () => {
    expect(forecastHoursFor(BASE, "last-24-hours", true)).toBe(48);
    expect(forecastHoursFor(BASE, "last-7-days", true)).toBe(168);
    expect(forecastHoursFor(BASE, "last-30-days", true)).toBe(0);
  });
});
