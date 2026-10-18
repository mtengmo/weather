import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../src/i18n";
import {
  placeNameCacheKey,
  resetGeocodingThrottleForTests,
  reverseGeocode,
} from "../../src/services/geocoding";

function mockFetchOnce(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      json: async () => body,
    })
  );
}

describe("geocoding.reverseGeocode (006-forecast-now-marker)", () => {
  beforeEach(() => {
    localStorage.clear();
    resetGeocodingThrottleForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the city field's value when present", async () => {
    mockFetchOnce({ address: { city: "Stockholm", county: "Stockholms län" } });

    const result = await reverseGeocode({ latitude: 59.33, longitude: 18.06 });

    expect(result).toBe("Stockholm");
  });

  it("falls through the field-preference order when more-specific fields are absent", async () => {
    mockFetchOnce({ address: { county: "Stockholms län" } });

    const result = await reverseGeocode({ latitude: 59.33, longitude: 18.06 });

    expect(result).toBe("Stockholms län");
  });

  it("prefers town over suburb when both are present, per the field-preference order", async () => {
    mockFetchOnce({ address: { suburb: "Klara", town: "Nacka" } });

    const result = await reverseGeocode({ latitude: 1, longitude: 1 });

    expect(result).toBe("Nacka");
  });

  it("returns null on a non-ok response", async () => {
    mockFetchOnce({}, false);

    const result = await reverseGeocode({ latitude: 1, longitude: 1 });

    expect(result).toBeNull();
  });

  it("returns null on a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await reverseGeocode({ latitude: 1, longitude: 1 });

    expect(result).toBeNull();
  });

  it("returns null when the response has no address object", async () => {
    mockFetchOnce({});

    const result = await reverseGeocode({ latitude: 1, longitude: 1 });

    expect(result).toBeNull();
  });

  it("returns null when the address object has none of the recognized fields", async () => {
    mockFetchOnce({ address: { road: "Some Street" } });

    const result = await reverseGeocode({ latitude: 1, longitude: 1 });

    expect(result).toBeNull();
  });

  it("sends a descriptive User-Agent header", async () => {
    mockFetchOnce({ address: { city: "Stockholm" } });

    await reverseGeocode({ latitude: 1, longitude: 1 });

    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    expect((requestInit?.headers as Record<string, string>)["User-Agent"]).toBeTruthy();
  });
});

describe("geocoding place-name cache", () => {
  const uppsala = { latitude: 59.8429669, longitude: 17.6305465 };

  beforeEach(async () => {
    localStorage.clear();
    resetGeocodingThrottleForTests();
    await i18n.changeLanguage("en");
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
    await i18n.changeLanguage("en");
  });

  it("sends zoom=10 and the app language as accept-language", async () => {
    await i18n.changeLanguage("sv");
    mockFetchOnce({ address: { city: "Uppsala" } });

    await reverseGeocode(uppsala);

    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url).toContain("zoom=10");
    expect(url).toContain("accept-language=sv");
  });

  it("a cache hit avoids the network", async () => {
    mockFetchOnce({ address: { city: "Uppsala" } });
    expect(await reverseGeocode(uppsala)).toBe("Uppsala");

    mockFetchOnce({ address: { city: "Other" } });
    // 3-decimal rounding: a few metres away is the same key.
    expect(await reverseGeocode({ latitude: 59.8429, longitude: 17.6305 })).toBe("Uppsala");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("expires entries after 30 days", async () => {
    mockFetchOnce({ address: { city: "Uppsala" } });
    await reverseGeocode(uppsala);
    const key = placeNameCacheKey(uppsala, "en");
    const entry = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...entry, savedAt: Date.now() - 31 * 24 * 3600_000 }));
    resetGeocodingThrottleForTests();

    mockFetchOnce({ address: { city: "Uppsala kommun" } });
    expect(await reverseGeocode(uppsala)).toBe("Uppsala kommun");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("keys by language", async () => {
    mockFetchOnce({ address: { city: "Gothenburg" } });
    await reverseGeocode(uppsala);
    await i18n.changeLanguage("sv");
    resetGeocodingThrottleForTests();

    mockFetchOnce({ address: { city: "Göteborg" } });
    expect(await reverseGeocode(uppsala)).toBe("Göteborg");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(placeNameCacheKey(uppsala, "en")).not.toBe(placeNameCacheKey(uppsala, "sv"));
  });

  it("never persists a placeholder or failure", async () => {
    mockFetchOnce({ address: { city: "Unnamed station" } });
    expect(await reverseGeocode(uppsala)).toBeNull();
    mockFetchOnce({}, false);
    resetGeocodingThrottleForTests();
    expect(await reverseGeocode(uppsala)).toBeNull();
    expect(localStorage.getItem(placeNameCacheKey(uppsala, "en"))).toBeNull();
  });

  it("works when storage is blocked and logs failures", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    mockFetchOnce({ address: { city: "Uppsala" } });
    expect(await reverseGeocode(uppsala)).toBe("Uppsala");

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    resetGeocodingThrottleForTests();
    expect(await reverseGeocode(uppsala)).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("spaces consecutive network calls by at least 1.1 s", async () => {
    vi.useFakeTimers();
    mockFetchOnce({ address: { city: "A" } });
    await reverseGeocode({ latitude: 1, longitude: 1 });
    const second = reverseGeocode({ latitude: 2, longitude: 2 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(200);
    await second;
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
