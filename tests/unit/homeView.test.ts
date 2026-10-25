import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getHomeViewPreference, setHomeViewPreference } from "../../src/services/homeView";

describe("home view preference", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("defaults to overview", () => {
    expect(getHomeViewPreference()).toBe("overview");
  });

  it("round-trips sea and overview", () => {
    setHomeViewPreference("sea");
    expect(getHomeViewPreference()).toBe("sea");
    setHomeViewPreference("overview");
    expect(getHomeViewPreference()).toBe("overview");
  });

  it("ignores an invalid stored value", () => {
    localStorage.setItem("weather-app:last-home-view:v1", "map");
    expect(getHomeViewPreference()).toBe("overview");
  });

  it("does not throw when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => setHomeViewPreference("sea")).not.toThrow();
    expect(getHomeViewPreference()).toBe("overview");
  });
});
