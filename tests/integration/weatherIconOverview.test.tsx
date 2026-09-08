import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WeatherIconOverview from "../../src/components/WeatherIconOverview";
import { useObservationData } from "../../src/hooks/useObservationData";
import { sumCalendarDayPrecipitation } from "../../src/services/dailyAggregation";
import type { Location, ObservationWindow } from "../../src/models/types";

vi.mock("../../src/services/weatherApi", () => ({
  getObservations: vi.fn(),
  getNearbyStationSeries: vi.fn(),
  // Default to an empty array: getMultiSourceForecast is now always fetched, unconditionally
  // (020-dashboard-polish-round-five, US2 — no toggle to gate it), so every test needs a
  // resolvable default even if it never cares about multi-source data specifically.
  getMultiSourceForecast: vi.fn().mockResolvedValue([]),
  // Likewise always fetched, in its own independent effect (027-uv-index-alert) — default to an
  // empty Set so every existing test (which doesn't care about UV) keeps working unchanged.
  getUvRisk: vi.fn().mockResolvedValue(new Set()),
  getWarningsForLocation: vi.fn().mockResolvedValue([]),
}));

import {
  getMultiSourceForecast,
  getNearbyStationSeries,
  getObservations,
  getUvRisk,
} from "../../src/services/weatherApi";

const stockholm: Location = {
  latitude: 59.33,
  longitude: 18.06,
  displayName: "Stockholm",
  source: "favorite",
};

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3600_000).toISOString();
}

function hoursAgo(h: number): string {
  return hoursFromNow(-h);
}

function OverviewHarness({
  location,
  highLowVisible = false,
}: {
  location: Location;
  highLowVisible?: boolean;
}) {
  const [window, setWindow] = useState<ObservationWindow>("last-24-hours");
  const { series, multiSourceForecast, weeklySeries, uvRiskHours } = useObservationData(
    location,
    window,
    0,
    false
  );

  return (
    <WeatherIconOverview
      location={location}
      window={window}
      onWindowChange={setWindow}
      unit="metric"
      series={series}
      highLowVisible={highLowVisible}
      multiSourceForecast={multiSourceForecast}
      weeklySeries={weeklySeries}
      uvRiskHours={uvRiskHours}
    />
  );
}

describe("US1: synchronized 24h timeline", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("renders the condition, temperature, precipitation, and wind rows, distinguishing forecast and gap columns", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        {
          // Clear night hour, observed.
          timestamp: hoursAgo(1),
          temperature: 10,
          precipitation: 0,
          windSpeed: 1,
          cloudCoverPercent: 5,
        },
        {
          // Rainy hour, forecast.
          timestamp: hoursFromNow(1),
          temperature: 8,
          precipitation: 2,
          windSpeed: 3,
          cloudCoverPercent: 90,
          isForecast: true,
        },
        {
          // Data gap, forecast.
          timestamp: hoursFromNow(2),
          temperature: null,
          precipitation: null,
          windSpeed: null,
          cloudCoverPercent: null,
          isForecast: true,
        },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);

    await waitFor(() => expect(getObservations).toHaveBeenCalled());

    // Condition row: one icon per column, with a visible text label alongside the icon.
    expect(await screen.findByText("Clear")).toBeInTheDocument();
    expect(screen.getByText("Light rain")).toBeInTheDocument();
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.getAllByText("Forecast").length).toBeGreaterThan(0);

    // The other core rows all render (labels come from timelineData.ts row titles). No
    // cloud-cover row (009-timeline-polish-and-header, FR-005). Scoped to the sticky
    // row-title column since the persistent Today card (018-dashboard-visual-redesign) also
    // renders its own "Wind ..." text elsewhere on the page.
    expect(screen.getByText(/Temp/)).toBeInTheDocument();
    expect(screen.getByText(/Precipitation/)).toBeInTheDocument();
    expect(
      container.querySelector(".weather-timeline-row-wind .weather-timeline-row-title")
    ).toHaveTextContent(/^Wind/);
    expect(screen.queryByText(/Cloud cover/)).not.toBeInTheDocument();

    // Exactly one shared "now" line spans every row.
    expect(container.querySelectorAll(".weather-timeline-now")).toHaveLength(1);

    // The gap hour shows a visible break, not a fabricated value, in at least one row.
    expect(container.querySelectorAll(".weather-timeline-gap").length).toBeGreaterThan(0);
  });

  it("shows a moon icon (not sun) for a clear night hour", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        {
          timestamp: "2026-08-31T23:00:00",
          temperature: 10,
          precipitation: 0,
          windSpeed: 1,
          cloudCoverPercent: 5,
        },
      ],
    });

    // Query the icon itself (not the hour label's text) — toLocaleTimeString's hour
    // format is locale-dependent (e.g. "23" on this machine, "11 PM" on CI's Linux
    // runner), so asserting on that text broke the build in CI even though it passed
    // locally. The lucide icon's class name is stable regardless of locale.
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText("Clear");

    // lucide-react's per-icon class suffix has changed across versions (e.g. "lucide-moon"
    // vs. "lucide-moon-icon") — match by prefix so this doesn't break on a dependency bump.
    // Scoped to the hourly condition cell: the persistent Today card
    // (018-dashboard-visual-redesign) derives its own day-level condition (no timestamp, so
    // a clear day always renders as clear-day/sun per research.md §3) and legitimately shows
    // its own sun icon elsewhere on the page for this same clear series.
    const conditionCell = container.querySelector(".weather-timeline-condition");
    expect(conditionCell?.querySelector('svg[class*="lucide-moon"]')).toBeInTheDocument();
    expect(conditionCell?.querySelector('svg[class*="lucide-sun"]')).not.toBeInTheDocument();
  });

  it("shows the unavailable message rather than the timeline when the series status is unavailable", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "unavailable",
      observations: [],
    });

    render(<OverviewHarness location={stockholm} />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("lets the user switch to the 7-day window and back via the overview's own toggle", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: [],
    }));

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    // The overview's toggle never offers a 30-day option.
    expect(screen.queryByRole("button", { name: "Last 30 days" })).not.toBeInTheDocument();
  });
});

describe("US2: synchronized 7-day timeline", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("renders the same rows aligned to day columns when switched to the 7-day window", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [
              { timestamp: hoursAgo(1), temperature: 5, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
              { timestamp: hoursAgo(2), temperature: 15, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
            ]
          : [],
    }));

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    await waitFor(() => expect(container.querySelector(".weather-timeline")).toBeInTheDocument());
    expect(screen.getByText(/Temp/)).toBeInTheDocument();
    expect(container.querySelectorAll(".weather-timeline-row-grid").length).toBeGreaterThan(0);
  });

  it("shows a forecast day distinguished the same way as a forecast hour", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [
              {
                timestamp: hoursFromNow(25),
                temperature: 5,
                precipitation: 0,
                windSpeed: 1,
                cloudCoverPercent: 10,
              },
            ]
          : [],
    }));

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    const forecastLabels = await screen.findAllByText("Forecast");
    expect(forecastLabels.length).toBeGreaterThan(0);
  });
});

describe("7-day timeline fill width (014-dashboard-usability-fixes, US3)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [],
    });
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("uses the same timeline element/class on 24h and 7-day (037-header-controls-and-chart-fixes, US4 — fill-to-width is now a permanent base rule, not a conditional class, so all views size identically and match 24h's already-correct zoom behavior)", async () => {
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    expect(container.querySelector(".weather-timeline")).toBeInTheDocument();
    expect(container.querySelector(".weather-timeline-fill")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    expect(container.querySelector(".weather-timeline")).toBeInTheDocument();
    expect(container.querySelector(".weather-timeline-fill")).not.toBeInTheDocument();
  });
});

describe("High/Low on the Overview (014-dashboard-usability-fixes, US4)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows each day's high/low alongside the average when the toggle is on", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [
              { timestamp: hoursAgo(80), temperature: 5, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
              { timestamp: hoursAgo(73), temperature: 15, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
            ]
          : [],
    }));

    const user = userEvent.setup();
    render(<OverviewHarness location={stockholm} highLowVisible />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    expect(await screen.findByText(/H 15° \/ L 5°/)).toBeInTheDocument();
  });

  it("shows only the plain average when the toggle is off", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [
              { timestamp: hoursAgo(80), temperature: 5, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
              { timestamp: hoursAgo(73), temperature: 15, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
            ]
          : [],
    }));

    const user = userEvent.setup();
    render(<OverviewHarness location={stockholm} highLowVisible={false} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    await screen.findByText(/Temp/);
    expect(screen.queryByText(/H 15° \/ L 5°/)).not.toBeInTheDocument();
  });
});

describe("7-day view never mixes resolutions (015-overview-3day-resolution-fix, US1)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows no sub-day (Morning/Lunch/Afternoon/Evening/Night) labels on the 7-day view", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [{ timestamp: hoursAgo(1), temperature: 5, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 }]
          : [],
    }));

    const user = userEvent.setup();
    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    for (const label of ["Morning", "Lunch", "Afternoon", "Evening", "Night"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });
});

describe("3-day view (015-overview-3day-resolution-fix, US2)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("offers a 'Last 3 days' option alongside 24h and 7-day", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [],
    });

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    expect(screen.getByRole("button", { name: "3 Days" })).toBeInTheDocument();
  });

  it("shows sub-day columns, not full-day columns, when switched to the 3-day view", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [{ timestamp: hoursAgo(1), temperature: 5, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 }]
          : [],
    }));

    const user = userEvent.setup();
    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "3 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    expect((await screen.findAllByText("Morning")).length).toBeGreaterThan(0);
  });

  it("does not fetch again when switching between 'Last 3 days' and 'Last 7 days'", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: [],
    }));

    const user = userEvent.setup();
    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    const callsAfter7Day = vi.mocked(getObservations).mock.calls.length;

    await user.click(screen.getByRole("button", { name: "3 Days" }));
    await screen.findAllByText("Morning");
    await user.click(screen.getByRole("button", { name: "7 Days" }));

    expect(vi.mocked(getObservations).mock.calls.length).toBe(callsAfter7Day);
  });
});

describe("3-day view period-count regression guard (016-dashboard-polish-round-two, US1)", () => {
  // No reproduction of "only one day" was found during planning across every path tested here —
  // this locks in the currently-correct behavior so a future regression is caught immediately.
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  function multiDayForecastObservations() {
    // 3 days of hourly forecast, reaching well past the 3-day view's own horizon.
    return Array.from({ length: 24 * 4 }, (_, i) => ({
      timestamp: hoursFromNow(i + 1),
      temperature: 10,
      precipitation: 0,
      windSpeed: 1,
      cloudCoverPercent: 10,
      isForecast: true,
    }));
  }

  async function countTimePeriods(container: HTMLElement) {
    return (await waitFor(() => container.querySelectorAll(".weather-timeline-row-time .weather-timeline-cell")))
      .length;
  }

  it("shows all 30 sub-day columns on a direct 24h -> 3-day click (no intermediate 7-day visit)", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: w === "last-7-days" ? multiDayForecastObservations() : [],
    }));

    const user = userEvent.setup();
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    await user.click(screen.getByRole("button", { name: "3 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    await screen.findAllByText("Morning");

    // 3 past days (15 periods) + 3 forecast days (15, capped) — 026-fix-3-day follow-up.
    expect(await countTimePeriods(container)).toBe(30);
  });

  it("shows the correct column count across a full toggle sequence: 3-day -> 7-day -> 3-day -> 24h -> 3-day", async () => {
    const hourlyObservation = {
      timestamp: hoursAgo(1),
      temperature: 10,
      precipitation: 0,
      windSpeed: 1,
      cloudCoverPercent: 10,
    };
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: w === "last-7-days" ? multiDayForecastObservations() : [hourlyObservation],
    }));

    const user = userEvent.setup();
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    await user.click(screen.getByRole("button", { name: "3 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    expect(await countTimePeriods(container)).toBe(30);

    await user.click(screen.getByRole("button", { name: "7 Days" }));
    // 7 observed-window + 4 forecast days — unaffected by the forecast-reach cap
    // (019-dashboard-polish-round-four, US7) since 4 is under its 7-day max.
    expect(await countTimePeriods(container)).toBe(11);

    await user.click(screen.getByRole("button", { name: "3 Days" }));
    expect(await countTimePeriods(container)).toBe(30);

    await user.click(screen.getByRole("button", { name: "24 Hours" }));
    expect(await countTimePeriods(container)).toBe(1); // the single 24h-window observation

    await user.click(screen.getByRole("button", { name: "3 Days" }));
    expect(await countTimePeriods(container)).toBe(30);
  });

  it("shows the 3 past days' 15 columns when the location has no forecast data at all", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [{ timestamp: hoursAgo(1), temperature: 5, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 }]
          : [],
    }));

    const user = userEvent.setup();
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "3 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    await screen.findAllByText("Morning");

    // 3 past days x 5 periods, with no forward extension (026-fix-3-day follow-up).
    expect(await countTimePeriods(container)).toBe(15);
  });
});

describe("Always-averaged forecast sources on the Overview (020-dashboard-polish-round-five, US2)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getMultiSourceForecast).mockReset();
    vi.mocked(getMultiSourceForecast).mockResolvedValue([]);
  });

  it("shows the plain blended value with no '(avg)' annotation when 2+ sources have data (024-restore-rain-chance, US2 — footer alone discloses blending)", async () => {
    const t = hoursFromNow(1);
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: t, temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10, isForecast: true },
      ],
    });
    vi.mocked(getMultiSourceForecast).mockResolvedValue([
      { source: "smhi", observations: [{ timestamp: t, temperature: 8, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10, isForecast: true }] },
      { source: "open-meteo", observations: [{ timestamp: t, temperature: 12, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10, isForecast: true }] },
    ]);

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getMultiSourceForecast).toHaveBeenCalled());

    expect(await screen.findByText("10 °C")).toBeInTheDocument();
    expect(screen.queryByText(/\(avg/)).not.toBeInTheDocument();
    expect(screen.queryByText(/S 8°/)).not.toBeInTheDocument();
    expect(screen.queryByText(/O 12°/)).not.toBeInTheDocument();
  });

  it("shows no '(avg of N)' annotation when three sources have data for that period (024-restore-rain-chance, US2)", async () => {
    const t = hoursFromNow(1);
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: t, temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10, isForecast: true },
      ],
    });
    vi.mocked(getMultiSourceForecast).mockResolvedValue([
      { source: "smhi", observations: [{ timestamp: t, temperature: 9, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10, isForecast: true }] },
      { source: "open-meteo", observations: [{ timestamp: t, temperature: 12, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10, isForecast: true }] },
      { source: "met-no", observations: [{ timestamp: t, temperature: 15, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10, isForecast: true }] },
    ]);

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getMultiSourceForecast).toHaveBeenCalled());

    expect(await screen.findByText("12 °C")).toBeInTheDocument();
    expect(screen.queryByText(/\(avg/)).not.toBeInTheDocument();
  });

  it("shows the plain value when only one source has forecast data for that period", async () => {
    const t = hoursFromNow(1);
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: t, temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10, isForecast: true },
      ],
    });
    vi.mocked(getMultiSourceForecast).mockResolvedValue([
      { source: "smhi", observations: [{ timestamp: t, temperature: 8, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10, isForecast: true }] },
    ]);

    render(<OverviewHarness location={stockholm} />);
    await screen.findByText(/Temp/);

    expect(screen.queryByText(/\(avg\)/)).not.toBeInTheDocument();
  });
});

describe("Day-boundary marker (016-dashboard-polish-round-two, US3)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows a day-boundary marker between each pair of rendered days on the 3-day view", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [{ timestamp: hoursFromNow(24 * 3), temperature: 5, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10, isForecast: true }]
          : [],
    }));

    const user = userEvent.setup();
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "3 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    await screen.findAllByText("Morning");

    // 3 past days + 3 forecast days = 6 rendered days, so 5 boundaries between them
    // (026-fix-3-day follow-up).
    expect(container.querySelectorAll(".weather-timeline-day-boundary")).toHaveLength(5);
  });

  it("shows no day-boundary marker on the 7-day view", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: [],
    }));

    const user = userEvent.setup();
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    expect(container.querySelectorAll(".weather-timeline-day-boundary")).toHaveLength(0);
  });
});

describe("Weekday labels on the 3-day view (026-fix-3-day, US2)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows one non-empty weekday label per rendered day-group on the 3-day view", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [{ timestamp: hoursFromNow(24 * 3), temperature: 5, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10, isForecast: true }]
          : [],
    }));

    const user = userEvent.setup();
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "3 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    await screen.findAllByText("Morning");

    // 3 past days + 3 forecast days = 6 rendered day-groups (026-fix-3-day follow-up).
    const labels = Array.from(container.querySelectorAll(".weather-timeline-weekday-label"));
    expect(labels).toHaveLength(6);
    for (const label of labels) {
      expect(label.textContent).not.toBe("");
    }
  });

  it("shows no weekday-label row on the 24-hour or 7-day views", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: [],
    }));

    const user = userEvent.setup();
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    expect(container.querySelectorAll(".weather-timeline-weekday-label")).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    expect(container.querySelectorAll(".weather-timeline-weekday-label")).toHaveLength(0);
  });
});

describe("High/Low regression across all display modes (015-overview-3day-resolution-fix, US3)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows high/low on the 3-day view when the toggle is on", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? (() => {
              // Fixed at today's own Lunch period (11:00-13:00 local), minutes apart — not an
              // hours-ago offset. Today's wrap-around Night period only spans *tonight* 21:00
              // through *tomorrow* 06:00, so "now" (and anything "hours ago" from it) has no
              // home among today's 5 periods whenever the suite happens to run between local
              // midnight and 06:00 — hit routinely in CI, which runs in UTC.
              const base = new Date();
              base.setHours(12, 0, 0, 0);
              const t1 = new Date(base.getTime() - 6 * 60_000).toISOString();
              const t2 = new Date(base.getTime() - 3 * 60_000).toISOString();
              return [
                { timestamp: t1, temperature: 5, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
                { timestamp: t2, temperature: 15, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
              ];
            })()
          : [],
    }));

    const user = userEvent.setup();
    render(<OverviewHarness location={stockholm} highLowVisible />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "3 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    expect(await screen.findByText(/H 15° \/ L 5°/)).toBeInTheDocument();
  });

  it("shows no high/low on the 24-hour view even when the toggle is on (no day-level concept for a single hour)", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 5, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
      ],
    });

    render(<OverviewHarness location={stockholm} highLowVisible />);
    await screen.findByText(/Temp/);

    expect(screen.queryByText(/°\/.*°\)/)).not.toBeInTheDocument();
  });
});

describe("US3: enrichment rows (Sun & Moon summary removed above the timeline, 041-move-moon-to-today-card)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("does not render a Sun & Moon summary above the timeline (moved into the Today card)", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    // The old above-timeline block used "Sunrise:"/"Sunset:" (with a colon); the Today card's own
    // existing Sunrise/Sunset spans (no colon) are unaffected and covered by other tests.
    expect(screen.queryByText(/Sunrise:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sunset:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Moon:/)).not.toBeInTheDocument();
  });

  it("renders the snow row when the underlying data is classified snowy", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        {
          timestamp: hoursAgo(1),
          temperature: -5,
          precipitation: 2,
          windSpeed: 8,
          windGust: 15,
          cloudCoverPercent: 90,
        },
      ],
    });

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());

    // "Snow" also appears as the condition row's label for this snowy hour, so scope the
    // query to the row title rather than matching any "Snow" text on the page.
    const snowTitle = await screen.findAllByText(/Snow/);
    expect(snowTitle.some((el) => el.className === "weather-timeline-row-title")).toBe(true);
  });

  it("omits the snow row when nothing in the series is classified snowy", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: null, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    const snowTitle = screen
      .queryAllByText(/Snow/)
      .find((el) => el.className === "weather-timeline-row-title");
    expect(snowTitle).toBeUndefined();

    // The core rows from User Story 1 are unaffected by the omission.
    expect(screen.getByText(/Temp/)).toBeInTheDocument();
  });
});

describe("US2: a leaner set of timeline rows (009-timeline-polish-and-header)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("renders no cloud-cover row and no feels-like row for a fully-populated series", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        {
          timestamp: hoursAgo(1),
          temperature: 10,
          precipitation: 0,
          windSpeed: 3,
          windGust: 6,
          cloudCoverPercent: 50,
        },
      ],
    });

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    expect(screen.queryByText(/Cloud cover/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Feels like/)).not.toBeInTheDocument();
  });

  it("renders the wind row as whole-number speed with gust in parentheses when gust data is present", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        {
          timestamp: hoursAgo(1),
          temperature: 10,
          precipitation: 0,
          windSpeed: 12.4,
          windGust: 17.6,
          cloudCoverPercent: 50,
        },
      ],
    });

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());

    expect(await screen.findByText("12 (18) m/s")).toBeInTheDocument();
  });

  it("renders the wind row as plain whole-number speed when no gust data is present", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        {
          timestamp: hoursAgo(1),
          temperature: 10,
          precipitation: 0,
          windSpeed: 12.4,
          cloudCoverPercent: 50,
        },
      ],
    });

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());

    expect(await screen.findByText("12 m/s")).toBeInTheDocument();
  });
});

describe("US3: fix timeline display and navigation defects (009-timeline-polish-and-header)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows an interpolated estimate at the 'now' boundary column when both neighbors have data", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        {
          timestamp: hoursFromNow(1),
          temperature: null,
          precipitation: 0,
          windSpeed: 1,
          cloudCoverPercent: 5,
          isForecast: true,
        },
        {
          timestamp: hoursFromNow(2),
          temperature: 20,
          precipitation: 0,
          windSpeed: 1,
          cloudCoverPercent: 5,
          isForecast: true,
        },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    expect(container.querySelector(".weather-timeline-interpolated")).toBeInTheDocument();
    expect(screen.getByText("15 °C")).toBeInTheDocument();
  });

  it("leaves a plain gap at the 'now' boundary column when a neighbor is also missing", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: null, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        {
          timestamp: hoursFromNow(1),
          temperature: null,
          precipitation: 0,
          windSpeed: 1,
          cloudCoverPercent: 5,
          isForecast: true,
        },
        {
          timestamp: hoursFromNow(2),
          temperature: 20,
          precipitation: 0,
          windSpeed: 1,
          cloudCoverPercent: 5,
          isForecast: true,
        },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    expect(container.querySelectorAll(".weather-timeline-interpolated").length).toBe(0);
  });
});

describe("chance of rain (011-precipitation-chance)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("renders the chance-of-rain percentage beneath the mm amount for a forecast column with data", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        {
          timestamp: hoursFromNow(1),
          temperature: 8,
          precipitation: 2,
          windSpeed: 3,
          cloudCoverPercent: 90,
          isForecast: true,
          chanceOfRain: 70,
        },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        Array.from(container.querySelectorAll(".weather-timeline-bar-value")).some(
          (el) => el.textContent === "2.0 mm · 70%"
        )
      ).toBe(true)
    );

    // 021-dashboard-polish-round-six, US3/FR-004: the chance-of-rain percentage now renders
    // inline on the same line as the mm value (not a stacked sibling), so every
    // .weather-timeline-bar-cell always stacks exactly two children and bar baselines stay aligned.
    expect(container.querySelector(".weather-timeline-bar-chance")?.textContent).toBe(" · 70%");
  });

  it("renders no percentage for an observed column even when chanceOfRain data is present", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        {
          timestamp: hoursAgo(1),
          temperature: 10,
          precipitation: 2,
          windSpeed: 1,
          cloudCoverPercent: 5,
          chanceOfRain: 90, // present on the raw point, but this hour is observed, not forecast
        },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText("2.0 mm");

    expect(container.querySelector(".weather-timeline-bar-chance")).not.toBeInTheDocument();
  });

  it("renders no percentage for a forecast column without chance-of-rain data", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        {
          timestamp: hoursFromNow(1),
          temperature: 8,
          precipitation: 2,
          windSpeed: 3,
          cloudCoverPercent: 90,
          isForecast: true,
        },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText("2.0 mm");

    expect(container.querySelector(".weather-timeline-bar-chance")).not.toBeInTheDocument();
  });

  it("renders no percentage when chanceOfRain is genuinely 0% (025-reduce-api-requests, US3)", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        {
          timestamp: hoursFromNow(1),
          temperature: 8,
          precipitation: 0,
          windSpeed: 3,
          cloudCoverPercent: 10,
          isForecast: true,
          chanceOfRain: 0,
        },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText("0.0 mm");

    expect(container.querySelector(".weather-timeline-bar-chance")).not.toBeInTheDocument();
  });
});

describe("US1: colorful condition icons (010-timeline-visual-styling)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("gives each condition present in the series its own distinct class", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: "2026-08-31T23:00:00", temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 }, // clear-night
        { timestamp: hoursAgo(2), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 90 }, // cloudy
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 2, windSpeed: 1, cloudCoverPercent: 90 }, // light-rain
        { timestamp: hoursAgo(0), temperature: -5, precipitation: 2, windSpeed: 1, cloudCoverPercent: 90 }, // light-snow
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText("Clear");

    expect(container.querySelector(".weather-condition-clear-night")).toBeInTheDocument();
    expect(container.querySelector(".weather-condition-cloudy")).toBeInTheDocument();
    expect(container.querySelector(".weather-condition-light-rain")).toBeInTheDocument();
    expect(container.querySelector(".weather-condition-light-snow")).toBeInTheDocument();
  });

  it("does not show a rain icon for a small forecast amount with a low chance of rain (038-granular-weather-icons-and-graph-header, US1 — reported live: 'chance is 7% ... in reality its not a rain forecast')", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        {
          timestamp: hoursFromNow(1),
          temperature: 15,
          precipitation: 0.2,
          windSpeed: 1,
          cloudCoverPercent: 10,
          chanceOfRain: 7,
          isForecast: true,
        },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());

    expect(container.querySelector(".weather-condition-light-rain")).not.toBeInTheDocument();
    expect(container.querySelector(".weather-condition-heavy-rain")).not.toBeInTheDocument();
    expect(container.querySelector(".weather-condition-clear-day")).toBeInTheDocument();
    // The icon-suppression guard above and the Rain row's own chance-of-rain percentage are
    // independent (039-rain-percent-sticky-fix, US1/FR-001/FR-002): a low-confidence period still
    // shows its percentage even though it no longer shows a rain icon.
    expect(container.querySelector(".weather-timeline-bar-chance")?.textContent).toBe(" · 7%");
  });

  it("distinguishes partly-cloudy (lighter cover) from cloudy (heavier/overcast cover)", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 60 },
        { timestamp: hoursAgo(0), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 95 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());

    expect(container.querySelector(".weather-condition-partly-cloudy")).toBeInTheDocument();
    expect(container.querySelector(".weather-condition-cloudy")).toBeInTheDocument();
  });
});

describe("US2: chart rows colored and shaded like the mockup (010-timeline-visual-styling)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("gives the temperature, wind, and precipitation rows their own distinct class hooks", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 2, windSpeed: 3, cloudCoverPercent: 50 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    expect(container.querySelector(".weather-timeline-row-temperature")).toBeInTheDocument();
    expect(container.querySelector(".weather-timeline-row-wind")).toBeInTheDocument();
    expect(container.querySelector(".weather-timeline-row-precipitation")).toBeInTheDocument();
  });
});

describe("US3: the 'now' column reads as a highlighted marker (010-timeline-visual-styling)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("marks exactly one cell per row as the now column when there's an observed/forecast boundary", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        {
          timestamp: hoursFromNow(1),
          temperature: 8,
          precipitation: 0,
          windSpeed: 1,
          cloudCoverPercent: 5,
          isForecast: true,
        },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    const nowLine = container.querySelector(".weather-timeline-now");
    expect(nowLine).toBeInTheDocument();

    const nowCells = container.querySelectorAll(".weather-timeline-now-column");
    expect(nowCells.length).toBeGreaterThan(0);
    // Every row-key class present should have exactly one now-column cell.
    expect(container.querySelectorAll(".weather-timeline-row-temperature .weather-timeline-now-column")).toHaveLength(1);
  });

  it("marks no cell as the now column when there is no forecast boundary", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    expect(container.querySelector(".weather-timeline-now")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".weather-timeline-now-column")).toHaveLength(0);
  });
});

describe("center-on-now scroll behavior (013-overview-default-and-layout, US3)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  afterEach(() => {
    // jsdom always reports 0 for scrollWidth/clientWidth — stub them at the prototype level
    // for the duration of each test, matching this repo's existing precedent (008/009) of
    // structural-only assertions where jsdom can't compute real layout.
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth;
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  });

  function stubDimensions(scrollWidth: number, clientWidth: number) {
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", { configurable: true, value: scrollWidth });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: clientWidth });
  }

  it("centers the 'now' column when the timeline overflows and a forecast boundary exists", async () => {
    stubDimensions(2000, 400);
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        {
          timestamp: hoursFromNow(1),
          temperature: 8,
          precipitation: 0,
          windSpeed: 1,
          cloudCoverPercent: 5,
          isForecast: true,
        },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    const wrap = container.querySelector(".weather-timeline-wrap") as HTMLDivElement;
    expect(wrap.scrollLeft).toBeGreaterThan(0);
  });

  it("leaves scrollLeft at its default when the timeline fits within the container", async () => {
    stubDimensions(400, 400);
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        {
          timestamp: hoursFromNow(1),
          temperature: 8,
          precipitation: 0,
          windSpeed: 1,
          cloudCoverPercent: 5,
          isForecast: true,
        },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    const wrap = container.querySelector(".weather-timeline-wrap") as HTMLDivElement;
    expect(wrap.scrollLeft).toBe(0);
  });

  it("leaves scrollLeft at its default when there is no forecast boundary to center on", async () => {
    stubDimensions(2000, 400);
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    const wrap = container.querySelector(".weather-timeline-wrap") as HTMLDivElement;
    expect(wrap.scrollLeft).toBe(0);
  });
});

describe("responsive layout", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("renders the timeline inside a horizontally-scrolling wrapper, not the fixed-height chart container", async () => {
    // Actual reflow at different widths isn't something jsdom can verify — this is a
    // structural smoke check that the scroll wrapper (styled in src/index.css with
    // `overflow-x: auto`, FR-008/research.md §6) is present, matching this repo's existing
    // precedent (see 005/006's ObservationChart tests) for not asserting real rendered
    // dimensions under jsdom.
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());

    expect(container.querySelector(".weather-timeline-wrap")).toBeInTheDocument();
    expect(container.querySelector(".recharts-responsive-container")).not.toBeInTheDocument();
  });
});

describe("data source note removed from the Overview (013-overview-default-and-layout, US4; removed 041-move-moon-to-today-card, US1)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("does not show a data-source note on the Overview", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      primarySource: "open-meteo",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await screen.findByText(/Temp/);

    expect(screen.queryByText("Data: Open-Meteo")).not.toBeInTheDocument();
    expect(container.querySelector(".data-source-note")).not.toBeInTheDocument();
  });
});

describe("Observed/Forecast section labels (018-dashboard-visual-redesign, US2)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows both 'Observed' and 'Forecast' section labels when forecast data exists", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        { timestamp: hoursFromNow(1), temperature: 8, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5, isForecast: true },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    expect(container.querySelector(".weather-timeline-section-observed")).toHaveTextContent("Observed");
    expect(container.querySelector(".weather-timeline-section-forecast")).toHaveTextContent("Forecast");
  });

  it("shows only 'Observed' when there is no forecast data", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    expect(container.querySelector(".weather-timeline-section-observed")).toHaveTextContent("Observed");
    expect(container.querySelector(".weather-timeline-section-forecast")).not.toBeInTheDocument();
  });

  it("shows only 'Forecast' (not 'Observed') when every visible period is forecast (026-fix-3-day, US1)", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursFromNow(1), temperature: 8, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5, isForecast: true },
        { timestamp: hoursFromNow(2), temperature: 9, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5, isForecast: true },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    expect(container.querySelector(".weather-timeline-section-observed")).not.toBeInTheDocument();
    const forecastSection = container.querySelector(".weather-timeline-section-forecast");
    expect(forecastSection).toHaveTextContent("Forecast");
    expect(forecastSection).toHaveStyle({ width: "100%" });
  });
});

describe("Sticky row-label column (018-dashboard-visual-redesign, US3)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows a 'Probability' sub-label on Rain and 'Gusts' on Wind, and a 'Weather' title on the condition row", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 1, windSpeed: 2, windGust: 4, cloudCoverPercent: 5 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    expect(
      container.querySelector(".weather-timeline-row-precipitation .weather-timeline-row-sublabel")
    ).toHaveTextContent("Probability");
    expect(
      container.querySelector(".weather-timeline-row-wind .weather-timeline-row-sublabel")
    ).toHaveTextContent("Gusts");
    expect(
      container.querySelector(".weather-timeline-row-condition .weather-timeline-row-title")
    ).toHaveTextContent("Weather");
  });

  it("gives every timeline row a title-column element (no longer pinned in place, 039-rain-percent-sticky-fix, US2)", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 1, windSpeed: 2, cloudCoverPercent: 5 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    const titles = container.querySelectorAll(".weather-timeline-row-title");
    // Time-label placeholder, Weather, Temp, Rain, Wind — at minimum.
    expect(titles.length).toBeGreaterThanOrEqual(5);
  });
});

describe("Today summary card (018-dashboard-visual-redesign, US4)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows icon/high-low/description/rain/wind-with-compass/sunrise-sunset/moon for today (moon added 041-move-moon-to-today-card, US2)", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [
              { timestamp: hoursAgo(2), temperature: 5, precipitation: 1, windSpeed: 3, windDirection: 90, cloudCoverPercent: 10 },
              { timestamp: hoursAgo(1), temperature: 15, precipitation: 1, windSpeed: 3, windDirection: 90, cloudCoverPercent: 10 },
            ]
          : [],
    }));

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const card = await screen.findByRole("region", { name: "Today" });
    expect(card).toHaveTextContent("High 15°");
    expect(card).toHaveTextContent("Low 5°");
    expect(card).toHaveTextContent(/Rain/);
    expect(card).toHaveTextContent(/Wind.*E/);
    expect(card).toHaveTextContent(/Sunrise/);
    expect(card).toHaveTextContent(/Sunset/);
    expect(card).toHaveTextContent(/Moon/);
  });

  it("colors the icon by its condition, matching the color used elsewhere for the same condition (029-colorful-brief-icons)", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? // Fixed local-time (no "Z") daytime timestamp, not hoursAgo(1) — the "current
            // condition" reading factors in day/night by clock hour (weatherCondition.ts's
            // isNight), so a real-now timestamp made this test flaky depending on when it ran.
            [{ timestamp: "2026-08-31T12:00:00", temperature: 15, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 }]
          : [],
    }));

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const card = await screen.findByRole("region", { name: "Today" });
    const iconWrapper = card.querySelector(".today-summary-icon");
    expect(iconWrapper).toHaveClass("weather-condition-clear-day");
  });

  it("shows a calendar-day rain total, not the rolling next-24h bucket's own total (033-todays-rain-total)", async () => {
    const weeklyObservations = [
      { timestamp: hoursAgo(3), temperature: 10, precipitation: 1.5, windSpeed: 1, cloudCoverPercent: 5 },
      {
        timestamp: hoursFromNow(1),
        temperature: 10,
        precipitation: 2,
        windSpeed: 1,
        cloudCoverPercent: 5,
        isForecast: true,
      },
      // Far enough out to fall in the old rolling-24h "today" bucket for much of the day but,
      // depending on wall-clock time, potentially outside today's own calendar day — exactly the
      // discrepancy this feature exists to resolve. The assertion below computes the expected
      // value the same way the component does, so it's correct regardless of current time.
      {
        timestamp: hoursFromNow(20),
        temperature: 10,
        precipitation: 4,
        windSpeed: 1,
        cloudCoverPercent: 5,
        isForecast: true,
      },
    ];
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: w === "last-7-days" ? weeklyObservations : [],
    }));

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const expectedMm = sumCalendarDayPrecipitation(weeklyObservations, new Date());
    const card = await screen.findByRole("region", { name: "Today" });
    expect(card).toHaveTextContent(`Rain ${expectedMm !== null ? expectedMm.toFixed(1) : "—"}`);
  });

  it("shows the gap indicator, not a fabricated value, for missing fields", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: w === "last-7-days" ? [{ timestamp: hoursAgo(1), temperature: null, precipitation: null, windSpeed: null, cloudCoverPercent: null }] : [],
    }));

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const card = await screen.findByRole("region", { name: "Today" });
    expect(card.textContent).toContain("—");
  });

  it("stays visible across all three tabs (24h/3d/7d)", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: w === "last-7-days" ? [{ timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 }] : [],
    }));

    const user = userEvent.setup();
    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    expect(await screen.findByRole("region", { name: "Today" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "3 Days" }));
    expect(screen.getByRole("region", { name: "Today" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "7 Days" }));
    expect(screen.getByRole("region", { name: "Today" })).toBeInTheDocument();
  });

  it("reflects the forward-looking forecast, not a backward-looking cloudy stretch that already passed (023-fix-today-summary)", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [
              // Trailing 24h (backward bucket): cloudy.
              { timestamp: hoursAgo(2), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 90 },
              { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 90 },
              // Next 24h (forward bucket): clear.
              { timestamp: hoursFromNow(1), temperature: 12, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5, isForecast: true },
              { timestamp: hoursFromNow(2), temperature: 12, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5, isForecast: true },
            ]
          : [],
    }));

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const card = await screen.findByRole("region", { name: "Today" });
    expect(card).toHaveTextContent("Clear.");
    expect(card).not.toHaveTextContent("Cloudy.");
  });

  it("still summarizes the most recent observed day when there is no forecast at all (023-fix-today-summary, no-regression check)", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [{ timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 }]
          : [],
    }));

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const card = await screen.findByRole("region", { name: "Today" });
    expect(card).toHaveTextContent("Clear.");
  });
});

describe("7-day forecast strip (018-dashboard-visual-redesign, US5)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows exactly as many cards as toDailyAggregates returned, never fabricated", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: w === "last-7-days" ? [{ timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 }] : [],
    }));

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const strip = await screen.findByRole("region", { name: "7 day forecast" });
    expect(strip.querySelectorAll(".weekly-forecast-day")).toHaveLength(7);
  });

  it("colors each day's icon via the same weather-condition-* class the main timeline uses (022-met-forecast-source, US2)", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [
              {
                timestamp: hoursAgo(1),
                temperature: 20,
                precipitation: 0,
                windSpeed: 1,
                cloudCoverPercent: 5,
              },
            ]
          : [],
    }));

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const strip = await screen.findByRole("region", { name: "7 day forecast" });
    const days = strip.querySelectorAll(".weekly-forecast-day");
    const coloredDays = Array.from(days).filter((day) =>
      Array.from(day.classList).some((c) => c.startsWith("weather-condition-"))
    );
    expect(coloredDays.length).toBeGreaterThan(0);
  });

  it("is visible on all three tabs", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: w === "last-7-days" ? [{ timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 }] : [],
    }));

    const user = userEvent.setup();
    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    expect(await screen.findByRole("region", { name: "7 day forecast" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "3 Days" }));
    expect(screen.getByRole("region", { name: "7 day forecast" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "7 Days" }));
    expect(screen.getByRole("region", { name: "7 day forecast" })).toBeInTheDocument();
  });

  it("triggers no duplicate getObservations call for last-7-days when switching to/from the 7-day tab", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: [],
    }));

    const user = userEvent.setup();
    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    // The always-on weekly fetch already covers last-7-days once the 24h tab has loaded.
    const sevenDayCallsBeforeSwitch = vi
      .mocked(getObservations)
      .mock.calls.filter(([, w]) => w === "last-7-days").length;
    expect(sevenDayCallsBeforeSwitch).toBe(1);

    // Switching the active window to "last-7-days" makes a genuinely new primary fetch (a
    // fresh call with that window is expected here) — the dedup only avoids a *second*,
    // redundant weeklySeries fetch alongside it.
    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => {
      const sevenDayCallsAfterSwitch = vi
        .mocked(getObservations)
        .mock.calls.filter(([, w]) => w === "last-7-days").length;
      expect(sevenDayCallsAfterSwitch).toBe(2);
    });
  });
});

describe("Rain bar scaling (019-dashboard-polish-round-four, US4)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("gives a column with more precipitation a proportionally larger bar-height percentage than one with less", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(2), temperature: 10, precipitation: 1, windSpeed: 1, cloudCoverPercent: 10 },
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 20, windSpeed: 1, cloudCoverPercent: 10 },
        { timestamp: hoursFromNow(1), temperature: 10, precipitation: 0.5, windSpeed: 1, cloudCoverPercent: 10, isForecast: true },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    const bars = Array.from(
      container.querySelectorAll(".weather-timeline-row-precipitation .weather-timeline-bar")
    ) as HTMLElement[];
    const heights = bars.map((b) => parseFloat(b.style.height));

    // The 20mm column's bar must be taller than both the 1mm and 0.5mm columns'.
    const maxHeight = Math.max(...heights);
    const twentyMmIndex = heights.indexOf(maxHeight);
    expect(heights[twentyMmIndex]).toBeGreaterThan(heights[(twentyMmIndex + 1) % heights.length] ?? 0);
    expect(new Set(heights).size).toBeGreaterThan(1); // not every bar flattened to the same value
  });

  it("keeps every rain/snow bar-cell CSS-stretched to the row's full height, not shrunk to content, so percentage bar heights resolve (regression guard for the align-items: end bug)", () => {
    const css = readFileSync(join(process.cwd(), "src/index.css"), "utf-8");
    const rowBarsRule = css.match(/\.weather-timeline-row-bars\s*\{[^}]*\}/);

    expect(rowBarsRule).not.toBeNull();
    expect(rowBarsRule![0]).not.toContain("align-items: end");
  });
});

describe("Precipitation/snow chart: bars and values in separate rows (032-dashboard-polish-round-seven, US6)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("renders no text inside the bars row, and each column's mm/percentage in a separate row beneath it, aligned by column", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 1.5, windSpeed: 1, cloudCoverPercent: 10 },
        {
          timestamp: hoursFromNow(1),
          temperature: 8,
          precipitation: 2,
          windSpeed: 3,
          cloudCoverPercent: 90,
          isForecast: true,
          chanceOfRain: 60,
        },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("1.5 mm")).toBeInTheDocument());

    const barsRow = container.querySelector(".weather-timeline-row-precipitation .weather-timeline-row-bars");
    expect(barsRow).not.toBeNull();
    expect(barsRow!.textContent).toBe("");
    expect(barsRow!.querySelectorAll(".weather-timeline-bar")).toHaveLength(2);

    const valuesRow = container.querySelector(".weather-timeline-row-precipitation-values .weather-timeline-row-bar-values");
    expect(valuesRow).not.toBeNull();
    const valueCells = valuesRow!.querySelectorAll(".weather-timeline-cell");
    expect(valueCells).toHaveLength(2);
    expect(valueCells[0].textContent).toBe("1.5 mm");
    expect(valueCells[1].textContent).toBe("2.0 mm · 60%");
  });

  it("applies the same two-row split to the snow row", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: -5, precipitation: 3, windSpeed: 1, cloudCoverPercent: 90 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await waitFor(() =>
      expect(container.querySelector(".weather-timeline-row-snow .weather-timeline-bar")).not.toBeNull()
    );

    const snowBarsRow = container.querySelector(".weather-timeline-row-snow .weather-timeline-row-bars");
    expect(snowBarsRow!.textContent).toBe("");

    const snowValuesRow = container.querySelector(".weather-timeline-row-snow-values .weather-timeline-row-bar-values");
    expect(snowValuesRow).not.toBeNull();
    expect(snowValuesRow!.textContent).toContain("3.0 mm");
  });
});

describe("Wind direction on 3-day/7-day views (019-dashboard-polish-round-four, US5)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows a wind-direction arrow on the 3-day view when the underlying data has a wind reading", async () => {
    // Fixed at today's own Lunch period (11:00-13:00 local) rather than an hours-ago offset:
    // the sub-day view's "today" bucket set has no period covering roughly midnight-06:00 local
    // (its wrap-around Night period only spans *tonight* 21:00 through *tomorrow* 06:00), so an
    // hours-ago timestamp can silently fall outside every one of today's 5 periods depending on
    // the wall-clock time the suite runs at.
    const todayLunch = new Date();
    todayLunch.setHours(12, 0, 0, 0);
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [{ timestamp: todayLunch.toISOString(), temperature: 5, precipitation: 0, windSpeed: 3, windDirection: 90, cloudCoverPercent: 10 }]
          : [],
    }));

    const user = userEvent.setup();
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "3 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    // A future timestamp always pushes into at least a 2-day window here (any point ahead of
    // "now" counts as at least 1 day of forecast reach), so "Morning" legitimately appears once
    // per available day.
    await screen.findAllByText("Morning");

    expect(container.querySelector(".weather-timeline-wind-arrow")).toBeInTheDocument();
  });

  it("shows a wind-direction arrow on the 7-day view when the underlying data has a wind reading", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [{ timestamp: hoursAgo(1), temperature: 5, precipitation: 0, windSpeed: 3, windDirection: 180, cloudCoverPercent: 10 }]
          : [],
    }));

    const user = userEvent.setup();
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    await screen.findByText(/Temp/);

    expect(container.querySelector(".weather-timeline-wind-arrow")).toBeInTheDocument();
  });

  it("shows no fabricated arrow when a period has no wind reading at all", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [{ timestamp: hoursAgo(1), temperature: 5, precipitation: 0, windSpeed: null, windDirection: null, cloudCoverPercent: 10 }]
          : [],
    }));

    const user = userEvent.setup();
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    await screen.findByText(/Temp/);

    expect(container.querySelector(".weather-timeline-wind-arrow")).not.toBeInTheDocument();
  });
});

describe("High/Low temperature labeling (019-dashboard-polish-round-four, US6)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("labels the Today card's paired temperatures as High/Low", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [
              { timestamp: hoursAgo(2), temperature: 5, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
              { timestamp: hoursAgo(1), temperature: 15, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
            ]
          : [],
    }));

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const card = await screen.findByRole("region", { name: "Today" });
    expect(card).toHaveTextContent("High 15°");
    expect(card).toHaveTextContent("Low 5°");
  });
});

describe("7-day cap and dated labels (019-dashboard-polish-round-four, US7)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  function farReachingForecast() {
    // Forecast reaching 10 days out, well beyond a week.
    return Array.from({ length: 10 }, (_, i) => ({
      timestamp: hoursFromNow((i + 1) * 24),
      temperature: 10,
      precipitation: 0,
      windSpeed: 1,
      cloudCoverPercent: 10,
      isForecast: true,
    }));
  }

  it("caps the forecast portion at 7 days on the 7-day tab when forecast reaches well beyond a week", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: w === "last-7-days" ? farReachingForecast() : [],
    }));

    const user = userEvent.setup();
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    await screen.findByText(/Temp/);

    const columns = container.querySelectorAll(".weather-timeline-row-time .weather-timeline-cell");
    const forecastColumns = container.querySelectorAll(".weather-timeline-cell-forecast");
    // 7 observed (empty, no data supplied) + at most 7 forecast, never the full 10-day reach.
    expect(columns).toHaveLength(14);
    expect(forecastColumns.length).toBeLessThanOrEqual(7);
  });

  it("keeps 'today' and the persistent Today card visible even when forecast reaches well beyond a week (regression guard)", async () => {
    // The regression this guards against: an earlier tail-slice-based cap dropped every
    // observed day (including "today") once forecast reach exceeded ~6 days, silently hiding
    // the Today card — caught only via live browser testing, not this suite, so it's locked in
    // here as an explicit case.
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [
              { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
              ...farReachingForecast(),
            ]
          : [],
    }));

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    expect(await screen.findByRole("region", { name: "Today" })).toBeInTheDocument();
  });

  it("labels each 7-day column with weekday and calendar date", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: w === "last-7-days" ? farReachingForecast() : [],
    }));

    const user = userEvent.setup();
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    await screen.findByText(/Temp/);

    // Weekday-only labels (e.g. "Fri") have no digit at all; a dated label always does. Checks
    // for a digit rather than an exact format/separator, since `toLocaleDateString`'s output
    // (spacing, comma) can vary by the runtime's available locale data (observed to differ
    // between local and CI environments).
    const timeCells = container.querySelectorAll(".weather-timeline-row-time .weather-timeline-cell");
    const datedLabels = Array.from(timeCells).filter((cell) => /\d/.test(cell.textContent ?? ""));
    expect(datedLabels.length).toBeGreaterThan(0);
  });

  it("shows exactly 7 cards in the persistent weekly forecast strip, anchored on today, when forecast reaches well beyond a week (020-dashboard-polish-round-five, US5)", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: w === "last-7-days" ? farReachingForecast() : [],
    }));

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const strip = await screen.findByRole("region", { name: "7 day forecast" });
    // Strictly 7 (today + 6 forecast days), not the 14 the main timeline's own
    // forecast-reach-only cap would allow — the strip has no Observed/Forecast section
    // design to protect, so it always prioritizes today and the days ahead.
    expect(strip.querySelectorAll(".weekly-forecast-day")).toHaveLength(7);
  });
});

describe("Now line and day-boundary line positioning (020-dashboard-polish-round-five, US3)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("positions the 'Now' line with a calc() offset accounting for the sticky label column", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        { timestamp: hoursFromNow(1), temperature: 8, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5, isForecast: true },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText(/Temp/);

    const nowLine = container.querySelector(".weather-timeline-now") as HTMLElement;
    // jsdom's CSSOM can reorder a calc() expression's operands, so assert on substrings
    // rather than an exact literal match.
    expect(nowLine.style.left).toMatch(/^calc\(7rem \+/);
    expect(nowLine.style.left).toContain("100% - 7rem");
  });

  it("positions each day-boundary line with the same calc() offset on the 3-day view", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations:
        w === "last-7-days"
          ? [{ timestamp: hoursFromNow(24 * 3), temperature: 5, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10, isForecast: true }]
          : [],
    }));

    const user = userEvent.setup();
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "3 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    await screen.findAllByText("Morning");

    const boundaries = Array.from(container.querySelectorAll(".weather-timeline-day-boundary")) as HTMLElement[];
    expect(boundaries.length).toBeGreaterThan(0);
    for (const boundary of boundaries) {
      expect(boundary.style.left).toMatch(/^calc\(7rem \+/);
      expect(boundary.style.left).toContain("100% - 7rem");
    }
  });
});

describe("UV risk badge (027-uv-index-alert)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getUvRisk).mockReset();
  });

  it("shows the badge only on the observed hour whose UV Index is risky, never on a forecast hour", async () => {
    const riskyTimestamp = hoursAgo(1);
    const safeTimestamp = hoursAgo(2);
    const forecastTimestamp = hoursFromNow(1);
    vi.mocked(getUvRisk).mockResolvedValue(new Set([Math.floor(Date.parse(riskyTimestamp) / 3600_000)]));
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: safeTimestamp, temperature: 15, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        { timestamp: riskyTimestamp, temperature: 20, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        {
          timestamp: forecastTimestamp,
          temperature: 20,
          precipitation: 0,
          windSpeed: 1,
          cloudCoverPercent: 5,
          isForecast: true,
        },
      ],
    });

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const badges = await screen.findAllByTitle("High UV");
    expect(badges).toHaveLength(1);

    const riskyCell = badges[0].closest(".weather-timeline-condition") as HTMLElement;
    expect(riskyCell.getAttribute("aria-label")).toContain("High UV");
  });

  it("shows no badge anywhere when uvRiskHours is empty", async () => {
    vi.mocked(getUvRisk).mockResolvedValue(new Set());
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: 20, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await screen.findByRole("region", { name: `Weather overview for ${stockholm.displayName}` });

    expect(screen.queryByTitle("High UV")).not.toBeInTheDocument();
  });
});

describe("Temp chart degree scale (032-dashboard-polish-round-seven, US7)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("renders 10-degree-step tick labels and matching gridlines spanning the data's own min/max", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(2), temperature: 6, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        { timestamp: hoursAgo(1), temperature: 14, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector(".weather-timeline-temp-scale")).not.toBeNull());

    // min=6 -> floor to 0; max=14 -> ceil to 20; step 10 => 0, 10, 20.
    const tickLabels = Array.from(
      container.querySelectorAll(".weather-timeline-temp-scale-tick")
    ).map((el) => el.textContent);
    expect(tickLabels).toEqual(["0°", "10°", "20°"]);

    const gridlines = container.querySelectorAll(".weather-timeline-temp-gridline");
    expect(gridlines).toHaveLength(3);
  });

  it("shows both boundary ticks for an 11-20°C range, not a skipped middle step (037-header-controls-and-chart-fixes, US3 — reported live as a missing '10°' between '20°' and a mislabeled '0°')", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(2), temperature: 11, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        { timestamp: hoursAgo(1), temperature: 20, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector(".weather-timeline-temp-scale")).not.toBeNull());

    // min=11 -> floor to 10; max=20 -> ceil to 20; step 10 => 10, 20 (no 0 forced or dropped).
    const tickLabels = Array.from(
      container.querySelectorAll(".weather-timeline-temp-scale-tick")
    ).map((el) => el.textContent);
    expect(tickLabels).toEqual(["10°", "20°"]);
  });

  it("does not force a 0° tick into view for an all-positive range far from freezing", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(2), temperature: 12, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        { timestamp: hoursAgo(1), temperature: 25, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector(".weather-timeline-temp-scale")).not.toBeNull());

    // min=12 -> floor to 10; max=25 -> ceil to 30; step 10 => 10, 20, 30 (no forced 0 far off-chart).
    const tickLabels = Array.from(
      container.querySelectorAll(".weather-timeline-temp-scale-tick")
    ).map((el) => el.textContent);
    expect(tickLabels).toEqual(["10°", "20°", "30°"]);
  });

  it("does not force a 0° tick into view for an all-negative range far from freezing", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(2), temperature: -25, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        { timestamp: hoursAgo(1), temperature: -12, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector(".weather-timeline-temp-scale")).not.toBeNull());

    // min=-25 -> floor to -30; max=-12 -> ceil to -10; step 10 => -30, -20, -10 (no forced 0 far off-chart).
    const tickLabels = Array.from(
      container.querySelectorAll(".weather-timeline-temp-scale-tick")
    ).map((el) => el.textContent);
    expect(tickLabels).toEqual(["-30°", "-20°", "-10°"]);
  });

  it("renders no degree scale or gridlines for the wind/precipitation/snow rows", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(1), temperature: -5, precipitation: 3, windSpeed: 4, cloudCoverPercent: 90 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector(".weather-timeline-temp-scale")).not.toBeNull());

    expect(
      container.querySelector(".weather-timeline-row-wind .weather-timeline-temp-scale")
    ).toBeNull();
    expect(
      container.querySelector(".weather-timeline-row-precipitation .weather-timeline-temp-gridline")
    ).toBeNull();
    expect(
      container.querySelector(".weather-timeline-row-snow .weather-timeline-temp-gridline")
    ).toBeNull();
    // Exactly one scale/gridline set exists in total (the temperature row's own).
    expect(container.querySelectorAll(".weather-timeline-temp-scale")).toHaveLength(1);
  });
});

describe("Temperature line colored by band (037-header-controls-and-chart-fixes, US6)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("colors the temperature line via a per-value gradient instead of one flat color", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(2), temperature: 2, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        { timestamp: hoursAgo(1), temperature: 18, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector(".weather-timeline-temp-scale")).not.toBeNull());

    const gradient = container.querySelector("#weather-timeline-temperature-line-gradient");
    expect(gradient).not.toBeNull();
    // Range 2-18 crosses the 5, 10, and 15 band boundaries -> at least 3 hard edges (6 stops)
    // plus the 2 boundary stops.
    expect(gradient!.querySelectorAll("stop").length).toBeGreaterThanOrEqual(8);

    const line = container.querySelector(".weather-timeline-line-observed") as SVGElement | null;
    expect(line).not.toBeNull();
    expect(line!.style.stroke).toContain("url(#weather-timeline-temperature-line-gradient)");
  });

  it("also colors the area fill by the same per-value scale, fading toward the baseline (037 follow-up)", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursAgo(2), temperature: 2, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        { timestamp: hoursAgo(1), temperature: 18, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector(".weather-timeline-temp-scale")).not.toBeNull());

    const fillGradient = container.querySelector("#weather-timeline-temperature-gradient");
    expect(fillGradient).not.toBeNull();
    const stops = Array.from(fillGradient!.querySelectorAll("stop"));
    expect(stops.length).toBeGreaterThanOrEqual(8);
    // Not every stop is the same color any more (it used to be one flat --row-temperature).
    const colors = new Set(stops.map((s) => s.getAttribute("stop-color")));
    expect(colors.size).toBeGreaterThan(1);
    // Still fades out toward the baseline like before.
    expect(Number(stops[0].getAttribute("stop-opacity"))).toBeGreaterThan(
      Number(stops[stops.length - 1].getAttribute("stop-opacity"))
    );
  });
});
