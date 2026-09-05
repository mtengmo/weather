import { describe, expect, it } from "vitest";
import { dataSourceDisclosure, directionToCompass, formatValue } from "../../src/services/format";

describe("formatValue", () => {
  it("returns an em dash for null", () => {
    expect(formatValue(null)).toBe("—");
  });

  it("rounds a long decimal to one place by default", () => {
    expect(formatValue(17.7541666666666)).toBe("17.8");
  });

  it("always shows the requested number of decimals, even for a whole number", () => {
    expect(formatValue(18)).toBe("18.0");
  });

  it("supports a custom decimal count", () => {
    expect(formatValue(1.005, 2)).toBe("1.00"); // toFixed's standard float rounding, not a bug in formatValue
    expect(formatValue(3.14159, 3)).toBe("3.142");
  });
});

describe("directionToCompass (018-dashboard-visual-redesign)", () => {
  it("maps all 8 compass points", () => {
    expect(directionToCompass(0)).toBe("N");
    expect(directionToCompass(45)).toBe("NE");
    expect(directionToCompass(90)).toBe("E");
    expect(directionToCompass(135)).toBe("SE");
    expect(directionToCompass(180)).toBe("S");
    expect(directionToCompass(225)).toBe("SW");
    expect(directionToCompass(270)).toBe("W");
    expect(directionToCompass(315)).toBe("NW");
  });

  it("wraps around near 360/0", () => {
    expect(directionToCompass(359)).toBe("N");
    expect(directionToCompass(361 % 360)).toBe("N");
    expect(directionToCompass(348)).toBe("N"); // rounds up to 360 -> wraps to index 8 % 8 = 0
  });
});

describe("dataSourceDisclosure (020-dashboard-polish-round-five, US6 — names only the observation source, no per-mode forecast-source naming)", () => {
  it("returns null when primarySource is absent", () => {
    expect(dataSourceDisclosure({}, null, false)).toBeNull();
  });

  it("describes SMHI observations", () => {
    expect(dataSourceDisclosure({ primarySource: "smhi" }, null, false)).toBe("SMHI observations");
  });

  it("describes Open-Meteo observations", () => {
    expect(dataSourceDisclosure({ primarySource: "open-meteo" }, null, false)).toBe("Open-Meteo observations");
  });

  it("appends the source's own forecastIssuedAt time when available", () => {
    const result = dataSourceDisclosure(
      { primarySource: "smhi", forecastIssuedAt: "2026-09-05T06:00:00.000Z" },
      "2026-09-05T06:47:00.000Z",
      false
    );
    const expectedTime = new Date("2026-09-05T06:00:00.000Z").toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(result).toBe(`SMHI observations · Forecast updated ${expectedTime}`);
  });

  it("falls back to lastUpdated when forecastIssuedAt is absent", () => {
    const result = dataSourceDisclosure({ primarySource: "smhi" }, "2026-09-05T06:47:00.000Z", false);
    const expectedTime = new Date("2026-09-05T06:47:00.000Z").toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(result).toBe(`SMHI observations · Forecast updated ${expectedTime}`);
  });

  it("omits the freshness fragment entirely when neither is available", () => {
    const result = dataSourceDisclosure({ primarySource: "smhi" }, null, false);
    expect(result).toBe("SMHI observations");
  });
});

describe("dataSourceDisclosure combined-forecast wording (021-dashboard-polish-round-six, US2/FR-003)", () => {
  it("names both forecast sources when combined is true", () => {
    const result = dataSourceDisclosure(
      { primarySource: "smhi", forecastIssuedAt: "2026-09-05T06:00:00.000Z" },
      null,
      true
    );
    const expectedTime = new Date("2026-09-05T06:00:00.000Z").toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(result).toBe(`SMHI observations · SMHI + Open-Meteo forecast updated ${expectedTime}`);
  });

  it("keeps the plain 'Forecast' label when combined is false", () => {
    const result = dataSourceDisclosure(
      { primarySource: "smhi", forecastIssuedAt: "2026-09-05T06:00:00.000Z" },
      null,
      false
    );
    expect(result).not.toContain("Open-Meteo forecast");
  });
});
