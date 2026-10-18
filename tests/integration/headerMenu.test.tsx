import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { addFavorite } from "../../src/services/favoritesStorage";
import { clickMenuItem, menuItemNames, openMenu } from "../helpers/headerMenu";

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

describe("Header overflow menu", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition: (_s: unknown, e: (x: unknown) => void) => e({ code: 2 }) },
    });
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("has one Menu button in the header and no separate Light/Settings/Details/Map buttons", () => {
    render(<App />);
    const header = screen.getByRole("banner");
    expect(header).toContainElement(screen.getByRole("button", { name: "Menu" }));
    for (const name of ["Light", "Dark", "Settings", "Show details", "Show map", "Show overview"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("opens on click, moves focus to the first item and exposes menu semantics", async () => {
    const user = userEvent.setup();
    render(<App />);
    const trigger = await openMenu(user);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")[0]).toHaveFocus();
  });

  it("navigates with arrow keys (wrapping), Home and End", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openMenu(user);
    const items = screen.getAllByRole("menuitem");
    await user.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    await user.keyboard("{End}");
    expect(items[items.length - 1]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(items[0]).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(items[items.length - 1]).toHaveFocus();
    await user.keyboard("{Home}");
    expect(items[0]).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<App />);
    const trigger = await openMenu(user);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on an outside click", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openMenu(user);
    await user.click(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("states the current theme and toggles it, closing the menu", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openMenu(user);
    await user.click(screen.getByRole("menuitem", { name: /Theme: Dark/ }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("ivory");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("offers Home only away from the Overview, and Home returns to the Overview", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(await menuItemNames(user)).not.toContain("Show overview");
    await clickMenuItem(user, "Show map");
    const mapViewItems = await menuItemNames(user);
    expect(mapViewItems).toContain("Show overview");
    expect(mapViewItems).not.toContain("Show map");
    await clickMenuItem(user, "Show overview");
    expect(await screen.findByRole("heading", { name: /Stockholm.*overview/i })).toBeInTheDocument();
  });

  it("opens Settings inside the menu with unit and language controls", async () => {
    const user = userEvent.setup();
    render(<App />);
    await clickMenuItem(user, "Settings");
    expect(screen.getByRole("button", { name: /Fahrenheit|°F/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Svenska" })).toBeInTheDocument();
  });

  it("shows the place name on the location switcher", async () => {
    render(<App />);
    const trigger = await screen.findByRole("button", { name: /Change location: Stockholm/ });
    expect(trigger.querySelector(".location-panel-trigger-name")).toHaveTextContent("Stockholm");
  });
});
