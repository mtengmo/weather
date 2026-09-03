import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ObservationChart from "../../src/components/ObservationChart";
import ObservationDetails from "../../src/components/ObservationDetails";
import { useObservationData } from "../../src/hooks/useObservationData";
import type {
  Location,
  NearbyStationSeries,
  ObservationSeries,
  ObservationWindow,
  WeatherMetric,
} from "../../src/models/types";

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

function series(
  window: ObservationWindow,
  observations: ObservationSeries["observations"] = [],
  status: ObservationSeries["status"] = "ready"
): ObservationSeries {
  return { location: stockholm, window, observations, status };
}

function nearbyStation(id: string, distanceKm: number): NearbyStationSeries {
  return {
    station: { id, displayName: `Station ${id}`, distanceKm, latitude: 1, longitude: 1 },
    series: series("last-24-hours", [
      {
        timestamp: new Date().toISOString(),
        temperature: 5,
        precipitation: 0,
        windSpeed: null,
        cloudCoverPercent: null,
      },
    ]),
  };
}

function ChartAndDetailsHarness({
  location,
  initialHighLowVisible = true,
  initialCombineForecastSources = false,
}: {
  location: Location;
  initialHighLowVisible?: boolean;
  initialCombineForecastSources?: boolean;
}) {
  const [window, setWindow] = useState<ObservationWindow>("last-24-hours");
  const [metric, setMetric] = useState<WeatherMetric>("temperature");
  const [highLowVisible, setHighLowVisible] = useState(initialHighLowVisible);
  const [combineForecastSources, setCombineForecastSources] = useState(initialCombineForecastSources);
  const [view, setView] = useState<"graph" | "details">("graph");
  const { series: primary, nearbyStations, multiSourceForecast } = useObservationData(
    location,
    window,
    4,
    combineForecastSources
  );

  return view === "graph" ? (
    <>
      <button type="button" aria-pressed={highLowVisible} onClick={() => setHighLowVisible((v) => !v)}>
        Toggle high/low
      </button>
      <button
        type="button"
        aria-pressed={combineForecastSources}
        onClick={() => setCombineForecastSources((v) => !v)}
      >
        Toggle combine forecast sources
      </button>
      <ObservationChart
        location={location}
        window={window}
        onWindowChange={setWindow}
        metric={metric}
        onMetricChange={setMetric}
        highLowVisible={highLowVisible}
        unit="metric"
        series={primary}
        nearbyStations={nearbyStations}
        combineForecastSources={combineForecastSources}
        multiSourceForecast={multiSourceForecast}
        onViewDetails={() => setView("details")}
        onViewOverview={() => {}}
      />
    </>
  ) : (
    <ObservationDetails
      location={location}
      window={window}
      unit="metric"
      series={primary}
      nearbyStations={nearbyStations}
      onBack={() => setView("graph")}
      onViewOverview={() => {}}
    />
  );
}

describe("US1: ObservationChart + ObservationDetails", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows a loading state, then the graph controls once data is ready", async () => {
    vi.mocked(getObservations).mockResolvedValue(series("last-24-hours", [], "ready"));

    render(<ChartAndDetailsHarness location={stockholm} />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
    await screen.findByRole("button", { name: "View details" });
    expect(screen.getByRole("button", { name: "Last 24 hours" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Last 7 days" })).toBeInTheDocument();
  });

  it("re-fetches when the window is switched to the weekly view", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => series(w));

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));

    await waitFor(() =>
      expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days")
    );
  });

  it("shows an unavailable message rather than blank data when the provider fails", async () => {
    vi.mocked(getObservations).mockResolvedValue(series("last-24-hours", [], "unavailable"));

    render(<ChartAndDetailsHarness location={stockholm} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unavailable/i);
  });

  it("opens the details table via 'View details', showing a gap indicator for null points, and 'Back to graph' returns", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [
        {
          timestamp: "2026-08-30T10:00:00Z",
          temperature: null,
          precipitation: null,
          windSpeed: null,
          cloudCoverPercent: null,
        },
      ])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);
    const viewDetails = await screen.findByRole("button", { name: "View details" });

    const user = userEvent.setup();
    await user.click(viewDetails);

    const gapCells = await screen.findAllByText("—");
    expect(gapCells.length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Back to graph" }));
    expect(await screen.findByRole("button", { name: "View details" })).toBeInTheDocument();
  });
});

describe("US1 (005): 24h forecast continuation", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  function hoursFromNow(h: number): string {
    return new Date(Date.now() + h * 3600_000).toISOString();
  }

  it("renders all four metric tabs without error when the series has trailing forecast points", async () => {
    const observations = [
      { timestamp: hoursFromNow(-1), temperature: 10, precipitation: 1, windSpeed: 3, cloudCoverPercent: 40 },
      {
        timestamp: hoursFromNow(1),
        temperature: 12,
        precipitation: 2,
        windSpeed: 4,
        cloudCoverPercent: 50,
        isForecast: true,
      },
    ];
    vi.mocked(getObservations).mockResolvedValue(series("last-24-hours", observations));

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    const user = userEvent.setup();
    for (const tab of ["Temperature", "Wind", "Cloud coverage", "Rain"]) {
      await user.click(screen.getByRole("button", { name: tab }));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }
  });

  it("marks upcoming hours as forecast and past hours as observed in the details table", async () => {
    const observations = [
      { timestamp: hoursFromNow(-1), temperature: 10, precipitation: 1, windSpeed: null, cloudCoverPercent: null },
      {
        timestamp: hoursFromNow(1),
        temperature: 12,
        precipitation: 2,
        windSpeed: null,
        cloudCoverPercent: null,
        isForecast: true,
      },
    ];
    vi.mocked(getObservations).mockResolvedValue(series("last-24-hours", observations));

    render(<ChartAndDetailsHarness location={stockholm} />);
    const viewDetails = await screen.findByRole("button", { name: "View details" });
    await userEvent.setup().click(viewDetails);

    expect(await screen.findByText("Observed")).toBeInTheDocument();
    expect(screen.getByText("Forecast")).toBeInTheDocument();
  });

  it("shows the forecast-unavailable message (not a crash) when observed data exists but the forecast fetch returned nothing (006-forecast-now-marker supersedes the original silent-degrade behavior)", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [
        { timestamp: hoursFromNow(-1), temperature: 10, precipitation: 1, windSpeed: 3, cloudCoverPercent: 40 },
      ])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    expect(await screen.findByRole("alert")).toHaveTextContent(/forecast isn't available/i);
  });
});

describe("US1 (006): now marker", () => {
  // Recharts' <ResponsiveContainer> doesn't measure a real size under jsdom (confirmed by
  // the "renders the Rain tab without error" test elsewhere in this file), so the SVG never
  // actually paints and the ReferenceLine's "Now" label can't be queried here. The marker's
  // positioning logic itself (forecastBoundaryValue) is covered directly in chartData.test.ts;
  // these tests only confirm ObservationChart doesn't error when rendering it across every
  // metric tab and window, with and without forecast data present.
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  function hoursFromNow(h: number): string {
    return new Date(Date.now() + h * 3600_000).toISOString();
  }

  const forecastCarryingObservations = [
    { timestamp: hoursFromNow(-1), temperature: 10, precipitation: 1, windSpeed: 3, cloudCoverPercent: 40 },
    {
      timestamp: hoursFromNow(1),
      temperature: 12,
      precipitation: 2,
      windSpeed: 4,
      cloudCoverPercent: 50,
      isForecast: true,
    },
  ];

  it("renders every metric tab without error for a 24h series with forecast points (now-marker branch exercised)", async () => {
    vi.mocked(getObservations).mockResolvedValue(series("last-24-hours", forecastCarryingObservations));

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    const user = userEvent.setup();
    for (const tab of ["Temperature", "Wind", "Cloud coverage", "Rain"]) {
      await user.click(screen.getByRole("button", { name: tab }));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }
  });

  it("renders the temperature and wind tabs without error for a 7-day series with forecast buckets", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) =>
      series(w, w === "last-7-days" ? forecastCarryingObservations : [])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Wind" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the forecast-unavailable message (no marker to draw) when the series has no forecast points", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [forecastCarryingObservations[0]])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    expect(await screen.findByRole("alert")).toHaveTextContent(/forecast isn't available/i);
  });

  it("renders the 30-day view without error even if the underlying series happens to carry isForecast points", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) =>
      series(w, w === "last-30-days" ? forecastCarryingObservations : [])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Last 30 days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-30-days"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("US2 (006): forecast fallback, unavailable message, source indicator", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  function hoursFromNow(h: number): string {
    return new Date(Date.now() + h * 3600_000).toISOString();
  }

  it("shows no unavailable message and no source-indicator suffix for the common case (forecast present, no fallback flag)", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [
        { timestamp: hoursFromNow(-1), temperature: 10, precipitation: 1, windSpeed: 3, cloudCoverPercent: 40 },
        {
          timestamp: hoursFromNow(1),
          temperature: 12,
          precipitation: 2,
          windSpeed: 4,
          cloudCoverPercent: 50,
          isForecast: true,
        },
      ])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the unavailable message when the series has zero forecast points for a forecast-expecting window", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [
        { timestamp: hoursFromNow(-1), temperature: 10, precipitation: 1, windSpeed: 3, cloudCoverPercent: 40 },
      ])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    expect(await screen.findByRole("alert")).toHaveTextContent(/forecast isn't available/i);
  });

  it("renders without error across all four metric tabs when forecastFromFallbackSource is true", async () => {
    // As with the "now" marker (see the US1 (006) describe block above), Recharts' <Legend>
    // is part of the same chart tree that never paints under jsdom's zero-size
    // <ResponsiveContainer>, so the source-indicator suffix text can't be queried here. This
    // confirms the `forecastFromFallbackSource`-driven branch renders cleanly across every
    // metric; the suffix text itself is a one-line ternary reviewable directly in
    // ObservationChart.tsx.
    vi.mocked(getObservations).mockResolvedValue({
      ...series("last-24-hours", [
        { timestamp: hoursFromNow(-1), temperature: 10, precipitation: 1, windSpeed: 3, cloudCoverPercent: 40 },
        {
          timestamp: hoursFromNow(1),
          temperature: 12,
          precipitation: 2,
          windSpeed: 4,
          cloudCoverPercent: 50,
          isForecast: true,
        },
      ]),
      forecastFromFallbackSource: true,
    });

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    const user = userEvent.setup();
    for (const tab of ["Temperature", "Wind", "Cloud coverage", "Rain"]) {
      await user.click(screen.getByRole("button", { name: tab }));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }
  });

  it("never shows the unavailable message on the 30-day view even with forecastFromFallbackSource set", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) =>
      w === "last-30-days"
        ? {
            ...series(w, [
              { timestamp: hoursFromNow(-1), temperature: 10, precipitation: 1, windSpeed: 3, cloudCoverPercent: 40 },
            ]),
            forecastFromFallbackSource: true,
          }
        : series(w, [])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Last 30 days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-30-days"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("US2 (005): 7-day forecast continuation", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  function hoursFromNow(h: number): string {
    return new Date(Date.now() + h * 3600_000).toISOString();
  }

  function weeklyObservations(forecastDays: number) {
    const past = Array.from({ length: 7 * 24 }, (_, i) => ({
      timestamp: hoursFromNow(-(i + 1)),
      temperature: 10,
      precipitation: 1,
      windSpeed: 3,
      cloudCoverPercent: 40,
    }));
    const forecast = Array.from({ length: forecastDays * 24 }, (_, i) => ({
      timestamp: hoursFromNow(i + 1),
      temperature: 12,
      precipitation: 2,
      windSpeed: 4,
      cloudCoverPercent: 50,
      isForecast: true,
    }));
    return [...past, ...forecast];
  }

  it("renders the temperature and wind tabs' 7-day forecast continuation with highLowVisible on and off", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) =>
      series(w, w === "last-7-days" ? weeklyObservations(7) : [])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Wind" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Toggle high/low" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows no fabricated forecast days beyond what the provider returned in the details table", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) =>
      series(w, w === "last-7-days" ? weeklyObservations(3) : [])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "View details" });
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));

    const viewDetails = await screen.findByRole("button", { name: "View details" });
    await user.click(viewDetails);

    const rows = await screen.findAllByRole("row");
    // header + 7 observed days + exactly 3 forecast days.
    expect(rows).toHaveLength(1 + 7 + 3);
    expect(screen.getAllByText("Forecast")).toHaveLength(3);
  });

  it("does not render forecast continuation on the 30-day view even when observations happen to include isForecast points", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => {
      if (w === "last-30-days") {
        return series(w, weeklyObservations(2));
      }
      return series(w, []);
    });
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);

    function Harness30() {
      return <ChartAndDetailsHarness location={stockholm} />;
    }

    render(<Harness30 />);
    const user = userEvent.setup();
    await screen.findByRole("button", { name: "View details" });
    await user.click(screen.getByRole("button", { name: "Last 30 days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-30-days"));

    const viewDetails = await screen.findByRole("button", { name: "View details" });
    await user.click(viewDetails);

    await screen.findByRole("table");
    expect(screen.queryByText("Forecast")).not.toBeInTheDocument();
    expect(screen.queryByText("Status")).not.toBeInTheDocument();
  });
});

describe("US4: nearby weather station comparison", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
  });

  it("shows comparison-station columns in the details table for an SMHI-covered location", async () => {
    vi.mocked(getObservations).mockResolvedValue(series("last-24-hours"));
    vi.mocked(getNearbyStationSeries).mockResolvedValue([
      nearbyStation("a", 3.2),
      nearbyStation("b", 7.9),
    ]);

    render(<ChartAndDetailsHarness location={stockholm} />);
    const viewDetails = await screen.findByRole("button", { name: "View details" });
    await userEvent.setup().click(viewDetails);

    expect(await screen.findByText(/Station a \(3.2 km\)/)).toBeInTheDocument();
    expect(screen.getByText(/Station b \(7.9 km\)/)).toBeInTheDocument();
  });

  it("shows no comparison columns when no nearby stations are available (non-SMHI location)", async () => {
    vi.mocked(getObservations).mockResolvedValue(series("last-24-hours"));
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);

    render(<ChartAndDetailsHarness location={stockholm} />);
    const viewDetails = await screen.findByRole("button", { name: "View details" });
    await userEvent.setup().click(viewDetails);

    await screen.findByRole("table");
    expect(screen.queryByText(/Station/)).not.toBeInTheDocument();
  });

  it("still renders successfully when one comparison station has no data (omitted upstream)", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [
        {
          timestamp: new Date().toISOString(),
          temperature: 5,
          precipitation: 0,
          windSpeed: null,
          cloudCoverPercent: null,
          isForecast: true,
        },
      ])
    );
    // Simulates weatherApi.getNearbyStationSeries already having dropped the failed station.
    vi.mocked(getNearbyStationSeries).mockResolvedValue([nearbyStation("a", 3.2)]);

    render(<ChartAndDetailsHarness location={stockholm} />);

    await screen.findByRole("button", { name: "View details" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("003 US2/US3: metric tabs and Rain-tab comparison bars", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
  });

  function fullObservation(overrides: Partial<ObservationSeries["observations"][number]> = {}) {
    return {
      timestamp: new Date().toISOString(),
      temperature: 10,
      precipitation: 1,
      windSpeed: 3,
      cloudCoverPercent: 40,
      ...overrides,
    };
  }

  it("switching tabs updates the active tab without re-fetching (FR-005)", async () => {
    vi.mocked(getObservations).mockResolvedValue(series("last-24-hours", [fullObservation()]));
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });
    expect(getObservations).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Temperature" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    const user = userEvent.setup();
    for (const tab of ["Wind", "Cloud coverage", "Rain", "Temperature"]) {
      await user.click(screen.getByRole("button", { name: tab }));
      expect(screen.getByRole("button", { name: tab })).toHaveAttribute("aria-pressed", "true");
    }

    // Tab switches are pure display state — no additional fetches (FR-005).
    expect(getObservations).toHaveBeenCalledTimes(1);
  });

  it("shows an unavailable message for a metric with no data for this location", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [fullObservation({ windSpeed: null })])
    );
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    await userEvent.setup().click(screen.getByRole("button", { name: "Wind" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/wind speed data is not available/i);
  });

  it("renders the Rain tab without error for a location with nearby stations selected", async () => {
    // Recharts' <ResponsiveContainer> doesn't measure a real size under jsdom, so this
    // only verifies the tab renders cleanly; the per-station bar-series row data itself
    // (the part User Story 3 actually adds) is covered directly in chartData.test.ts.
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [fullObservation(), fullObservation({ isForecast: true })])
    );
    vi.mocked(getNearbyStationSeries).mockResolvedValue([
      nearbyStation("a", 3.2),
      nearbyStation("b", 7.9),
    ]);

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    await userEvent.setup().click(screen.getByRole("button", { name: "Rain" }));
    expect(screen.getByRole("button", { name: "Rain" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("004 US3: high/low visibility toggle", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("defaults to visible (on)", async () => {
    vi.mocked(getObservations).mockResolvedValue(series("last-24-hours"));

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    expect(screen.getByRole("button", { name: "Toggle high/low" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("toggling off and back on updates the toggle state without an extra fetch, on the 7-day temperature view", async () => {
    vi.mocked(getObservations).mockImplementation(async (_loc, w) => series(w));

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-7-days"));
    const fetchCountAfterWindowSwitch = vi.mocked(getObservations).mock.calls.length;

    const toggle = screen.getByRole("button", { name: "Toggle high/low" });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    // Toggling is a pure display preference — no additional fetches (research.md §3).
    expect(getObservations).toHaveBeenCalledTimes(fetchCountAfterWindowSwitch);
  });

  it("does not affect the 24-hour view or the details table", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [
        {
          timestamp: "2026-08-30T10:00:00Z",
          temperature: 12,
          precipitation: 0,
          windSpeed: null,
          cloudCoverPercent: null,
        },
        {
          timestamp: new Date(Date.now() + 3600_000).toISOString(),
          temperature: 13,
          precipitation: 0,
          windSpeed: null,
          cloudCoverPercent: null,
          isForecast: true,
        },
      ])
    );

    render(<ChartAndDetailsHarness location={stockholm} initialHighLowVisible={false} />);
    const viewDetails = await screen.findByRole("button", { name: "View details" });

    // 24h view renders fine with the toggle off.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // The details table is unaffected by the toggle — still renders normally.
    await userEvent.setup().click(viewDetails);
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});

describe("004 US4: wind graph reuses the high/low/average setup", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("renders the Wind tab's 7-day view without error, and the high/low toggle applies to it too", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [
        {
          timestamp: new Date().toISOString(),
          temperature: 10,
          precipitation: 0,
          windSpeed: 4,
          cloudCoverPercent: null,
        },
        {
          timestamp: new Date(Date.now() + 3600_000).toISOString(),
          temperature: 11,
          precipitation: 0,
          windSpeed: 5,
          cloudCoverPercent: null,
          isForecast: true,
        },
      ])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Wind" }));
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Toggle high/low" });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("US3: switching locations re-fetches the chart's data", () => {
  it("fetches the new location's observations when the selected location changes", async () => {
    vi.mocked(getObservations).mockImplementation(async () => series("last-24-hours"));
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);

    const paris: Location = { latitude: 48.85, longitude: 2.35, displayName: "Paris", source: "favorite" };

    const { rerender } = render(<ChartAndDetailsHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(stockholm, "last-24-hours"));

    rerender(<ChartAndDetailsHarness location={paris} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(paris, "last-24-hours"));
  });
});

describe("US5: mirrored axis and point dots (013-overview-default-and-layout)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  function fullObservation(overrides: Partial<ObservationSeries["observations"][number]> = {}) {
    return {
      timestamp: new Date().toISOString(),
      temperature: 10,
      precipitation: 1,
      windSpeed: 3,
      cloudCoverPercent: 40,
      ...overrides,
    };
  }

  // Recharts' <ResponsiveContainer> never gets real dimensions under jsdom (confirmed: width
  // resolves to 0), so it doesn't render its inner <svg>/axes/lines/dots at all — matching this
  // repo's established precedent (008 research.md) that Recharts-based chart tests can only be
  // smoke tests here, not structural assertions on axis/dot elements. These tests confirm the
  // mirrored-axis and dot-marker JSX added for FR-015/FR-016 doesn't throw or regress any
  // metric tab, for both the 24-hour and multi-day (high/low/average) code paths.
  it("renders every single-scale metric tab without error at both 24h and 7-day windows", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [fullObservation(), fullObservation({ isForecast: true })])
    );

    const user = userEvent.setup();
    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    for (const tab of ["Rain", "Wind", "Cloud coverage"]) {
      await user.click(screen.getByRole("button", { name: tab }));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }

    await user.click(screen.getByRole("button", { name: "Last 7 days" }));
    for (const tab of ["Rain", "Wind", "Cloud coverage"]) {
      await user.click(screen.getByRole("button", { name: tab }));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }
  });

  it("renders the temperature chart (unmirrored, two distinct metric scales) without error", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [fullObservation(), fullObservation({ isForecast: true })])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    expect(screen.getByRole("button", { name: "Temperature" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("US6: observed high/low note (013-overview-default-and-layout)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows the correct high and low with times for a window with observed data", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [
        { timestamp: "2026-09-01T04:00:00.000Z", temperature: 9, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        { timestamp: "2026-09-01T15:00:00.000Z", temperature: 24, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      ])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);

    const note = await screen.findByText(/^High: /);
    expect(note.textContent).toMatch(/High: 24°C/);
    expect(note.textContent).toMatch(/Low: 9°C/);
  });

  it("shows no note for an all-forecast window", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [
        {
          timestamp: new Date(Date.now() + 3600_000).toISOString(),
          temperature: 20,
          precipitation: 0,
          windSpeed: 1,
          cloudCoverPercent: 5,
          isForecast: true,
        },
      ])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    expect(screen.queryByText(/^High: /)).not.toBeInTheDocument();
  });

  it("shows no note for a metric other than temperature", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [
        { timestamp: "2026-09-01T04:00:00.000Z", temperature: 9, precipitation: 1, windSpeed: 1, cloudCoverPercent: 5 },
      ])
    );

    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    await userEvent.setup().click(screen.getByRole("button", { name: "Rain" }));

    expect(screen.queryByText(/^High: /)).not.toBeInTheDocument();
  });
});

describe("US4: data source note (013-overview-default-and-layout)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("shows 'Data: SMHI' when primarySource is smhi with no forecast fallback", async () => {
    vi.mocked(getObservations).mockResolvedValue({ ...series("last-24-hours"), primarySource: "smhi" });

    render(<ChartAndDetailsHarness location={stockholm} />);

    expect(await screen.findByText("Data: SMHI")).toBeInTheDocument();
  });

  it("shows 'Data: SMHI (forecast: Open-Meteo)' when the forecast came from the fallback", async () => {
    vi.mocked(getObservations).mockResolvedValue({
      ...series("last-24-hours"),
      primarySource: "smhi",
      forecastFromFallbackSource: true,
    });

    render(<ChartAndDetailsHarness location={stockholm} />);

    expect(await screen.findByText("Data: SMHI (forecast: Open-Meteo)")).toBeInTheDocument();
  });

  it("shows 'Data: Open-Meteo' when primarySource is open-meteo", async () => {
    vi.mocked(getObservations).mockResolvedValue({ ...series("last-24-hours"), primarySource: "open-meteo" });

    render(<ChartAndDetailsHarness location={stockholm} />);

    expect(await screen.findByText("Data: Open-Meteo")).toBeInTheDocument();
  });

  it("shows no note when primarySource is absent", async () => {
    vi.mocked(getObservations).mockResolvedValue(series("last-24-hours"));

    render(<ChartAndDetailsHarness location={stockholm} />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());

    expect(screen.queryByText(/^Data:/)).not.toBeInTheDocument();
  });
});

describe("Combine forecast sources (014-dashboard-usability-fixes, US7)", () => {
  // Same jsdom/Recharts limitation noted throughout this file — these are smoke tests
  // confirming the toggle wires up and renders without error, not structural line assertions.
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getMultiSourceForecast).mockReset();
    vi.mocked(getMultiSourceForecast).mockResolvedValue([]);
  });

  it("fetches multi-source forecasts only once the toggle is switched on", async () => {
    vi.mocked(getObservations).mockResolvedValue(series("last-24-hours"));

    const user = userEvent.setup();
    render(<ChartAndDetailsHarness location={stockholm} />);
    await screen.findByRole("button", { name: "View details" });

    expect(getMultiSourceForecast).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Toggle combine forecast sources" }));
    await waitFor(() => expect(getMultiSourceForecast).toHaveBeenCalledWith(stockholm, "last-24-hours"));
  });

  it("renders without error when two sources are returned", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [
        { timestamp: new Date().toISOString(), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        {
          timestamp: new Date(Date.now() + 3600_000).toISOString(),
          temperature: 11,
          precipitation: 0,
          windSpeed: 1,
          cloudCoverPercent: 5,
          isForecast: true,
        },
      ])
    );
    vi.mocked(getMultiSourceForecast).mockResolvedValue([
      {
        source: "smhi",
        observations: [
          {
            timestamp: new Date(Date.now() + 3600_000).toISOString(),
            temperature: 10,
            precipitation: 0,
            windSpeed: null,
            cloudCoverPercent: null,
            isForecast: true,
          },
        ],
      },
      {
        source: "open-meteo",
        observations: [
          {
            timestamp: new Date(Date.now() + 3600_000).toISOString(),
            temperature: 12,
            precipitation: 0,
            windSpeed: null,
            cloudCoverPercent: null,
            isForecast: true,
          },
        ],
      },
    ]);

    const user = userEvent.setup();
    render(<ChartAndDetailsHarness location={stockholm} initialCombineForecastSources />);
    await screen.findByRole("button", { name: "View details" });
    await waitFor(() => expect(getMultiSourceForecast).toHaveBeenCalled());

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // Turning it off leaves the ordinary single-source rendering unaffected.
    await user.click(screen.getByRole("button", { name: "Toggle combine forecast sources" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders without error when only one source has data (no misleading average)", async () => {
    vi.mocked(getObservations).mockResolvedValue(
      series("last-24-hours", [
        { timestamp: new Date().toISOString(), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
        {
          timestamp: new Date(Date.now() + 3600_000).toISOString(),
          temperature: 11,
          precipitation: 0,
          windSpeed: 1,
          cloudCoverPercent: 5,
          isForecast: true,
        },
      ])
    );
    vi.mocked(getMultiSourceForecast).mockResolvedValue([{ source: "smhi", observations: [] }]);

    render(<ChartAndDetailsHarness location={stockholm} initialCombineForecastSources />);
    await screen.findByRole("button", { name: "View details" });
    await waitFor(() => expect(getMultiSourceForecast).toHaveBeenCalled());

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
