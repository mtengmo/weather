import { afterEach, describe, expect, it, vi } from "vitest";
import { getObservations } from "../../src/services/openMeteoProvider";

function isoHoursBack(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString().slice(0, 13) + ":00";
}

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

describe("openMeteoProvider.getObservations", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps hourly data and trims to the trailing 24 points for last-24-hours", async () => {
    const time = Array.from({ length: 30 }, (_, i) => isoHoursBack(29 - i));
    const temperature_2m = time.map((_, i) => i);
    const precipitation = time.map((_, i) => i * 0.1);

    mockFetchOnce({ hourly: { time, temperature_2m, precipitation } });

    const result = await getObservations({ latitude: 1, longitude: 2 }, "last-24-hours");

    expect(result.status).toBe("ready");
    expect(result.observations.length).toBeLessThanOrEqual(24);
    expect(result.observations.length).toBeGreaterThan(0);
  });

  it("preserves null values as gaps instead of coercing to zero", async () => {
    const time = [isoHoursBack(2), isoHoursBack(1), isoHoursBack(0)];
    mockFetchOnce({
      hourly: { time, temperature_2m: [10, null, 12], precipitation: [0, null, 1] },
    });

    const result = await getObservations({ latitude: 1, longitude: 2 }, "last-24-hours");

    const gapPoint = result.observations.find((o) => o.temperature === null);
    expect(gapPoint).toBeDefined();
    expect(gapPoint?.precipitation).toBeNull();
  });

  it("returns status unavailable on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await getObservations({ latitude: 1, longitude: 2 }, "last-24-hours");

    expect(result.status).toBe("unavailable");
    expect(result.observations).toEqual([]);
  });

  it("returns status unavailable on a non-ok response", async () => {
    mockFetchOnce({}, false);

    const result = await getObservations({ latitude: 1, longitude: 2 }, "last-7-days");

    expect(result.status).toBe("unavailable");
  });
});
