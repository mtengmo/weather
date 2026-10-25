import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  aggregateIntoPeriods,
  buildSeaRows,
  circularMean,
  mergeObservedAndModel,
  summarizeSea,
  type MergedSea,
  type SeaSample,
} from "../../src/components/seaTimelineData";
import type { MarineHour } from "../../src/services/seaForecast";
import type { SeaObservation } from "../../src/services/seaObservations";
import type { TimelinePeriod } from "../../src/components/timelineData";
import type { WeatherObservation } from "../../src/models/types";

const H = 3_600_000;
const NOW = new Date(2026, 5, 15, 12, 0, 0).getTime();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(NOW) });
});
afterEach(() => {
  vi.useRealTimers();
});

function marine(time: number, over: Partial<MarineHour> = {}): MarineHour {
  return {
    time,
    waveHeight: null,
    waveDirection: null,
    wavePeriod: null,
    windWaveHeight: null,
    swellWaveHeight: null,
    swellWaveDirection: null,
    swellWavePeriod: null,
    seaTemperature: null,
    seaLevelCm: null,
    currentSpeed: null,
    currentDirection: null,
    ...over,
  };
}

function observation(metric: SeaObservation["metric"], points: [number, number][]): SeaObservation {
  return {
    metric,
    station: { key: "1", name: "Station", distanceKm: 5 },
    points: points.map(([time, value]) => ({ time, value })),
  };
}

function period(endMs: number, isForecast: boolean): TimelinePeriod {
  return {
    key: new Date(endMs).toISOString(),
    label: "",
    isForecast,
    condition: null,
    uvRisk: false,
    temperature: null,
    isNight: false,
  };
}

const empty: MergedSea = {
  waveHeight: [],
  wavePeriod: [],
  waveDirection: [],
  windWaveHeight: [],
  swellHeight: [],
  swellPeriod: [],
  swellDirection: [],
  seaTemperature: [],
  waterLevel: [],
  currentSpeed: [],
  currentDirection: [],
};

const s = (time: number, value: number, observed = false): SeaSample => ({ time, value, observed });

describe("circularMean", () => {
  it("wraps across north", () => {
    expect(circularMean([350, 10])).toBeCloseTo(0, 5);
  });
  it("averages ordinary angles", () => {
    expect(circularMean([80, 100])).toBeCloseTo(90, 5);
  });
});

describe("mergeObservedAndModel", () => {
  const hours = Array.from({ length: 9 }, (_, i) => NOW + (i - 4) * H); // 08:00 .. 16:00
  const model = hours.map((t) => marine(t, { seaLevelCm: 50, waveHeight: 1 }));

  it("lets SMHI win inside its range and the model fill before and after", () => {
    // Readings 10:00-12:00 every 20 minutes, value 10.
    const points: [number, number][] = [];
    for (let t = NOW - 2 * H; t <= NOW; t += H / 3) points.push([t, 10]);
    const merged = mergeObservedAndModel({ waterLevel: observation("waterLevel", points) }, model);

    const byTime = new Map(merged.waterLevel.map((x) => [x.time, x]));
    expect(byTime.get(NOW - 4 * H)).toMatchObject({ value: 50, observed: false });
    expect(byTime.get(NOW - 3 * H)).toMatchObject({ value: 50, observed: false });
    expect(byTime.get(NOW - 2 * H)).toMatchObject({ value: 10, observed: true });
    expect(byTime.get(NOW - H)).toMatchObject({ value: 10, observed: true });
    expect(byTime.get(NOW)).toMatchObject({ value: 10, observed: true });
    expect(byTime.get(NOW + H)).toMatchObject({ value: 50, observed: false });
    expect(merged.waterLevel.map((x) => x.time)).toEqual([...merged.waterLevel.map((x) => x.time)].sort((a, b) => a - b));
  });

  it("uses the nearest reading for each hour", () => {
    const merged = mergeObservedAndModel(
      { waterLevel: observation("waterLevel", [[NOW - 10 * 60_000, 1], [NOW + 20 * 60_000, 2], [NOW + 70 * 60_000, 3]]) },
      model
    );
    const at = (t: number) => merged.waterLevel.find((x) => x.time === t);
    expect(at(NOW)).toMatchObject({ value: 1, observed: true });
    expect(at(NOW + H)).toMatchObject({ value: 3, observed: true });
  });

  it("is model-only without observations and unobserved metrics stay model-only", () => {
    const merged = mergeObservedAndModel({}, model);
    expect(merged.waterLevel.every((x) => !x.observed)).toBe(true);
    expect(merged.waveHeight).toHaveLength(9);
    expect(merged.currentSpeed).toEqual([]);
  });

  it("uses observations alone when the model is unavailable", () => {
    const merged = mergeObservedAndModel({ seaTemperature: observation("seaTemperature", [[NOW, 12.5]]) }, []);
    expect(merged.seaTemperature).toEqual([{ time: NOW, value: 12.5, observed: true }]);
  });
});

describe("aggregateIntoPeriods", () => {
  it("hourly columns take the nearest sample within 30 minutes, else null", () => {
    const periods = [period(NOW, false), period(NOW + H, true), period(NOW + 2 * H, true)];
    const samples = [s(NOW + 20 * 60_000, 5), s(NOW + H + 29 * 60_000, 7)];
    const r = aggregateIntoPeriods(samples, periods, "mean");
    expect(r[0].value).toBe(5);
    expect(r[1].value).toBe(7); // 29 min away
    expect(r[2].value).toBeNull(); // 31 min away from the nearest sample
  });

  const sixHourly = (forecastFrom: number) =>
    [0, 1, 2, 3].map((i) => period(NOW + i * 6 * H, i >= forecastFrom));

  it("max / mean / circular mean over (previous key, own key]", () => {
    const periods = sixHourly(0);
    // First column covers (NOW-6h, NOW] because it takes the next column's 6 h span.
    const samples = [s(NOW - 5 * H, 1), s(NOW - H, 3), s(NOW + 2 * H, 2), s(NOW + 6 * H, 8)];
    expect(aggregateIntoPeriods(samples, periods, "max").map((x) => x.value)).toEqual([3, 8, null, null]);
    expect(aggregateIntoPeriods(samples, periods, "mean").map((x) => x.value)).toEqual([2, 5, null, null]);

    const dirs = [s(NOW + 2 * H, 350), s(NOW + 3 * H, 10)];
    const circ = aggregateIntoPeriods(dirs, periods, "circular");
    expect(circ[1].value).toBeCloseTo(0, 5);
  });

  it("does not reuse a 24 h fallback for the first column", () => {
    const periods = sixHourly(0);
    // 20 h before the first key would be inside a 24 h span but is outside a 6 h one.
    const r = aggregateIntoPeriods([s(NOW - 20 * H, 9)], periods, "max");
    expect(r[0].value).toBeNull();
  });

  it("flags model-only past columns as modelled, never forecast columns", () => {
    const periods = sixHourly(2);
    const samples = [
      s(NOW - 2 * H, 1, true),
      s(NOW - 1 * H, 1, false), // column 0: mixed
      s(NOW + 2 * H, 1, false), // column 1: past (isForecast false), model only
      s(NOW + 8 * H, 1, false), // column 2: forecast
    ];
    const r = aggregateIntoPeriods(samples, periods, "mean");
    expect(r.map((x) => x.modelled)).toEqual([false, true, false, false]);
  });

  it("flags a model-only past hourly column as modelled", () => {
    const r = aggregateIntoPeriods([s(NOW, 1, false)], [period(NOW, false), period(NOW + H, true)], "mean");
    expect(r[0].modelled).toBe(true);
  });
});

describe("buildSeaRows", () => {
  const periods = [period(NOW, false), period(NOW + H, true)];
  const merged: MergedSea = {
    ...empty,
    waveHeight: [s(NOW, 1.2), s(NOW + H, 2)],
    wavePeriod: [s(NOW, 5), s(NOW + H, 6)],
    waveDirection: [s(NOW, 200), s(NOW + H, 210)],
    swellHeight: [s(NOW, 0.5)],
    swellPeriod: [s(NOW, 9)],
    swellDirection: [s(NOW, 180)],
    seaTemperature: [s(NOW, 15, true)],
    waterLevel: [s(NOW, 12, true)],
  };

  it("builds metric rows with the right conventions", () => {
    const rows = buildSeaRows({ periods }, merged, "metric");
    expect(rows.waves).toMatchObject({ kind: "direction", unitLabel: "m", decimals: 1, directionConvention: "from", available: true });
    expect(rows.waves.points[0]).toMatchObject({ value: 1.2, period: 5, direction: 200, isForecast: false });
    expect(rows.waves.points[1].isForecast).toBe(true);
    expect(rows.swell.points[1].value).toBeNull();
    expect(rows.seaTemperature).toMatchObject({ kind: "line", unitLabel: "°C", decimals: 1 });
    expect(rows.seaTemperature.points[0]).toMatchObject({ value: 15, modelled: false });
    expect(rows.waterLevel).toMatchObject({ kind: "line", unitLabel: "cm", decimals: 0, signed: true });
    expect(rows.waves.points[0].modelled).toBe(true);
  });

  it("marks the current row unavailable when there is no data", () => {
    const rows = buildSeaRows({ periods }, merged, "metric");
    expect(rows.current.available).toBe(false);
    expect(rows.current.directionConvention).toBe("toward");
    const withCurrent = buildSeaRows(
      { periods },
      { ...merged, currentSpeed: [s(NOW, 0.4)], currentDirection: [s(NOW, 90)] },
      "metric"
    );
    expect(withCurrent.current.available).toBe(true);
    expect(withCurrent.current.points[0]).toMatchObject({ value: 0.4, direction: 90 });
  });

  it("converts to imperial units", () => {
    const rows = buildSeaRows(
      { periods },
      { ...merged, currentSpeed: [s(NOW, 1)], currentDirection: [s(NOW, 90)] },
      "imperial"
    );
    expect(rows.waves.unitLabel).toBe("ft");
    expect(rows.waves.points[0].value).toBeCloseTo(1.2 * 3.28084, 4);
    expect(rows.seaTemperature.unitLabel).toBe("°F");
    expect(rows.seaTemperature.points[0].value).toBeCloseTo(59, 4);
    expect(rows.waterLevel.unitLabel).toBe("in");
    expect(rows.waterLevel.points[0].value).toBeCloseTo(12 / 2.54, 4);
    expect(rows.current.unitLabel).toBe("mph");
    expect(rows.current.points[0].value).toBeCloseTo(2.23694, 4);
  });
});

describe("summarizeSea", () => {
  const weather = (hoursFromNow: number, over: Partial<WeatherObservation> = {}): WeatherObservation => ({
    timestamp: new Date(NOW + hoursFromNow * H).toISOString(),
    temperature: 10,
    precipitation: 0,
    windSpeed: 5,
    cloudCoverPercent: 0,
    windGust: 9,
    windDirection: 225,
    ...over,
  });

  it("prefers a fresh SMHI value and falls back to the model when it is stale", () => {
    const fresh = summarizeSea(
      { ...empty, seaTemperature: [s(NOW - 2 * H, 14, true), s(NOW, 13, false)], waterLevel: [s(NOW - H, 20, true)] },
      [],
      NOW
    );
    expect(fresh.seaTemperature).toEqual({ value: 14, observed: true, time: NOW - 2 * H });
    expect(fresh.waterLevel).toMatchObject({ value: 20, observed: true });

    const stale = summarizeSea(
      { ...empty, seaTemperature: [s(NOW - 4 * H, 14, true), s(NOW, 13, false)] },
      [],
      NOW
    );
    expect(stale.seaTemperature).toEqual({ value: 13, observed: false, time: NOW });
  });

  it("reads wind, waves, swell, current and next-24h extremes", () => {
    const sum = summarizeSea(
      {
        ...empty,
        waveHeight: [s(NOW, 1.2), s(NOW + 5 * H, 2.4), s(NOW + 30 * H, 5)],
        wavePeriod: [s(NOW, 5)],
        waveDirection: [s(NOW, 200)],
        windWaveHeight: [s(NOW, 0.8)],
        swellHeight: [s(NOW, 0.6)],
        swellPeriod: [s(NOW, 9)],
        swellDirection: [s(NOW, 180)],
        currentSpeed: [s(NOW, 0.3)],
        currentDirection: [s(NOW, 90)],
        waterLevel: [s(NOW, 4), s(NOW + 3 * H, -12), s(NOW + 8 * H, 30), s(NOW + 40 * H, 99)],
      },
      [weather(0), weather(4, { windGust: 14 }), weather(30, { windGust: 30 })],
      NOW
    );
    expect(sum.wind).toEqual({ speed: 5, gust: 9, direction: 225 });
    expect(sum.waves).toMatchObject({ height: 1.2, period: 5, direction: 200 });
    expect(sum.swell).toEqual({ height: 0.6, period: 9, direction: 180 });
    expect(sum.windWaveHeight).toBe(0.8);
    expect(sum.current).toEqual({ speed: 0.3, direction: 90 });
    expect(sum.next24h.maxWave).toEqual({ value: 2.4, time: NOW + 5 * H });
    expect(sum.next24h.maxGust).toEqual({ value: 14, time: NOW + 4 * H });
    expect(sum.next24h.waterLevelMin).toBe(-12);
    expect(sum.next24h.waterLevelMax).toBe(30);
  });

  it("returns nulls without data", () => {
    const sum = summarizeSea(empty, [], NOW);
    expect(sum.wind).toBeNull();
    expect(sum.waves).toBeNull();
    expect(sum.seaTemperature).toBeNull();
    expect(sum.next24h.maxWave).toBeNull();
    expect(sum.next24h.waterLevelMin).toBeNull();
  });
});
