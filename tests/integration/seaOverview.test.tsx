import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SeaOverview from "../../src/components/SeaOverview";
import { clearSeaDataCache } from "../../src/hooks/useSeaData";
import { useObservationData } from "../../src/hooks/useObservationData";
import type { Location, ObservationWindow } from "../../src/models/types";

vi.mock("../../src/services/weatherApi", () => ({
  getObservations: vi.fn(),
  getNearbyStationSeries: vi.fn().mockResolvedValue([]),
  getMultiSourceForecast: vi.fn().mockResolvedValue([]),
  getUvRisk: vi.fn().mockResolvedValue(new Set()),
  getWarningsForLocation: vi.fn().mockResolvedValue([]),
}));

import { getObservations } from "../../src/services/weatherApi";

const H = 3_600_000;
const NOW = new Date(2026, 5, 15, 12, 0, 0).getTime();

const coast: Location = { latitude: 59.3, longitude: 18.1, displayName: "Stockholm", source: "favorite" };

const iso = (hoursFromNow: number) => new Date(NOW + hoursFromNow * H).toISOString();

function weatherObservations() {
  return [-2, -1, 0, 1, 2, 3].map((h) => ({
    timestamp: iso(h),
    temperature: 10 + h,
    precipitation: h === 2 ? 1.5 : 0,
    windSpeed: 5,
    windGust: 9,
    windDirection: 225,
    cloudCoverPercent: h === 2 ? 90 : 5,
    isForecast: h >= 1,
  }));
}

function marineBody(withCurrent: boolean) {
  const times: number[] = [];
  for (let h = -48; h <= 48; h++) times.push((NOW + h * H) / 1000);
  const fill = (v: number | null) => times.map(() => v);
  return {
    hourly_units: { ocean_current_velocity: "m/s" },
    hourly: {
      time: times,
      wave_height: fill(1.2),
      wave_direction: fill(200),
      wave_period: fill(5),
      wind_wave_height: fill(0.8),
      swell_wave_height: fill(0.5),
      swell_wave_direction: fill(180),
      swell_wave_period: fill(9),
      sea_surface_temperature: fill(13),
      sea_level_height_msl: fill(0.04),
      ocean_current_velocity: fill(withCurrent ? 0.3 : null),
      ocean_current_direction: fill(withCurrent ? 90 : null),
    },
  };
}

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

function stubFetch({ marineFails = false, withCurrent = false } = {}) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("marine-api.open-meteo.com")) {
      if (marineFails) throw new Error("network down");
      return ok(marineBody(withCurrent));
    }
    const station = /parameter\/(\d+)(\.json|\/station\/9\/period)/.exec(url);
    if (station && url.endsWith(".json") && !url.includes("/station/")) {
      return ok({
        station: [{ key: "9", title: "Param - Kungsholmen", summary: "Latitud: 59.3 Longitud: 18.1", active: true }],
      });
    }
    if (station) {
      const value = { "12": 15, "5": 14.4, "1": 0.9 }[station[1] as "12" | "5" | "1"];
      return ok({ value: [{ date: NOW - 30 * 60_000, value }] });
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

function Harness() {
  const [window, setWindow] = useState<ObservationWindow>("last-24-hours");
  const { series, multiSourceForecast, weeklySeries, uvRiskHours } = useObservationData(coast, window, 0, false);
  return (
    <SeaOverview
      location={coast}
      window={window}
      onWindowChange={setWindow}
      unit="metric"
      series={series}
      highLowVisible={false}
      multiSourceForecast={multiSourceForecast}
      weeklySeries={weeklySeries}
      uvRiskHours={uvRiskHours}
    />
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(NOW) });
  clearSeaDataCache();
  vi.mocked(getObservations).mockReset();
  vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
    location: coast,
    window: w,
    status: "ready",
    observations: weatherObservations(),
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const rowTitle = (container: HTMLElement, key: string) =>
  container.querySelector(`.weather-timeline-row-${key} .weather-timeline-row-title`);

describe("SeaOverview", () => {
  it("shows the sea summary with waves, sea temperature and water level", async () => {
    stubFetch();
    render(<Harness />);
    const card = await screen.findByRole("region", { name: "At sea now" });
    await waitFor(() => expect(within(card).getByText("Water level")).toBeInTheDocument());

    expect(within(card).getByText(/^0\.9 m · 5 s/)).toBeInTheDocument(); // observed height, model period
    expect(within(card).getByText("14.4°")).toBeInTheDocument();
    expect(within(card).getByText("+15 cm")).toBeInTheDocument();
    expect(within(card).getByText(/^5 \(9\) m\/s/)).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /SMHI/ })).toHaveAttribute(
      "href",
      "https://www.smhi.se/vader/vader-till-havs/hav--och-kustvader"
    );
  });

  it("renders the weather rows plus waves, swell, sea temperature and water level, but no current without data", async () => {
    stubFetch();
    const { container } = render(<Harness />);
    await waitFor(() => expect(rowTitle(container, "waves")).toBeInTheDocument());

    expect(rowTitle(container, "waves")).toHaveTextContent(/^Waves/);
    expect(rowTitle(container, "swell")).toHaveTextContent(/^Swell/);
    expect(rowTitle(container, "seaTemperature")).toHaveTextContent(/^Sea temp/);
    expect(rowTitle(container, "waterLevel")).toHaveTextContent(/^Water level/);
    expect(rowTitle(container, "current")).not.toBeInTheDocument();
    expect(rowTitle(container, "temperature")).toBeInTheDocument();
    expect(rowTitle(container, "wind")).toBeInTheDocument();
    expect(container.querySelector(".weather-timeline-row-snow")).not.toBeInTheDocument();
    expect(container.querySelector(".weather-timeline-row-waves-values")).toHaveTextContent("1.2 m");
    expect(container.querySelector(".weather-timeline-row-waves .weather-timeline-bar.wave-level-3")).toBeInTheDocument();
    expect(rowTitle(container, "waves")).toHaveTextContent("Kungsholmen · 0 km");
    expect(rowTitle(container, "swell")).toHaveTextContent("Model forecast (no station)");
    expect(rowTitle(container, "waterLevel")).toHaveTextContent("Kungsholmen · 0 km");
  });

  it("adds a current row when current data exists", async () => {
    stubFetch({ withCurrent: true });
    const { container } = render(<Harness />);
    await waitFor(() => expect(rowTitle(container, "current")).toHaveTextContent(/^Current/));
  });

  it("shows a condition icon for every column and one Now marker", async () => {
    stubFetch();
    const { container } = render(<Harness />);
    await waitFor(() => expect(rowTitle(container, "waves")).toBeInTheDocument());

    const cells = container.querySelectorAll(".weather-timeline-condition");
    expect(cells).toHaveLength(6);
    cells.forEach((cell) => expect(cell.querySelector("img, svg")).toBeInTheDocument());
    expect(container.querySelectorAll(".weather-timeline-now")).toHaveLength(1);
  });

  it("switches between 24h, 3d and 7d", async () => {
    stubFetch();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<Harness />);
    await waitFor(() => expect(rowTitle(container, "waves")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "24 Hours" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "3 Days" }));
    expect(screen.getByRole("button", { name: "3 Days" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(rowTitle(container, "waves")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "7 Days" }));
    expect(screen.getByRole("button", { name: "7 Days" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(rowTitle(container, "waterLevel")).toBeInTheDocument());
  });

  it("still renders the weather rows and an error message when the marine fetch fails", async () => {
    stubFetch({ marineFails: true });
    const { container } = render(<Harness />);

    expect(await screen.findByText("Could not load sea data.")).toBeInTheDocument();
    await waitFor(() => expect(container.querySelectorAll(".weather-timeline-condition")).toHaveLength(6));
    expect(rowTitle(container, "temperature")).toBeInTheDocument();
    expect(rowTitle(container, "wind")).toBeInTheDocument();
    expect(rowTitle(container, "swell")).not.toBeInTheDocument();
    // SMHI observations still provide water level and sea temperature.
    await waitFor(() => expect(rowTitle(container, "waterLevel")).toBeInTheDocument());
  });
});
