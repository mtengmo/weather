import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../src/i18n";
import WeatherIconOverview from "../../src/components/WeatherIconOverview";
import { useObservationData } from "../../src/hooks/useObservationData";
import type { Location, ObservationWindow } from "../../src/models/types";

vi.mock("../../src/services/weatherApi", () => ({
  getObservations: vi.fn(),
  getNearbyStationSeries: vi.fn(),
  getMultiSourceForecast: vi.fn().mockResolvedValue([]),
  getUvRisk: vi.fn().mockResolvedValue(new Set()),
  getWarningsForLocation: vi.fn().mockResolvedValue([]),
}));

import { getNearbyStationSeries, getObservations } from "../../src/services/weatherApi";

const stockholm: Location = { latitude: 59.33, longitude: 18.06, displayName: "Stockholm", source: "favorite" };

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

function Harness({ onExtended }: { onExtended?: (v: boolean) => void }) {
  const [window, setWindow] = useState<ObservationWindow>("last-24-hours");
  const [extended, setExtended] = useState(false);
  const { series, multiSourceForecast, weeklySeries, uvRiskHours } = useObservationData(stockholm, window, 0, extended);
  return (
    <WeatherIconOverview
      location={stockholm}
      window={window}
      onWindowChange={setWindow}
      unit="metric"
      series={series}
      highLowVisible={false}
      multiSourceForecast={multiSourceForecast}
      weeklySeries={weeklySeries}
      uvRiskHours={uvRiskHours}
      extendedForecast={extended}
      onExtendedForecastChange={(v) => {
        setExtended(v);
        onExtended?.(v);
      }}
    />
  );
}

// Scroll metrics jsdom does not lay out: a 300px viewport over 1500px of content, Now marker at x=1000.
const scrollLeftOf = new WeakMap<Element, number>();
const scrollToSpy = vi.fn();

function installScrollMetrics() {
  const isWrap = (el: Element) => el.classList.contains("weather-timeline-wrap");
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return isWrap(this) ? 300 : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return isWrap(this) ? 1500 : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains("weather-timeline-now") ? 1000 : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "scrollLeft", {
    configurable: true,
    get(this: HTMLElement) {
      return scrollLeftOf.get(this) ?? 0;
    },
    set(this: HTMLElement, v: number) {
      scrollLeftOf.set(this, v);
    },
  });
  HTMLElement.prototype.scrollTo = scrollToSpy as unknown as typeof HTMLElement.prototype.scrollTo;
}

function removeScrollMetrics() {
  for (const prop of ["clientWidth", "scrollWidth", "offsetLeft", "scrollLeft"]) {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)[prop];
  }
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollTo;
}

function scrollTimelineTo(left: number) {
  const wrap = document.querySelector(".weather-timeline-wrap") as HTMLElement;
  act(() => {
    wrap.scrollLeft = left;
    fireEvent.scroll(wrap);
  });
}

async function renderOverview(onExtended?: (v: boolean) => void) {
  vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
    location: stockholm,
    window: w,
    status: "ready",
    observations: [
      { timestamp: hoursFromNow(-2), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5 },
      { timestamp: hoursFromNow(1), temperature: 8, precipitation: 2, windSpeed: 3, cloudCoverPercent: 90, isForecast: true },
      { timestamp: hoursFromNow(2), temperature: 7, precipitation: 0, windSpeed: 3, cloudCoverPercent: 90, isForecast: true },
    ],
  }));
  const utils = render(<Harness onExtended={onExtended} />);
  await waitFor(() => expect(document.querySelector(".weather-timeline-wrap")).not.toBeNull());
  return utils;
}

beforeEach(() => {
  scrollToSpy.mockReset();
  vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  installScrollMetrics();
});

afterEach(async () => {
  removeScrollMetrics();
  vi.unstubAllGlobals();
  await i18n.changeLanguage("en");
});

describe("Go-to-Now control", () => {
  it("appears only when the Now marker is outside the visible range, pointing toward it", async () => {
    await renderOverview();

    scrollTimelineTo(850); // Now (x=1000) inside 850..1150
    expect(screen.queryByRole("button", { name: "Go to now" })).toBeNull();

    scrollTimelineTo(1300); // Now is left of the viewport
    const left = screen.getByRole("button", { name: "Go to now" });
    expect(left).toHaveAttribute("data-direction", "left");
    expect(left.querySelector("svg")).not.toBeNull();
    expect(left.textContent).toBe("Now");

    scrollTimelineTo(0); // Now is right of the viewport
    expect(screen.getByRole("button", { name: "Go to now" })).toHaveAttribute("data-direction", "right");

    scrollTimelineTo(900);
    expect(screen.queryByRole("button", { name: "Go to now" })).toBeNull();
  });

  it("scrolls Now to the centre smoothly on click", async () => {
    const user = userEvent.setup();
    await renderOverview();
    scrollTimelineTo(0);
    await user.click(screen.getByRole("button", { name: "Go to now" }));
    expect(scrollToSpy).toHaveBeenCalledWith({ left: 850, behavior: "smooth" });
  });

  it("jumps instantly under prefers-reduced-motion", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }));
    const user = userEvent.setup();
    await renderOverview();
    scrollTimelineTo(0);
    await user.click(screen.getByRole("button", { name: "Go to now" }));
    expect(scrollToSpy).toHaveBeenCalledWith({ left: 850, behavior: "auto" });
  });

  it("is keyboard operable and named in Swedish", async () => {
    await i18n.changeLanguage("sv");
    const user = userEvent.setup();
    await renderOverview();
    scrollTimelineTo(1300);
    const button = screen.getByRole("button", { name: "Gå till nu" });
    expect(button.textContent).toBe("Nu");
    button.focus();
    await user.keyboard("{Enter}");
    expect(scrollToSpy).toHaveBeenCalledTimes(1);
  });
});

describe("48 h chip and the reserved strip", () => {
  it("is a pressed-state toggle with the full accessible name, shown only in 24-hour mode", async () => {
    const onExtended = vi.fn();
    const user = userEvent.setup();
    await renderOverview(onExtended);

    const chip = screen.getByRole("button", { name: "Show next 48 hours" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(chip.textContent).toBe("48 h");
    expect(chip.querySelector("svg")).toBeNull();

    await user.click(chip);
    expect(onExtended).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: "Show next 48 hours" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Show next 48 hours" }).querySelector("svg")).not.toBeNull();

    // The chip no longer lives in the tab row.
    expect(within(document.querySelector(".window-toggle") as HTMLElement).queryByText(/48/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "3 Days" }));
    expect(screen.queryByRole("button", { name: "Show next 48 hours" })).toBeNull();
    // The strip stays in every mode so the diagram does not move.
    expect(document.querySelector(".weather-timeline-strip")).not.toBeNull();
  });
});

describe("Today card icon parity with the timeline Now column", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["night", 2],
    ["day", 13],
  ])("uses the same symbol and %s rule as the first forecast column", async (_label, hour) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const base = new Date();
    base.setHours(hour, 30, 0, 0);
    vi.setSystemTime(base);

    vi.mocked(getObservations).mockImplementation(async (_loc, w) => ({
      location: stockholm,
      window: w,
      status: "ready",
      observations: [
        { timestamp: hoursFromNow(-2), temperature: 10, precipitation: 0, windSpeed: 1, cloudCoverPercent: 5, smhiSymbolCode: 1 },
        { timestamp: hoursFromNow(0.5), temperature: 3, precipitation: 0, windSpeed: 2, cloudCoverPercent: 5, isForecast: true, smhiSymbolCode: 1 },
        { timestamp: hoursFromNow(1.5), temperature: 4, precipitation: 0, windSpeed: 2, cloudCoverPercent: 5, isForecast: true, smhiSymbolCode: 1 },
      ],
    }));
    const { container } = render(<Harness />);
    await waitFor(() => expect(container.querySelector(".weather-timeline-condition.forecast-row img")).not.toBeNull());

    const cardIcon = container.querySelector(".today-summary-icon img:not(.today-summary-character)");
    const column = container.querySelector(".weather-timeline-condition.forecast-row img");
    expect(cardIcon?.getAttribute("src")).toBe(column?.getAttribute("src"));
  });
});
