import { afterEach, describe, expect, it } from "vitest";
import type { ComponentProps } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../src/i18n";
import TodaySummaryCard from "../../src/components/TodaySummaryCard";
import type { DailyAggregate, WeatherWarning } from "../../src/models/types";

const today: DailyAggregate = {
  bucketEnd: new Date().toISOString(),
  high: 14,
  low: 6,
  average: 10,
  totalPrecipitation: 1.2,
  windAverage: 4,
  cloudAverage: 10,
  windHigh: 6,
  windLow: 2,
};

const notice = {
  id: "w1",
  severityCode: "MESSAGE",
  severityLabel: "Message",
  title: "Risk of water shortage",
  areaName: "Stockholm",
  description: "Long-lasting dry weather.",
  validFrom: new Date().toISOString(),
  validUntil: null,
  isActive: true,
  isInformational: true,
} as WeatherWarning;

function renderCard(extra: Partial<ComponentProps<typeof TodaySummaryCard>> = {}) {
  return render(
    <TodaySummaryCard
      today={today}
      unit="metric"
      location={{ latitude: 59.33, longitude: 18.06 }}
      currentTemperature={9}
      currentFeelsLike={8}
      currentHumidity={85}
      {...extra}
    />
  );
}

afterEach(async () => {
  await i18n.changeLanguage("en");
});

describe("Today summary card structure", () => {
  it("shows the current temperature as one line, the condition under it, and a muted feels-like line", () => {
    const { container } = renderCard();
    const now = container.querySelector(".today-summary-now");
    expect(now).toHaveTextContent("9°");
    expect(now?.textContent).not.toMatch(/feels/i);
    expect(container.querySelector(".today-summary-condition")?.textContent).toBeTruthy();
    expect(container.querySelector(".today-summary-feels")).toHaveTextContent("feels like 8°");
  });

  it("gives High and Low the same structure and treatment", () => {
    const { container } = renderCard();
    const high = container.querySelector(".today-summary-high")!;
    const low = container.querySelector(".today-summary-low")!;
    expect(high).toHaveTextContent("High14°");
    expect(low).toHaveTextContent("Low6°");
    const classes = (el: Element) => Array.from(el.children).map((s) => s.className);
    expect(classes(high)).toEqual(classes(low));
  });

  it("collapsed: one summary line (High, Low, Rain, Wind); the rest sits behind More", () => {
    renderCard();
    const card = screen.getByRole("region", { name: "Today" });
    const line = card.querySelector(".today-summary-line")!;
    expect(Array.from(line.querySelectorAll("dt")).map((e) => e.textContent)).toEqual(["High", "Low", "Rain", "Wind"]);
    expect(line.querySelectorAll("dd")[2]).toHaveTextContent("1.2 mm");
    const extra = card.querySelector(".today-summary-extra")!;
    expect(extra).toHaveAttribute("hidden");
    expect(Array.from(extra.querySelectorAll("dt")).map((e) => e.textContent)).toEqual([
      "Sunrise",
      "Sunset",
      "Moon",
      "Humidity",
    ]);
    expect(screen.queryByText("Sunrise")).not.toBeVisible();
  });

  it("More/Less toggles the details with aria-expanded and aria-controls", async () => {
    const user = userEvent.setup();
    renderCard();
    const more = screen.getByRole("button", { name: "More" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    const extra = document.getElementById(more.getAttribute("aria-controls")!)!;
    expect(extra).toHaveAttribute("hidden");
    await user.click(more);
    expect(screen.getByRole("button", { name: "Less" })).toHaveAttribute("aria-expanded", "true");
    expect(extra).not.toHaveAttribute("hidden");
    expect(screen.getByText("Sunrise")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Less" }));
    expect(extra).toHaveAttribute("hidden");
  });

  it("shows a non-text notice dot with an accessible label only while collapsed with notices", async () => {
    const user = userEvent.setup();
    const { container } = renderCard({ informationalWarnings: [notice] });
    const more = screen.getByRole("button", { name: /More/ });
    expect(more).toHaveAccessibleName("More Notices available");
    expect(container.querySelector(".today-summary-notice-dot")).not.toBeNull();
    await user.click(more);
    expect(container.querySelector(".today-summary-notice-dot")).toBeNull();
  });

  it("has no notice dot without notices", () => {
    const { container } = renderCard();
    expect(container.querySelector(".today-summary-notice-dot")).toBeNull();
  });

  it("uses real Swedish copy for the toggle and a long condition word without overflowing text", async () => {
    await i18n.changeLanguage("sv");
    renderCard({ informationalWarnings: [notice], restOfDay: { high: 1, low: 0, totalPrecipitation: 0, windAverage: 1, windDirection: 0, windGustHigh: null, pointCount: 3 } });
    expect(screen.getByRole("button", { name: "Mer Notiser finns" })).toBeInTheDocument();
    expect(screen.getByText("Resten av dagen")).toBeInTheDocument();
  });

  it("derives the icon from the supplied symbol code and the observation's own timestamp (icon parity)", () => {
    const night = new Date();
    night.setHours(2, 0, 0, 0);
    const day = new Date();
    day.setHours(13, 0, 0, 0);
    const first = renderCard({ currentSymbolCode: 1, currentTimestamp: night.toISOString() });
    const nightSrc = first.container.querySelector(".today-summary-icon img:not(.today-summary-character)")?.getAttribute("src");
    first.unmount();
    const second = renderCard({ currentSymbolCode: 1, currentTimestamp: day.toISOString() });
    const daySrc = second.container.querySelector(".today-summary-icon img:not(.today-summary-character)")?.getAttribute("src");
    expect(nightSrc).toBeTruthy();
    expect(daySrc).toBeTruthy();
    expect(nightSrc).not.toBe(daySrc);
  });

  it("uses the rest-of-day window for High/Low/Rain/Wind and captions it", () => {
    renderCard({ restOfDay: { high: 18, low: 9, totalPrecipitation: 2.5, windAverage: 3, windDirection: 90, windGustHigh: null, pointCount: 5 } });
    expect(screen.getByText("Rest of today")).toBeInTheDocument();
    expect(document.querySelector(".today-summary-high")).toHaveTextContent("High18°");
    expect(document.querySelector(".today-summary-low")).toHaveTextContent("Low9°");
    expect(screen.getByRole("region", { name: "Today" })).toHaveTextContent(/Rain2\.5 mm/);
  });

  it("shows dashes, not NaN, when the rest-of-day window is empty", () => {
    renderCard({ restOfDay: { high: null, low: null, totalPrecipitation: null, windAverage: null, windDirection: null, windGustHigh: null, pointCount: 0 } });
    const card = screen.getByRole("region", { name: "Today" });
    expect(card.textContent).not.toContain("NaN");
    expect(document.querySelector(".today-summary-high")).toHaveTextContent("High—");
  });

  it("omits Humidity when there is no humidity reading", () => {
    renderCard({ currentHumidity: null });
    expect(screen.queryByText("Humidity")).not.toBeInTheDocument();
  });

  it("formats sunrise on a 12-hour clock in English and a 24-hour clock in Swedish", async () => {
    const first = renderCard();
    await userEvent.setup().click(screen.getByRole("button", { name: "More" }));
    const enSunrise = screen.getByText("Sunrise").nextElementSibling!.textContent!;
    expect(enSunrise).toMatch(/AM|PM/i);
    first.unmount();

    await i18n.changeLanguage("sv");
    renderCard();
    await userEvent.setup().click(screen.getByRole("button", { name: "Mer" }));
    const svSunrise = screen.getByText("Soluppgång").nextElementSibling!.textContent!;
    expect(svSunrise).toMatch(/^\d{2}[:.]\d{2}$/);
  });

  it("renders informational notices as an expandable row with a drawn chevron", async () => {
    const user = userEvent.setup();
    renderCard({ informationalWarnings: [notice] });
    await user.click(screen.getByRole("button", { name: /More/ }));
    const toggle = screen.getByRole("button", { name: "Risk of water shortage" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle.querySelector("svg.chevron")).not.toBeNull();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(toggle.parentElement!).getByText("Long-lasting dry weather.")).toBeInTheDocument();
  });
});
