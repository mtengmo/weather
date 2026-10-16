import { describe, expect, it } from "vitest";
import { build3DayTimelineData } from "../../src/components/timelineData";
import type { ObservationSeries } from "../../src/models/types";

describe("3-day view time-range sub-labels", () => {
  it("shows ranges derived from SUB_DAY_PERIODS, with the first Morning widened to 00-11", () => {
    const series: ObservationSeries = {
      location: { latitude: 59, longitude: 18, displayName: "X", source: "favorite" },
      window: "last-7-days",
      status: "ready",
      observations: [
        { timestamp: new Date(Date.now() - 3600_000).toISOString(), temperature: 5, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
      ],
    };
    const { periods } = build3DayTimelineData(series, "metric");
    expect(periods.slice(0, 5).map((p) => p.subLabel)).toEqual([
      "00–11",
      "11–13",
      "13–17",
      "17–21",
      "21–06",
    ]);
    expect(periods[5].subLabel).toBe("06–11");
    expect(periods.slice(0, 5).map((p) => p.label)).toEqual(["Morning", "Lunch", "Afternoon", "Evening", "Night"]);
  });
});
