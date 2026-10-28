import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import i18n from "../../src/i18n";
import { menuItemNames, openSettings as openSettingsPanel } from "../helpers/headerMenu";

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

async function openSettings() {
  const user = userEvent.setup();
  await openSettingsPanel(user);
  return user;
}

// Manual language selection in Settings (066-daily-forecast-language-setting), layered on top of
// 064-swedish-translation's own auto-detect rendering test (swedishTranslation.test.tsx).
describe("Manual language setting (066-daily-forecast-language-setting)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocationUnavailable();
  });

  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("defaults to Automatic, which resolves to the browser's language (English here)", async () => {
    render(<App />);
    await openSettings();

    expect(screen.getByRole("button", { name: "Automatic" })).toHaveAttribute("aria-pressed", "true");
    expect(await menuItemNames(userEvent.setup())).toContain("Rain map");
  });

  it("switches all rendered text to Swedish immediately when Svenska is selected, with no reload", async () => {
    render(<App />);
    const user = await openSettings();

    await user.click(screen.getByRole("button", { name: "Svenska" }));

    const names = await menuItemNames(user);
    expect(names).toContain("Regnkarta");
    expect(names).toContain("Inställningar");
  });

  it("switches back to English when English is selected", async () => {
    render(<App />);
    const user = await openSettings();

    await user.click(screen.getByRole("button", { name: "Svenska" }));
    // The language toggle's own labels are translated too — the English option now reads
    // "English" until it's selected. Panel stays open after a selection, so no need to reopen.
    await user.click(screen.getByRole("button", { name: "English" }));

    expect(await menuItemNames(user)).toContain("Rain map");
  });

  it("persists the chosen language across a fresh render (reload)", async () => {
    const user1 = userEvent.setup();
    const { unmount } = render(<App />);
    await openSettingsPanel(user1);
    await user1.click(screen.getByRole("button", { name: "Svenska" }));
    unmount();

    render(<App />);
    expect(await menuItemNames(userEvent.setup())).toContain("Regnkarta");
  });

  it("reverts to the browser-detected language when switched back to Automatic", async () => {
    render(<App />);
    const user = await openSettings();

    await user.click(screen.getByRole("button", { name: "Svenska" }));
    // Panel stays open after a selection — no need to reopen it before the next click.
    await user.click(screen.getByRole("button", { name: "Automatiskt" }));

    expect(await menuItemNames(user)).toContain("Rain map");
  });
});
