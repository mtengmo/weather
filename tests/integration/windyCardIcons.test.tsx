import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import TodaySummaryCard from "../../src/components/TodaySummaryCard";
import WeeklyForecastStrip from "../../src/components/WeeklyForecastStrip";
import { WEATHER_TYPE_ARTWORK } from "../../src/components/smhiSymbolIcons";
import type { DailyAggregate } from "../../src/models/types";

const day: DailyAggregate = {
  bucketEnd: new Date(2026, 5, 15, 23, 59).toISOString(),
  high: 14,
  low: 6,
  average: 10,
  totalPrecipitation: 0,
  windAverage: 12,
  cloudAverage: 10,
  windHigh: 15,
  windLow: 8,
};
const location = { latitude: 59.33, longitude: 18.06 };

describe("windy icon choice on cards", () => {
  it("Weekly strip shows windy-clear art without a badge for a windy clear day", () => {
    const { container } = render(<WeeklyForecastStrip days={[day]} unit="metric" />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(WEATHER_TYPE_ARTWORK["windy-clear"]?.mild?.day);
    expect(container.querySelector(".wind-badge")).toBeNull();
  });

  it("Weekly strip badges a windy snowy day (no windy snow art)", () => {
    const snowy = { ...day, average: -10, high: -5, low: -15, totalPrecipitation: 5 };
    const { container } = render(<WeeklyForecastStrip days={[snowy]} unit="metric" />);
    expect(container.querySelectorAll(".wind-badge")).toHaveLength(1);
  });

  it("Today card follows the nearest observation's wind, not the day's average", () => {
    const common = { today: day, unit: "metric" as const, location, currentTemperature: 10, currentCondition: "clear-day" as const };
    const calm = render(<TodaySummaryCard {...common} currentWindSpeed={2} currentSkyCondition="clear-day" />);
    expect(calm.container.querySelector(".today-summary-icon img")?.getAttribute("src")).toBe(
      WEATHER_TYPE_ARTWORK.clear?.mild?.day
    );
    calm.unmount();
    const windy = render(<TodaySummaryCard {...common} currentWindSpeed={11} currentSkyCondition="clear-day" />);
    expect(windy.container.querySelector(".today-summary-icon img")?.getAttribute("src")).toBe(
      WEATHER_TYPE_ARTWORK["windy-clear"]?.mild?.day
    );
  });
});
