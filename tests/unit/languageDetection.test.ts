import { afterEach, describe, expect, it, vi } from "vitest";
import { detectLanguage } from "../../src/i18n";

describe("detectLanguage (064-swedish-translation)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects Swedish from a plain 'sv' language tag", () => {
    vi.stubGlobal("navigator", { language: "sv", languages: ["sv"] });
    expect(detectLanguage()).toBe("sv");
  });

  it("detects Swedish from a regional variant like 'sv-SE'", () => {
    vi.stubGlobal("navigator", { language: "sv-SE", languages: ["sv-SE", "en-US"] });
    expect(detectLanguage()).toBe("sv");
  });

  it("falls back to English for 'en-US'", () => {
    vi.stubGlobal("navigator", { language: "en-US", languages: ["en-US"] });
    expect(detectLanguage()).toBe("en");
  });

  it("falls back to English for an unrelated language like 'fr-FR'", () => {
    vi.stubGlobal("navigator", { language: "fr-FR", languages: ["fr-FR"] });
    expect(detectLanguage()).toBe("en");
  });
});
