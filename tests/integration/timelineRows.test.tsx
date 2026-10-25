import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { ConditionRow, DirectionRow, formatRowValue } from "../../src/components/timeline/rows";
import type { TimelinePeriod, TimelineRow } from "../../src/components/timelineData";
import { resolveConditionIconFromCondition } from "../../src/components/smhiSymbolIcons";

function period(key: string): TimelinePeriod {
  return { key, label: key, isForecast: false, condition: null, uvRisk: false, temperature: null, isNight: false };
}

const periods = [period("a"), period("b")];

function makeRow(over: Partial<TimelineRow> = {}): TimelineRow {
  return {
    key: "waves",
    label: "weatherOverview.gusts",
    unitLabel: "m",
    kind: "direction",
    available: true,
    points: [
      { isForecast: false, value: 1.2, direction: 90, period: 6 },
      { isForecast: true, value: 0.8, direction: 270, modelled: true },
    ],
    ...over,
  };
}

function renderRow(row: TimelineRow) {
  return render(
    <DirectionRow
      row={row}
      periods={periods}
      nowBoundaryIndex={null}
      renderText={(p, r) => (
        <>
          {formatRowValue(r, p.value as number)}
          {p.period != null && <span className="weather-timeline-direction-sub">{p.period} s</span>}
        </>
      )}
    />
  );
}

describe("timeline rows", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 5, 15, 12, 0, 0) });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rotates the arrow (dir+180) for 'from' by default", () => {
    const { container } = renderRow(makeRow());
    const arrows = container.querySelectorAll<HTMLElement>(".weather-timeline-wind-arrow");
    expect(arrows[0].style.transform).toBe("rotate(270deg)");
    expect(arrows[1].style.transform).toBe("rotate(90deg)");
  });

  it("uses the raw direction for 'toward'", () => {
    const { container } = renderRow(makeRow({ directionConvention: "toward" }));
    const arrows = container.querySelectorAll<HTMLElement>(".weather-timeline-wind-arrow");
    expect(arrows[0].style.transform).toBe("rotate(90deg)");
    expect(arrows[1].style.transform).toBe("rotate(270deg)");
  });

  it("renders period sub-text", () => {
    const { container } = renderRow(makeRow());
    const subs = container.querySelectorAll(".weather-timeline-direction-sub");
    expect(subs).toHaveLength(1);
    expect(subs[0].textContent).toBe("6 s");
  });

  it("marks modelled points with the interpolated class and a tooltip", () => {
    const { container } = renderRow(makeRow());
    const interpolated = container.querySelectorAll(".weather-timeline-interpolated");
    expect(interpolated).toHaveLength(1);
    expect(interpolated[0].getAttribute("title")).toBe("Model value (no observation)");
  });

  it("formats signed values and honours decimals", () => {
    const row = makeRow({ signed: true, decimals: 0, unitLabel: "cm" });
    expect(formatRowValue(row, 12)).toBe("+12 cm");
    expect(formatRowValue(row, -3)).toBe("-3 cm");
    expect(formatRowValue(makeRow({ decimals: 2 }), 1.234)).toBe("1.23 m");
  });
});

describe("ConditionRow windy artwork", () => {
  it("renders artwork img plus a wind badge for a windy period, and no badge otherwise", () => {
    const windy: TimelinePeriod = { ...period("w"), condition: "windy", temperature: 10 };
    const cloudy: TimelinePeriod = { ...period("c"), condition: "cloudy", temperature: 10 };
    const { container } = render(<ConditionRow periods={[windy, cloudy]} nowBoundaryIndex={null} />);
    const cells = container.querySelectorAll(".weather-timeline-condition");
    expect(cells[0].querySelector("img")).toBeInTheDocument();
    expect(cells[0].querySelector(".wind-badge")).toBeInTheDocument();
    expect(cells[0].textContent).toContain("Windy");
    expect(cells[1].querySelector("img")).toBeInTheDocument();
    expect(cells[1].querySelector(".wind-badge")).toBeNull();
  });

  it("shows the rain icon plus a wind badge for a rainy windy period, none for a calm rainy one", () => {
    const rainyWindy: TimelinePeriod = { ...period("r1"), condition: "light-rain", temperature: 10, windy: true };
    const rainyCalm: TimelinePeriod = { ...period("r2"), condition: "light-rain", temperature: 10, windy: false };
    const { container } = render(<ConditionRow periods={[rainyWindy, rainyCalm]} nowBoundaryIndex={null} />);
    const cells = container.querySelectorAll(".weather-timeline-condition");
    expect(cells[0].querySelector("img")).toBeInTheDocument();
    expect(cells[0].querySelectorAll(".wind-badge")).toHaveLength(1);
    expect(cells[0].textContent).toContain("Light rain");
    expect(cells[0].getAttribute("aria-label")).toContain("Windy");
    expect(cells[1].querySelector(".wind-badge")).toBeNull();
    expect(cells[1].getAttribute("aria-label")).not.toContain("Windy");
  });

  it("shows exactly one badge for the windy condition even when the period is flagged windy", () => {
    const windy: TimelinePeriod = { ...period("w"), condition: "windy", temperature: 10, windy: true };
    const { container } = render(<ConditionRow periods={[windy]} nowBoundaryIndex={null} />);
    expect(container.querySelectorAll(".wind-badge")).toHaveLength(1);
    expect(container.querySelector(".weather-timeline-condition")?.getAttribute("aria-label")).not.toMatch(/Windy.*Windy/);
  });
});

describe("ConditionRow night art uses period.isNight", () => {
  const srcOf = (p: TimelinePeriod) => {
    const { container } = render(<ConditionRow periods={[p]} nowBoundaryIndex={null} />);
    return container.querySelector(".weather-timeline-condition img")?.getAttribute("src");
  };
  const expected = (night: boolean) => {
    const icon = resolveConditionIconFromCondition(null, "windy", night, 10);
    return icon?.kind === "smhi-symbol" ? icon.src : undefined;
  };

  it("a windy whole-day column resolves day art, not night art", () => {
    const col: TimelinePeriod = { ...period("2026-06-16T00:00:00"), condition: "windy", windy: true, temperature: 10, isNight: false };
    expect(expected(true)).not.toBe(expected(false));
    expect(srcOf(col)).toBe(expected(false));
  });

  it("a windy 23:00 hourly column resolves night art", () => {
    const col: TimelinePeriod = { ...period("2026-06-15T21:00:00.000Z"), condition: "windy", windy: true, temperature: 10, isNight: true };
    expect(srcOf(col)).toBe(expected(true));
  });
});
