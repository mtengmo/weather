import { beforeEach, describe, expect, it } from "vitest";
import {
  getNearbyStationCountPreference,
  setNearbyStationCountPreference,
} from "../../src/services/nearbyStationCount";

describe("nearbyStationCount service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to 0 when no preference is stored (037-header-controls-and-chart-fixes, US5)", () => {
    expect(getNearbyStationCountPreference()).toBe(0);
  });

  it("persists a manual selection and returns it on next read", () => {
    setNearbyStationCountPreference(2);
    expect(getNearbyStationCountPreference()).toBe(2);
  });

  it("persists a selection of 0", () => {
    setNearbyStationCountPreference(0);
    expect(getNearbyStationCountPreference()).toBe(0);
  });

  it("falls back to 0 for an invalid/out-of-range stored value (e.g. a stale 5)", () => {
    localStorage.setItem("weather-app:nearby-station-count:v1", "5");
    expect(getNearbyStationCountPreference()).toBe(0);
  });

  it("falls back to 0 for a non-numeric stored value", () => {
    localStorage.setItem("weather-app:nearby-station-count:v1", "not-a-number");
    expect(getNearbyStationCountPreference()).toBe(0);
  });
});
