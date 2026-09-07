import { beforeEach, describe, expect, it } from "vitest";
import { getHighLowVisibility, setHighLowVisibility } from "../../src/services/highLowVisibility";

describe("highLowVisibility service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to false when no preference is stored (037-header-controls-and-chart-fixes, US2)", () => {
    expect(getHighLowVisibility()).toBe(false);
  });

  it("persists a manual selection and returns it on next read", () => {
    setHighLowVisibility(false);
    expect(getHighLowVisibility()).toBe(false);

    setHighLowVisibility(true);
    expect(getHighLowVisibility()).toBe(true);
  });

  it("falls back to false for an invalid stored value", () => {
    localStorage.setItem("weather-app:high-low-visible:v1", "not-a-boolean");
    expect(getHighLowVisibility()).toBe(false);
  });
});
