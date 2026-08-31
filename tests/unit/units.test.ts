import { describe, expect, it, beforeEach } from "vitest";
import {
  convertPrecipitation,
  convertTemperature,
  convertWindSpeed,
  getUnitPreference,
  setUnitPreference,
} from "../../src/services/units";

describe("convertTemperature / convertPrecipitation", () => {
  it("passes null through unchanged (gap preservation)", () => {
    expect(convertTemperature(null, "imperial")).toBeNull();
    expect(convertPrecipitation(null, "imperial")).toBeNull();
  });

  it("converts celsius to fahrenheit correctly", () => {
    expect(convertTemperature(0, "imperial")).toBeCloseTo(32);
    expect(convertTemperature(100, "imperial")).toBeCloseTo(212);
  });

  it("is identity for metric", () => {
    expect(convertTemperature(21, "metric")).toBe(21);
    expect(convertPrecipitation(5, "metric")).toBe(5);
  });

  it("converts mm to inches correctly", () => {
    expect(convertPrecipitation(25.4, "imperial")).toBeCloseTo(1);
  });
});

describe("convertWindSpeed", () => {
  it("passes null through unchanged (gap preservation)", () => {
    expect(convertWindSpeed(null, "imperial")).toBeNull();
  });

  it("is identity for metric", () => {
    expect(convertWindSpeed(5, "metric")).toBe(5);
  });

  it("converts m/s to mph correctly", () => {
    expect(convertWindSpeed(10, "imperial")).toBeCloseTo(22.3694);
  });
});

describe("unit preference persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to metric regardless of locale when nothing is stored (User Story 6)", () => {
    // Fixed metric default (research.md §7 of 003-extended-history-metrics) — this no
    // longer reads navigator.language at all, so a US-like environment stays metric.
    expect(getUnitPreference()).toBe("metric");
  });

  it("persists a manual override and returns it on next read", () => {
    setUnitPreference("imperial");
    expect(getUnitPreference()).toBe("imperial");
  });
});
