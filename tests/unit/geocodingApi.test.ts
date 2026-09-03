import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchPlaces } from "../../src/services/geocodingApi";

function mockFetchOnce(results: Record<string, unknown>[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results }),
    })
  );
}

describe("geocodingApi.searchPlaces (014-dashboard-usability-fixes, US6)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ranks Nordic results before non-Nordic results", async () => {
    mockFetchOnce([
      { latitude: 1, longitude: 1, name: "Springfield", country: "United States", country_code: "US" },
      { latitude: 2, longitude: 2, name: "Stockholm", country: "Sweden", country_code: "SE" },
      { latitude: 3, longitude: 3, name: "Oslo", country: "Norway", country_code: "NO" },
    ]);

    const results = await searchPlaces("place");

    expect(results.map((r) => r.displayName)).toEqual([
      "Stockholm, Sweden",
      "Oslo, Norway",
      "Springfield, United States",
    ]);
  });

  it("keeps every non-Nordic result when no Nordic result exists", async () => {
    mockFetchOnce([
      { latitude: 1, longitude: 1, name: "Paris", country: "France", country_code: "FR" },
      { latitude: 2, longitude: 2, name: "Berlin", country: "Germany", country_code: "DE" },
    ]);

    const results = await searchPlaces("place");

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.displayName)).toEqual(["Paris, France", "Berlin, Germany"]);
  });

  it("preserves relative order within the Nordic and non-Nordic groups", async () => {
    mockFetchOnce([
      { latitude: 1, longitude: 1, name: "A", country: "X", country_code: "XX" },
      { latitude: 2, longitude: 2, name: "B", country: "Denmark", country_code: "DK" },
      { latitude: 3, longitude: 3, name: "C", country: "Y", country_code: "YY" },
      { latitude: 4, longitude: 4, name: "D", country: "Iceland", country_code: "IS" },
    ]);

    const results = await searchPlaces("place");

    expect(results.map((r) => r.displayName)).toEqual(["B, Denmark", "D, Iceland", "A, X", "C, Y"]);
  });
});
