import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCachedLocation, setCachedLocation } from "../../src/services/locationCache";
import type { Location } from "../../src/models/types";

const stockholm: Location = {
  latitude: 59.33,
  longitude: 18.06,
  displayName: "Stockholm",
  source: "favorite",
};

describe("locationCache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips a location through set then get", () => {
    setCachedLocation(stockholm);
    expect(getCachedLocation()).toEqual(stockholm);
  });

  it("returns null when nothing is stored", () => {
    expect(getCachedLocation()).toBeNull();
  });

  it("returns null when the stored value is malformed JSON", () => {
    localStorage.setItem("weather-app:last-location:v1", "{not json");
    expect(getCachedLocation()).toBeNull();
  });

  it("returns null when the stored value doesn't match the Location shape", () => {
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify({ foo: "bar" }));
    expect(getCachedLocation()).toBeNull();
  });

  it("returns null when localStorage.getItem throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {},
    });
    expect(getCachedLocation()).toBeNull();
  });

  it("does not throw when localStorage.setItem throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => setCachedLocation(stockholm)).not.toThrow();
  });
});
