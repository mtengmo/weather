import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../src/App";
import type { Location } from "../../src/models/types";

vi.mock("../../src/services/weatherApi", () => ({
  getObservations: vi.fn(),
  getNearbyStationSeries: vi.fn(),
}));
vi.mock("../../src/services/smhiProvider", () => ({
  getNearestStations: vi.fn(),
}));
vi.mock("../../src/services/geocoding", () => ({
  reverseGeocode: vi.fn(),
}));
vi.mock("../../src/services/geocodingApi", () => ({
  searchPlaces: vi.fn(),
}));

import { getNearbyStationSeries, getObservations } from "../../src/services/weatherApi";
import { getNearestStations } from "../../src/services/smhiProvider";
import { addFavorite } from "../../src/services/favoritesStorage";

const stockholm: Location = {
  latitude: 59.33,
  longitude: 18.06,
  displayName: "Stockholm",
  source: "favorite",
};

function mockGeolocation(behavior: "success" | "unavailable" = "unavailable") {
  const getCurrentPosition = vi.fn(
    (success: PositionCallback, error?: PositionErrorCallback) => {
      if (behavior === "success") {
        success({
          coords: { latitude: 59.33, longitude: 18.06, accuracy: 1 },
        } as GeolocationPosition);
      } else if (error) {
        error({
          code: 2,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: "",
        } as GeolocationPositionError);
      }
    }
  );
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
}

describe("App header consolidation (009-timeline-polish-and-header, US1)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocation("unavailable");
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getNearestStations).mockReset();
    vi.mocked(getNearestStations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("has no standalone 'Weather History' heading and contains search and favorites in the header", () => {
    render(<App />);

    expect(screen.queryByRole("heading", { name: "Weather History" })).not.toBeInTheDocument();

    const header = screen.getByRole("banner");
    expect(header).toContainElement(screen.getByLabelText("Search for a place"));
    expect(header).toContainElement(screen.getByText("Favorite places"));
  });
});

describe("Cached location restore (009-timeline-polish-and-header, US4)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocation("unavailable");
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("restores a cached favorite on load without requiring re-selection", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    render(<App />);

    expect(await screen.findByRole("heading", { name: /Stockholm/ })).toBeInTheDocument();
  });

  it("falls back to default behavior when no location is cached", async () => {
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't determine your current location/i);
    expect(screen.queryByRole("heading", { name: /Stockholm/ })).not.toBeInTheDocument();
  });

  it("falls back to default behavior when the cached favorite no longer exists", async () => {
    // No addFavorite call — the cached favorite has since been removed.
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't determine your current location/i);
    expect(screen.queryByRole("heading", { name: /Stockholm/ })).not.toBeInTheDocument();
  });
});
