import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import type { Location, WeatherWarning } from "../../src/models/types";

vi.mock("../../src/services/weatherApi", () => ({
  getObservations: vi.fn(),
  getNearbyStationSeries: vi.fn(),
  getMultiSourceForecast: vi.fn().mockResolvedValue([]),
  getUvRisk: vi.fn().mockResolvedValue(new Set()),
  getWarningsForLocation: vi.fn(),
}));
vi.mock("../../src/services/smhiProvider", () => ({
  getNearestStations: vi.fn(),
}));

import { getNearbyStationSeries, getObservations, getWarningsForLocation } from "../../src/services/weatherApi";
import { getNearestStations } from "../../src/services/smhiProvider";
import { addFavorite } from "../../src/services/favoritesStorage";

const stockholm: Location = {
  latitude: 59.33,
  longitude: 18.06,
  displayName: "Stockholm",
  source: "favorite",
};

function warning(overrides: Partial<WeatherWarning> = {}): WeatherWarning {
  return {
    id: "1-100",
    severityCode: "CLASS_1",
    severityLabel: "Class 1",
    title: "Storm",
    areaName: "Stockholm County",
    description: "Strong winds expected.",
    validFrom: new Date(Date.now() - 3600_000).toISOString(),
    validUntil: null,
    ...overrides,
  };
}

function mockGeolocation() {
  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition: vi.fn((_success: PositionCallback, error?: PositionErrorCallback) => {
        error?.({
          code: 2,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: "",
        } as GeolocationPositionError);
      }),
    },
  });
}

describe("WarningBanner (028-severe-weather-warnings)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocation();
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [],
    });
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getNearestStations).mockReset();
    vi.mocked(getNearestStations).mockResolvedValue([]);
    vi.mocked(getWarningsForLocation).mockReset();
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: stockholm.displayName });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows nothing when there are no active warnings", async () => {
    vi.mocked(getWarningsForLocation).mockResolvedValue([]);

    render(<App />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());

    expect(screen.queryByRole("region", { name: "Weather warnings" })).not.toBeInTheDocument();
  });

  it("shows the collapsed summary for one active warning, expandable to the full description", async () => {
    vi.mocked(getWarningsForLocation).mockResolvedValue([warning()]);

    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());

    const banner = await screen.findByRole("region", { name: "Weather warnings" });
    expect(banner).toHaveTextContent("Class 1");
    expect(banner).toHaveTextContent("Storm");
    expect(banner).not.toHaveTextContent("Strong winds expected.");

    await user.click(within(banner).getByRole("button"));

    expect(banner).toHaveTextContent("Strong winds expected.");
    expect(banner).toHaveTextContent("Stockholm County");
  });

  it("leads with the most severe warning and lists every warning when expanded", async () => {
    vi.mocked(getWarningsForLocation).mockResolvedValue([
      warning({ id: "1-100", severityCode: "CLASS_3", severityLabel: "Class 3", title: "Extreme storm" }),
      warning({ id: "2-200", severityCode: "MESSAGE", severityLabel: "Message", title: "Water shortage" }),
    ]);

    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());

    const banner = await screen.findByRole("region", { name: "Weather warnings" });
    expect(banner).toHaveTextContent("Extreme storm");
    expect(banner).toHaveTextContent("+1 more");

    await user.click(within(banner).getByRole("button"));

    expect(banner).toHaveTextContent("Extreme storm");
    expect(banner).toHaveTextContent("Water shortage");
  });

  it("shows nothing while the warnings fetch is still pending, and the rest of the page still loads", async () => {
    vi.mocked(getWarningsForLocation).mockReturnValue(new Promise(() => {})); // never resolves

    render(<App />);
    await waitFor(() => expect(getObservations).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText(/Stockholm/).length).toBeGreaterThan(0));

    expect(screen.queryByRole("region", { name: "Weather warnings" })).not.toBeInTheDocument();
  });
});
