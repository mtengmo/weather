import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatWeekdayDay } from "../../src/services/timeFormat";
import { buildDailyTimelineData } from "../../src/components/timelineData";
import { toCalendarDayAggregates } from "../../src/services/dailyAggregation";
import type { ObservationSeries, WeatherObservation } from "../../src/models/types";

// All dates are built from local-clock components, so these tests hold in any timezone.
// "Now" is 2026-10-17 08:10 local; today's column therefore spans local midnight 17 Oct to 18 Oct.
const NOW = new Date(2026, 9, 17, 8, 10).getTime();
const LOCATION = { latitude: 59.33, longitude: 18.07, displayName: "Stockholm", source: "favorite" as const };
const FRACTION_OF_TODAY_ELAPSED = (8 * 60 + 10) / (24 * 60);

function localMidnight(dayOffsetFromToday: number): number {
  return new Date(2026, 9, 17 + dayOffsetFromToday).getTime();
}

function atLocal(dayOffsetFromToday: number, hour: number, minute = 0): string {
  return new Date(2026, 9, 17 + dayOffsetFromToday, hour, minute).toISOString();
}

function obs(partial: Partial<WeatherObservation> & { timestamp: string }): WeatherObservation {
  return {
    temperature: null,
    precipitation: null,
    windSpeed: null,
    cloudCoverPercent: null,
    ...partial,
  };
}

function series(observations: WeatherObservation[]): ObservationSeries {
  return { location: LOCATION, window: "last-7-days", observations, status: "ready" };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("toCalendarDayAggregates", () => {
  it("returns dayCount-1 past days plus today when there is no data beyond today", () => {
    const days = toCalendarDayAggregates([], 7, NOW);

    expect(days).toHaveLength(7);
    // First column is six days before today; its bucketEnd is the following local midnight.
    expect(days[0].bucketEnd).toBe(new Date(localMidnight(-5)).toISOString());
    // Last column is today; its bucketEnd is tomorrow's local midnight.
    expect(days[6].bucketEnd).toBe(new Date(localMidnight(1)).toISOString());
  });

  it("produces contiguous columns, each starting at the previous column's bucketEnd", () => {
    const days = toCalendarDayAggregates([], 7, NOW);
    for (let i = 1; i < days.length; i++) {
      expect(days[i].bucketEnd).toBe(new Date(localMidnight(i - 5)).toISOString());
    }
  });

  it("does not flag today as forecast even when it holds forecast readings later in the day", () => {
    const days = toCalendarDayAggregates(
      [
        obs({ timestamp: atLocal(0, 6), temperature: 4 }), // observed
        obs({ timestamp: atLocal(0, 15), temperature: 12 }), // still to come today
      ],
      7,
      NOW
    );

    const today = days[6];
    expect(today.isForecast).toBeUndefined();
    expect(today.high).toBe(12);
    expect(today.low).toBe(4);
  });

  it("flags the next day (starting at local midnight) as forecast and extends only as far as the data reaches", () => {
    const days = toCalendarDayAggregates(
      [obs({ timestamp: atLocal(1, 12), temperature: 9 })],
      7,
      NOW
    );

    expect(days).toHaveLength(8); // six past days, today, tomorrow
    expect(days[6].isForecast).toBeUndefined();
    expect(days[7].isForecast).toBe(true);
    expect(days[7].high).toBe(9);
  });

  it("assigns a reading exactly at tomorrow's local midnight to tomorrow, not today", () => {
    const days = toCalendarDayAggregates(
      [obs({ timestamp: atLocal(1, 0, 0), temperature: 7 })],
      7,
      NOW
    );

    expect(days[6].high).toBeNull();
    expect(days[7].high).toBe(7);
    expect(days[7].isForecast).toBe(true);
  });

  it("assigns readings to the local calendar day they fall on, including the last minute of a day", () => {
    const days = toCalendarDayAggregates(
      [
        obs({ timestamp: atLocal(-1, 23, 59), temperature: 3 }),
        obs({ timestamp: atLocal(0, 0, 0), temperature: 5 }),
      ],
      7,
      NOW
    );

    expect(days[5].high).toBe(3); // yesterday
    expect(days[6].high).toBe(5); // today
    expect(days[5].isForecast).toBeUndefined();
  });

  it("aggregates past-day readings and never flags observed days as forecast", () => {
    const days = toCalendarDayAggregates(
      [
        obs({ timestamp: atLocal(-2, 7), temperature: 10, precipitation: 1 }),
        obs({ timestamp: atLocal(-2, 8), temperature: 10, precipitation: 0.5 }),
        obs({ timestamp: atLocal(-2, 12), temperature: 15, precipitation: 0 }),
      ],
      7,
      NOW
    );

    const twoDaysAgo = days[4];
    expect(twoDaysAgo.totalPrecipitation).toBeCloseTo(1.5);
    expect(twoDaysAgo.high).toBe(15);
    expect(twoDaysAgo.low).toBe(10);
    expect(days.slice(0, 6).some((d) => d.isForecast)).toBe(false);
  });

  it("never fabricates forecast days beyond the data's reach", () => {
    const days = toCalendarDayAggregates(
      [obs({ timestamp: atLocal(0, 20), temperature: 6 })],
      7,
      NOW
    );
    expect(days).toHaveLength(7);
    expect(days.some((d) => d.isForecast)).toBe(false);
  });
});

describe("buildDailyTimelineData now-position fields (fixed clock 2026-10-17 08:10 local)", () => {
  // One observed reading today and one forecast reading tomorrow, so the timeline has
  // 6 past days + today + tomorrow = 8 columns, and today sits at index 6.
  const FORECAST_SERIES = series([
    obs({ timestamp: atLocal(-1, 12), temperature: 11 }),
    obs({ timestamp: atLocal(0, 7), temperature: 4 }),
    obs({ timestamp: atLocal(1, 12), temperature: 9 }),
  ]);

  it("places the now marker at (todayIndex + fraction of today elapsed) / columnCount", () => {
    const data = buildDailyTimelineData(FORECAST_SERIES, "metric");

    expect(data.periods).toHaveLength(8);
    expect(data.nowColumnIndex).toBe(6);
    expect(data.nowBoundaryIndex).toBe(6);
    expect(data.nowPosition).toBeCloseTo((6 + FRACTION_OF_TODAY_ELAPSED) / 8, 10);
    expect(FRACTION_OF_TODAY_ELAPSED).toBeCloseTo(0.34, 2);
  });

  it("does not flag today as a forecast column but does flag tomorrow", () => {
    const data = buildDailyTimelineData(FORECAST_SERIES, "metric");

    expect(data.periods[6].isForecast).toBe(false);
    expect(data.periods[7].isForecast).toBe(true);
  });

  it("labels each column by its own calendar date", () => {
    const data = buildDailyTimelineData(FORECAST_SERIES, "metric");
    const expectedLabel = (dayOffset: number) =>
      formatWeekdayDay(new Date(localMidnight(dayOffset) + 12 * 3600_000));

    expect(data.periods[6].label).toBe(expectedLabel(0));
    expect(data.periods[7].label).toBe(expectedLabel(1));
  });
});
