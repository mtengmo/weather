import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { addFavorite } from "../../src/services/favoritesStorage";
import { clickMenuItem } from "../helpers/headerMenu";

vi.mock("../../src/services/weatherApi", () => ({
  getObservations: vi.fn().mockResolvedValue({ status: "ready", observations: [] }),
  getNearbyStationSeries: vi.fn().mockResolvedValue([]),
  getMultiSourceForecast: vi.fn().mockResolvedValue([]),
  getUvRisk: vi.fn().mockResolvedValue(new Set()),
  getWarningsForLocation: vi.fn().mockResolvedValue([]),
}));
vi.mock("../../src/services/smhiProvider", () => ({ getNearestStations: vi.fn().mockResolvedValue([]) }));
vi.mock("../../src/services/geocoding", () => ({ reverseGeocode: vi.fn() }));
vi.mock("../../src/services/geocodingApi", () => ({ searchPlaces: vi.fn() }));

const stockholm = { latitude: 59.33, longitude: 18.06, displayName: "Stockholm", source: "favorite" };
const seaRegion = () => screen.queryByRole("region", { name: "Sea weather for Stockholm" });

describe("remembered Overview / Sea weather view", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition: (_s: unknown, e: (x: unknown) => void) => e({ code: 2 }) },
    });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("opens on the overview by default", () => {
    render(<App />);
    expect(seaRegion()).not.toBeInTheDocument();
  });

  it("reopens on sea weather after choosing it, and on overview after choosing that", async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await clickMenuItem(user, "Sea weather");
    expect(await screen.findByRole("region", { name: "Sea weather for Stockholm" })).toBeInTheDocument();
    first.unmount();

    const second = render(<App />);
    expect(await screen.findByRole("region", { name: "Sea weather for Stockholm" })).toBeInTheDocument();
    await clickMenuItem(user, "Show overview");
    expect(seaRegion()).not.toBeInTheDocument();
    second.unmount();

    render(<App />);
    expect(seaRegion()).not.toBeInTheDocument();
  });

  it("map does not change the remembered view", async () => {
    const user = userEvent.setup();
    localStorage.setItem("weather-app:last-home-view:v1", "sea");
    render(<App />);
    await clickMenuItem(user, "Rain map");
    expect(localStorage.getItem("weather-app:last-home-view:v1")).toBe("sea");
  });
});
