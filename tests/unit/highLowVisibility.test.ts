import { beforeEach, describe, expect, it } from "vitest";
import { getHighLowVisibility, setHighLowVisibility } from "../../src/services/highLowVisibility";

describe("highLowVisibility service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to true when no preference is stored", () => {
    expect(getHighLowVisibility()).toBe(true);
  });

  it("persists a manual selection and returns it on next read", () => {
    setHighLowVisibility(false);
    expect(getHighLowVisibility()).toBe(false);

    setHighLowVisibility(true);
    expect(getHighLowVisibility()).toBe(true);
  });

  it("falls back to true for an invalid stored value", () => {
    localStorage.setItem("weather-app:high-low-visible:v1", "not-a-boolean");
    expect(getHighLowVisibility()).toBe(true);
  });
});
