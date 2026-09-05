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

describe("dataSourceDisclosure (018-dashboard-visual-redesign)", () => {
  it("returns null when primarySource is absent", () => {
    expect(dataSourceDisclosure({}, null)).toBeNull();
  });

  it("describes SMHI observations with SMHI forecast when not on fallback", () => {
    expect(dataSourceDisclosure({ primarySource: "smhi" }, null)).toBe("SMHI observations · SMHI forecast");
  });

  it("describes SMHI observations with Open-Meteo forecast when on fallback", () => {
    expect(dataSourceDisclosure({ primarySource: "smhi", forecastFromFallbackSource: true }, null)).toBe(
      "SMHI observations · Open-Meteo forecast"
    );
  });

  it("describes Open-Meteo observations with Open-Meteo forecast when not on fallback", () => {
    expect(dataSourceDisclosure({ primarySource: "open-meteo" }, null)).toBe(
      "Open-Meteo observations · Open-Meteo forecast"
    );
  });

  it("describes Open-Meteo observations with SMHI forecast when on fallback", () => {
    expect(dataSourceDisclosure({ primarySource: "open-meteo", forecastFromFallbackSource: true }, null)).toBe(
      "Open-Meteo observations · SMHI forecast"
    );
  });
});

describe("dataSourceDisclosure forecast freshness (019-dashboard-polish-round-four, US8)", () => {
  it("appends the source's own forecastIssuedAt time when available", () => {
    const result = dataSourceDisclosure(
      { primarySource: "smhi", forecastIssuedAt: "2026-09-05T06:00:00.000Z" },
      "2026-09-05T06:47:00.000Z"
    );
    const expectedTime = new Date("2026-09-05T06:00:00.000Z").toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(result).toBe(`SMHI observations · SMHI forecast (updated ${expectedTime})`);
  });

  it("falls back to lastUpdated when forecastIssuedAt is absent", () => {
    const result = dataSourceDisclosure({ primarySource: "smhi" }, "2026-09-05T06:47:00.000Z");
    const expectedTime = new Date("2026-09-05T06:47:00.000Z").toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(result).toBe(`SMHI observations · SMHI forecast (updated ${expectedTime})`);
  });

  it("omits the freshness fragment entirely when neither is available", () => {
    const result = dataSourceDisclosure({ primarySource: "smhi" }, null);
    expect(result).toBe("SMHI observations · SMHI forecast");
  });
});
