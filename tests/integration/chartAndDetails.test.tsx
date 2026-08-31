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
}));

import { getNearbyStationSeries, getObservations } from "../../src/services/weatherApi";

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
}: {
  location: Location;
  initialHighLowVisible?: boolean;
}) {
  const [window, setWindow] = useState<ObservationWindow>("last-24-hours");
  const [metric, setMetric] = useState<WeatherMetric>("temperature");
  const [highLowVisible, setHighLowVisible] = useState(initialHighLowVisible);
  const [view, setView] = useState<"graph" | "details">("graph");
  const { series: primary, nearbyStations } = useObservationData(location, window, 4);

  return view === "graph" ? (
    <>
      <button type="button" aria-pressed={highLowVisible} onClick={() => setHighLowVisible((v) => !v)}>
        Toggle high/low
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
        onViewDetails={() => setView("details")}
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
    vi.mocked(getObservations).mockResolvedValue(series("last-24-hours"));
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
    vi.mocked(getObservations).mockResolvedValue(series("last-24-hours", [fullObservation()]));
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
