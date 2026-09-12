import { beforeEach, describe, expect, it } from "vitest";
import { getLanguagePreference, setLanguagePreference } from "../../src/services/language";

describe("language preference service (066-daily-forecast-language-setting)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to 'auto' when no preference is stored", () => {
    expect(getLanguagePreference()).toBe("auto");
  });

  it("persists a manual selection and returns it on next read", () => {
    setLanguagePreference("sv");
    expect(getLanguagePreference()).toBe("sv");

    setLanguagePreference("en");
    expect(getLanguagePreference()).toBe("en");
  });

  it("falls back to 'auto' for an invalid stored value", () => {
    localStorage.setItem("weather-app:language-preference:v1", "fr");
    expect(getLanguagePreference()).toBe("auto");
  });

  it("round-trips explicitly setting 'auto' after a manual choice", () => {
    setLanguagePreference("sv");
    setLanguagePreference("auto");
    expect(getLanguagePreference()).toBe("auto");
  });
});
