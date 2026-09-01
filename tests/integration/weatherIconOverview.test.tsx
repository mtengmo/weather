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
}));

import { getNearbyStationSeries, getObservations } from "../../src/services/weatherApi";

const stockholm: Location = {
  latitude: 59.33,
  longitude: 18.06,
  displayName: "Stockholm",
  source: "favorite",
};

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3600_000).toISOString();
}

function OverviewHarness({ location }: { location: Location }) {
  const [window, setWindow] = useState<ObservationWindow>("last-24-hours");
  const { series } = useObservationData(location, window, 0);

  return (
    <WeatherIconOverview
      location={location}
      window={window}
      onWindowChange={setWindow}
      unit="metric"
      series={series}
      onBack={() => {}}
    />
  );
}

describe("US1: 24h icon overview", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("renders one icon per hour, distinguishing forecast hours and no-data hours", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        {
          // Clear night hour.
          timestamp: "2026-08-31T23:00:00",
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
          // Data gap.
          timestamp: hoursFromNow(2),
          temperature: null,
          precipitation: null,
          windSpeed: null,
          cloudCoverPercent: null,
        },
      ],
    });

    render(<OverviewHarness location={stockholm} />);

    await waitFor(() => expect(getObservations).toHaveBeenCalled());

    expect(await screen.findByText("Clear")).toBeInTheDocument();
    expect(screen.getByText("Rain")).toBeInTheDocument();
    expect(screen.getByText("Forecast")).toBeInTheDocument();
    expect(screen.getByText("No data")).toBeInTheDocument();
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

    expect(container.querySelector("svg.lucide-moon")).toBeInTheDocument();
    expect(container.querySelector("svg.lucide-sun")).not.toBeInTheDocument();
  });

  it("shows the unavailable message rather than a grid when the series status is unavailable", async () => {
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
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    // The overview's toggle never offers a 30-day option.
    expect(screen.queryByRole("button", { name: "Last 30 days" })).not.toBeInTheDocument();
  });
});

describe("US2: 7-day icon overview", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  function hoursAgo(h: number): string {
    return new Date(Date.now() - h * 3600_000).toISOString();
  }

  it("renders one icon per day with high/low values when switched to the 7-day window", async () => {
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

    render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    expect(await screen.findByText(/15°C \/ 5°C/)).toBeInTheDocument();
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
                timestamp: new Date(Date.now() + 25 * 3600_000).toISOString(),
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
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    const forecastLabels = await screen.findAllByText("Forecast");
    expect(forecastLabels.length).toBeGreaterThan(0);
  });
});

describe("US3: responsive layout", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("renders the grid inside a CSS-grid container, not the fixed-height chart container", async () => {
    // Actual reflow at different widths isn't something jsdom can verify — this is a
    // structural smoke check that the responsive grid class (styled in src/index.css with
    // `grid-template-columns: repeat(auto-fit, minmax(...))`, FR-011) is present, matching
    // this repo's existing precedent (see 006's ObservationChart tests) for not asserting
    // real rendered dimensions under jsdom.
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [
        { timestamp: hoursFromNow(-1), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ],
    });

    const { container } = render(<OverviewHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());

    expect(container.querySelector(".weather-overview-grid")).toBeInTheDocument();
    expect(container.querySelector(".recharts-responsive-container")).not.toBeInTheDocument();
  });
});
