import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../src/App";
import i18n from "../../src/i18n";

vi.mock("../../src/services/weatherApi", () => ({
  getObservations: vi.fn(),
  getNearbyStationSeries: vi.fn(),
  getMultiSourceForecast: vi.fn().mockResolvedValue([]),
  getUvRisk: vi.fn().mockResolvedValue(new Set()),
  getWarningsForLocation: vi.fn().mockResolvedValue([]),
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

function mockGeolocationUnavailable() {
  const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback) => {
    error?.({
      code: 2,
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
      message: "",
    } as GeolocationPositionError);
  });
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition }, language: "en-US", languages: ["en-US"] });
}

// These tests drive language via i18n.changeLanguage rather than by re-triggering browser
// detection (the app only detects once, at module-init time, per spec.md's Assumptions) — this
// still exercises the real resource files and the real rendered output for both languages
// (064-swedish-translation, SC-001).
describe("Swedish translation rendering (064-swedish-translation)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocationUnavailable();
  });

  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders Swedish text when the language is Swedish", async () => {
    await i18n.changeLanguage("sv");
    render(<App />);

    expect(screen.getByRole("button", { name: "Karta" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Vi kunde inte fastställa din nuvarande plats. Sök efter en plats nedan, eller välj en sparad favorit, för att se dess väderhistorik istället."
      )
    ).toBeInTheDocument();
  });

  it("renders English text (unchanged) when the language is English", async () => {
    await i18n.changeLanguage("en");
    render(<App />);

    expect(screen.getByRole("button", { name: "Map" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "We couldn't determine your current location. Search for a place below, or pick a saved favorite, to see its weather history instead."
      )
    ).toBeInTheDocument();
  });
});
