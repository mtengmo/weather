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
    expect(high).toHaveTextContent("High 14°");
    expect(low).toHaveTextContent("Low 6°");
    const classes = (el: Element) => Array.from(el.querySelectorAll("span")).map((s) => s.className);
    expect(classes(high)).toEqual(classes(low));
  });

  it("lays out Rain, Wind, Sunrise, Sunset, Moon and Humidity as label/value pairs", () => {
    renderCard();
    const card = screen.getByRole("region", { name: "Today" });
    const labels = Array.from(card.querySelectorAll("dt")).map((e) => e.textContent);
    expect(labels).toEqual(["Rain", "Wind", "Sunrise", "Sunset", "Moon", "Humidity"]);
    expect(card.querySelector("dd")).toHaveTextContent("1.2 mm");
  });

  it("omits Humidity when there is no humidity reading", () => {
    renderCard({ currentHumidity: null });
    expect(screen.queryByText("Humidity")).not.toBeInTheDocument();
  });

  it("formats sunrise on a 12-hour clock in English and a 24-hour clock in Swedish", async () => {
    const first = renderCard();
    const enSunrise = screen.getByText("Sunrise").nextElementSibling!.textContent!;
    expect(enSunrise).toMatch(/AM|PM/i);
    first.unmount();

    await i18n.changeLanguage("sv");
    renderCard();
    const svSunrise = screen.getByText("Soluppgång").nextElementSibling!.textContent!;
    expect(svSunrise).toMatch(/^\d{2}[:.]\d{2}$/);
  });

  it("renders informational notices as an expandable row with a drawn chevron", async () => {
    const user = userEvent.setup();
    renderCard({ informationalWarnings: [notice] });
    const toggle = screen.getByRole("button", { name: "Risk of water shortage" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle.querySelector("svg.chevron")).not.toBeNull();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(toggle.parentElement!).getByText("Long-lasting dry weather.")).toBeInTheDocument();
  });
});
