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

function hoursAgo(h: number): string {
  return hoursFromNow(-h);
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
    // cloud-cover row (009-timeline-polish-and-header, FR-005).
    expect(screen.getByText(/Temperature/)).toBeInTheDocument();
    expect(screen.getByText(/Precipitation/)).toBeInTheDocument();
    expect(screen.getByText(/^Wind/)).toBeInTheDocument();
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
    expect(container.querySelector('svg[class*="lucide-moon"]')).toBeInTheDocument();
    expect(container.querySelector('svg[class*="lucide-sun"]')).not.toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));
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
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));
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
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    const forecastLabels = await screen.findAllByText("Forecast");
    expect(forecastLabels.length).toBeGreaterThan(0);
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
