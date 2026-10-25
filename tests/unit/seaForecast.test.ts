import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMarineForecast } from "../../src/services/seaForecast";

function mockFetch(body: unknown, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

const body = (unit = "m/s") => ({
  hourly_units: { ocean_current_velocity: unit },
  hourly: {
    time: [1000, 2000],
    wave_height: [1.5, null],
    wave_direction: [200, 210],
    wave_period: [5, 6],
    wind_wave_height: [0.5, 0.6],
    swell_wave_height: [1, null],
    swell_wave_direction: [180, 190],
    swell_wave_period: [8, 9],
    sea_surface_temperature: [12, 13],
    sea_level_height_msl: [0.2, -0.1],
    ocean_current_velocity: [3.6, 7.2],
    ocean_current_direction: [90, 100],
  },
});

describe("fetchMarineForecast", () => {
  it("requests all variables with the expected params", async () => {
    const f = mockFetch(body());
    await fetchMarineForecast(59, 18);
    const url = decodeURIComponent(String(f.mock.calls[0][0]));
    for (const v of [
      "wave_height", "wave_direction", "wave_period", "wind_wave_height", "swell_wave_height",
      "swell_wave_direction", "swell_wave_period", "sea_surface_temperature", "sea_level_height_msl",
      "ocean_current_velocity", "ocean_current_direction",
    ]) expect(url).toContain(v);
    expect(url).toContain("cell_selection=sea");
    expect(url).toContain("past_days=7");
    expect(url).toContain("forecast_days=7");
    expect(url).toContain("timeformat=unixtime");
  });

  it("maps fields, converts time and sea level, keeps nulls", async () => {
    mockFetch(body());
    const { hours } = await fetchMarineForecast(59, 18);
    expect(hours).toHaveLength(2);
    expect(hours[0].time).toBe(1_000_000);
    expect(hours[0].seaLevelCm).toBeCloseTo(20);
    expect(hours[1].seaLevelCm).toBeCloseTo(-10);
    expect(hours[0].waveHeight).toBe(1.5);
    expect(hours[1].waveHeight).toBeNull();
    expect(hours[1].swellWaveHeight).toBeNull();
    expect(hours[1].windWaveHeight).toBe(0.6);
  });

  it("converts current velocity by unit", async () => {
    mockFetch(body("km/h"));
    expect((await fetchMarineForecast(0, 0)).hours[0].currentSpeed).toBeCloseTo(1);
    mockFetch(body("kn"));
    expect((await fetchMarineForecast(0, 0)).hours[0].currentSpeed).toBeCloseTo(3.6 * 0.5144);
    mockFetch(body("m/s"));
    expect((await fetchMarineForecast(0, 0)).hours[0].currentSpeed).toBe(3.6);
  });

  it("returns nulls for missing series and empty hours for missing hourly", async () => {
    mockFetch({ hourly: { time: [1] } });
    expect((await fetchMarineForecast(0, 0)).hours[0].waveHeight).toBeNull();
    mockFetch({});
    expect((await fetchMarineForecast(0, 0)).hours).toEqual([]);
  });

  it("throws on non-OK", async () => {
    mockFetch({}, false, 500);
    await expect(fetchMarineForecast(0, 0)).rejects.toThrow("500");
  });
});
