import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WeatherIconOverview from "../../src/components/WeatherIconOverview";
import { useObservationData } from "../../src/hooks/useObservationData";
import type { Location, ObservationWindow } from "../../src/models/types";

vi.mock("../../src/services/weatherApi", () => ({
  getObservations: vi.fn(),
  getNearbyStationSeries: vi.fn(),
  getMultiSourceForecast: vi.fn(),
}));

import { getMultiSourceForecast, getNearbyStationSeries, getObservations } from "../../src/services/weatherApi";

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
  combineForecastSources = false,
}: {
  location: Location;
  highLowVisible?: boolean;
  combineForecastSources?: boolean;
}) {
  const [window, setWindow] = useState<ObservationWindow>("last-24-hours");
  const { series, multiSourceForecast, weeklySeries } = useObservationData(
    location,
    window,
    0,
    combineForecastSources
  );

  return (
    <WeatherIconOverview
      location={location}
      window={window}
      onWindowChange={setWindow}
      unit="metric"
      series={series}
      highLowVisible={highLowVisible}
      combineForecastSources={combineForecastSources}
      multiSourceForecast={multiSourceForecast}
      weeklySeries={weeklySeries}
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
    expect(screen.getByText("Rain")).toBeInTheDocument();
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.getAllByText("Forecast").length).toBeGreaterThan(0);

    // The other core rows all render (labels come from timelineData.ts row titles). No
    // cloud-cover row (009-timeline-polish-and-header, FR-005). Scoped to the sticky
    // row-title column since the persistent Today card (018-dashboard-visual-redesign) also
    // renders its own "Wind ..." text elsewhere on the page.
    expect(screen.getByText(/Temperature/)).toBeInTheDocument();
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
    expect(screen.getByText(/Temperature/)).toBeInTheDocument();
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

  it("applies the fill class only on the 7-day window, not the 24h window", async () => {
    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    expect(container.querySelector(".weather-timeline-fill")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "7 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    expect(container.querySelector(".weather-timeline-fill")).toBeInTheDocument();
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

    expect(await screen.findByText(/15°\/5°/)).toBeInTheDocument();
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

    await screen.findByText(/Temperature/);
    expect(screen.queryByText(/15°\/5°/)).not.toBeInTheDocument();
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

    expect(await screen.findByText("Morning")).toBeInTheDocument();
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
    await screen.findByText("Morning");
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

  it("shows all 15 sub-day columns on a direct 24h -> 3-day click (no intermediate 7-day visit)", async () => {
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

    expect(await countTimePeriods(container)).toBe(15);
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
    expect(await countTimePeriods(container)).toBe(15);

    await user.click(screen.getByRole("button", { name: "7 Days" }));
    expect(await countTimePeriods(container)).toBe(11); // 7 observed-window + 4 forecast days (multiDayForecastObservations spans 4 days)

    await user.click(screen.getByRole("button", { name: "3 Days" }));
    expect(await countTimePeriods(container)).toBe(15);

    await user.click(screen.getByRole("button", { name: "24 Hours" }));
    expect(await countTimePeriods(container)).toBe(1); // the single 24h-window observation

    await user.click(screen.getByRole("button", { name: "3 Days" }));
    expect(await countTimePeriods(container)).toBe(15);
  });

  it("shows exactly 5 columns (today only) when the location has no forecast data at all", async () => {
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
    await screen.findByText("Morning");

    expect(await countTimePeriods(container)).toBe(5);
  });
});

describe("Combine forecast sources on the Overview (016-dashboard-polish-round-two, US2)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getMultiSourceForecast).mockReset();
    vi.mocked(getMultiSourceForecast).mockResolvedValue([]);
  });

  it("shows each source's own reading on a forecast period when the toggle is on", async () => {
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

    render(<OverviewHarness location={stockholm} combineForecastSources />);
    await waitFor(() => expect(getMultiSourceForecast).toHaveBeenCalled());

    expect(await screen.findByText(/S 8°/)).toBeInTheDocument();
    expect(screen.getByText(/O 12°/)).toBeInTheDocument();
  });

  it("shows only the plain value when the toggle is off", async () => {
    const t = hoursFromNow(1);
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: t, temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10, isForecast: true },
      ],
    });

    render(<OverviewHarness location={stockholm} combineForecastSources={false} />);
    await screen.findByText(/Temperature/);

    expect(getMultiSourceForecast).not.toHaveBeenCalled();
    expect(screen.queryByText(/S \d/)).not.toBeInTheDocument();
  });
});

describe("Day-boundary marker (016-dashboard-polish-round-two, US3)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows 2 day-boundary markers on the 3-day view (3 days)", async () => {
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

    expect(container.querySelectorAll(".weather-timeline-day-boundary")).toHaveLength(2);
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
          ? [
              // Minutes apart, not hours — the 3-day view's sub-day buckets are 2-9 hours wide
              // (dailyAggregation.ts's SUB_DAY_PERIODS), so two points an hour or more apart can
              // straddle a bucket boundary depending on the wall-clock time the suite runs at,
              // landing in separate cells instead of combining into one high/low. Minutes-apart
              // timestamps stay safely within the same bucket regardless of when this runs.
              { timestamp: hoursAgo(0.2), temperature: 5, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
              { timestamp: hoursAgo(0.1), temperature: 15, precipitation: 0, windSpeed: 1, cloudCoverPercent: 10 },
            ]
          : [],
    }));

    const user = userEvent.setup();
    render(<OverviewHarness location={stockholm} highLowVisible />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));
    await user.click(screen.getByRole("button", { name: "3 Days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    expect(await screen.findByText(/15°\/5°/)).toBeInTheDocument();
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
    await screen.findByText(/Temperature/);

    expect(screen.queryByText(/°\/.*°\)/)).not.toBeInTheDocument();
  });
});

describe("US3: sun/moon and enrichment rows", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("renders a Sun & Moon summary with sunrise/sunset/phase text", async () => {
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

    expect(await screen.findByText(/Sunrise:/)).toBeInTheDocument();
    expect(screen.getByText(/Sunset:/)).toBeInTheDocument();
    expect(screen.getByText(/Moon:/)).toBeInTheDocument();
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
    await screen.findByText(/Temperature/);

    const snowTitle = screen
      .queryAllByText(/Snow/)
      .find((el) => el.className === "weather-timeline-row-title");
    expect(snowTitle).toBeUndefined();

    // The core rows from User Story 1 are unaffected by the omission.
    expect(screen.getByText(/Temperature/)).toBeInTheDocument();
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
    await screen.findByText(/Temperature/);

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
    await screen.findByText(/Temperature/);

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
    await screen.findByText(/Temperature/);

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
    await screen.findByText("2.0 mm");

    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(container.querySelector(".weather-timeline-bar-chance")?.textContent).toBe("70%");
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
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 2, windSpeed: 1, cloudCoverPercent: 90 }, // rainy
        { timestamp: hoursAgo(0), temperature: -5, precipitation: 2, windSpeed: 1, cloudCoverPercent: 90 }, // snowy
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await screen.findByText("Clear");

    expect(container.querySelector(".weather-condition-clear-night")).toBeInTheDocument();
    expect(container.querySelector(".weather-condition-cloudy")).toBeInTheDocument();
    expect(container.querySelector(".weather-condition-rainy")).toBeInTheDocument();
    expect(container.querySelector(".weather-condition-snowy")).toBeInTheDocument();
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
    await screen.findByText(/Temperature/);

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
    await screen.findByText(/Temperature/);

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
    await screen.findByText(/Temperature/);

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
    await screen.findByText(/Temperature/);

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
    await screen.findByText(/Temperature/);

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
    await screen.findByText(/Temperature/);

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

describe("data source note (013-overview-default-and-layout, US4)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows the data-source note on the Overview", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      primarySource: "open-meteo",
      observations: [
        { timestamp: hoursAgo(1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    render(<OverviewHarness location={stockholm} />);

    expect(await screen.findByText("Data: Open-Meteo")).toBeInTheDocument();
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
    await screen.findByText(/Temperature/);

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
    await screen.findByText(/Temperature/);

    expect(container.querySelector(".weather-timeline-section-observed")).toHaveTextContent("Observed");
    expect(container.querySelector(".weather-timeline-section-forecast")).not.toBeInTheDocument();
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
    await screen.findByText(/Temperature/);

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

  it("gives every timeline row a sticky title-column element", async () => {
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
    await screen.findByText(/Temperature/);

    const titles = container.querySelectorAll(".weather-timeline-row-title");
    // Time-label placeholder, Weather, Temperature, Rain, Wind — at minimum.
    expect(titles.length).toBeGreaterThanOrEqual(5);
  });
});

describe("Today summary card (018-dashboard-visual-redesign, US4)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows icon/high-low/description/rain/wind-with-compass/sunrise-sunset for today", async () => {
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
    expect(card).toHaveTextContent("15° / 5°");
    expect(card).toHaveTextContent(/Rain/);
    expect(card).toHaveTextContent(/Wind.*E/);
    expect(card).toHaveTextContent(/Sunrise/);
    expect(card).toHaveTextContent(/Sunset/);
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
