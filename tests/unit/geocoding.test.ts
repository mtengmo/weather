import { afterEach, describe, expect, it, vi } from "vitest";
import { reverseGeocode } from "../../src/services/geocoding";

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
