import { beforeEach, describe, expect, it } from "vitest";
import {
  getNearbyStationCountPreference,
  setNearbyStationCountPreference,
} from "../../src/services/nearbyStationCount";

describe("nearbyStationCount service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to 4 when no preference is stored", () => {
    expect(getNearbyStationCountPreference()).toBe(4);
  });

  it("persists a manual selection and returns it on next read", () => {
    setNearbyStationCountPreference(2);
    expect(getNearbyStationCountPreference()).toBe(2);
  });

  it("persists a selection of 0", () => {
    setNearbyStationCountPreference(0);
    expect(getNearbyStationCountPreference()).toBe(0);
  });

  it("falls back to 4 for an invalid/out-of-range stored value (e.g. a stale 5)", () => {
    localStorage.setItem("weather-app:nearby-station-count:v1", "5");
    expect(getNearbyStationCountPreference()).toBe(4);
  });

  it("falls back to 4 for a non-numeric stored value", () => {
    localStorage.setItem("weather-app:nearby-station-count:v1", "not-a-number");
    expect(getNearbyStationCountPreference()).toBe(4);
  });
});
