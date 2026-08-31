import { describe, expect, it } from "vitest";
import { formatValue } from "../../src/services/format";

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
