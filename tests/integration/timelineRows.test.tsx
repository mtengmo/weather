import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { DirectionRow, formatRowValue } from "../../src/components/timeline/rows";
import type { TimelinePeriod, TimelineRow } from "../../src/components/timelineData";

function period(key: string): TimelinePeriod {
  return { key, label: key, isForecast: false, condition: null, uvRisk: false, temperature: null };
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
